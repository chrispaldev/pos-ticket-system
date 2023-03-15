import { Inject, Injectable, forwardRef, Res, NotFoundException, InternalServerErrorException, BadRequestException, PreconditionFailedException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Response } from 'express';
import { Order, FreezeOrder, OrderDocument, FreezeOrderDocument } from './entities';
import { CreateOrderDto, CreateBulkOrderDto, ListKitchenOrderDto, ListOrderDto, ExportOrderDto, GetProductOrderStatDto, UpdateCashProductOrderStatDto, 
  GetHourlyProductOrderStatDto, GetLocationOrderStatDto, GetUserOrderStatDto, ExportUserOrderStatDto, FreezeOrderDto, UpdateFreezeOrderDto, ListFreezeOrderDto, 
  ExportFreezeOrderDto } from './dto';
import { IOrder, IFreezeOrder, OrderSubType, PaymentMethod, TransactionStatus, TransactionType, UserSession, OrderType } from '../shared/interfaces';
import { getSearchQueryFilters, addDate, delay, formatDate, getDayjsDate, exportCSV, roundUptoTwoDecimals, createMongoId, castToMongoId, generateUserOrdersStatsPDFReport } from '../shared/utils';
import { UserService } from '../user';
import { TransactionService } from '../transaction';
import { RFIDCardService } from '../rfidcard';
import { PaymentService } from '../payment';
import { MESSAGES } from '../shared/constants';

@Injectable()
export class OrderService {
  constructor(
    private readonly userService: UserService,
    private readonly rfidCardService: RFIDCardService,
    private readonly transactionService: TransactionService, 
    @Inject(forwardRef(() => PaymentService)) private readonly paymentService: PaymentService, 
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(FreezeOrder.name) private readonly freezeOrderModel: Model<FreezeOrderDocument>,
    @InjectConnection() private readonly connection: Connection
  ) {}

  async create(createOrderDto: CreateOrderDto, user: UserSession) {
    if (createOrderDto.paymentMethod === PaymentMethod.Pin) throw new PreconditionFailedException(MESSAGES.INVALID_PAYMENT_METHOD);
    const session = await this.connection.startSession();
    try {
      let order = null;
      await session.withTransaction(async () => {
        const transactionId = createMongoId();
        const orderId = createMongoId();
        const newOrder: any = { ...createOrderDto };
        const newTransaction: any = {
          type: TransactionType.Order,
          paymentMethod: createOrderDto.paymentMethod,
          price: createOrderDto.price,
          vat: createOrderDto.vat,
          status: TransactionStatus.Completed,
        }
        newOrder._id = newTransaction.order = orderId;
        newOrder.transaction = newTransaction._id = transactionId;
        newOrder.location = newTransaction.location = user.locationId;
        newOrder.user = newTransaction.user = user.id;
        newTransaction.card = createOrderDto.card || null;
        if (createOrderDto.isPurchaseAndTopup) {
          await this.rfidCardService.purchaseAndTopupAlongWithOrder(createOrderDto.purchaseAndTopup, user, session);
        }
        order = await this.add(newOrder, session);
        if (createOrderDto.paymentMethod === PaymentMethod.Coupons) newTransaction.coupons = createOrderDto.coupons;
        if (createOrderDto.paymentMethod === PaymentMethod.RFIDCard) {
          newTransaction.credits = createOrderDto.credits;
          await this.rfidCardService.purchaseOrder(newTransaction, session);
        }
        else await this.transactionService.add(newTransaction, session);
      });
      if (createOrderDto.freezeOrderId) this.deleteFreezeOrderByID(createOrderDto.freezeOrderId);
      return { order };
    }
    finally {
      session.endSession();
    }
  }

  async createTerminalOrder(createOrderDto: CreateOrderDto, user: UserSession, ipAddress: string) {
    if (createOrderDto.paymentMethod !== PaymentMethod.Pin) throw new PreconditionFailedException(MESSAGES.INVALID_PAYMENT_METHOD);
    const session = await this.connection.startSession();
    try {
      let order = null, topupTransaction = null, orderTransaction = null;
      await session.withTransaction(async () => {
        const transactionId = createMongoId();
        const orderId = createMongoId();
        const newOrder: any = { ...createOrderDto };
        let newTransaction: any = {
          type: TransactionType.Order,
          paymentMethod: createOrderDto.paymentMethod,
          price: createOrderDto.price,
          vat: createOrderDto.vat,
          status: TransactionStatus.Pending,
        };
        newOrder._id = newTransaction.order = orderId;
        newOrder.transaction = newTransaction._id = transactionId;
        newOrder.location = newTransaction.location = user.locationId;
        newOrder.user = newTransaction.user = user.id;
        newTransaction.card = createOrderDto.card = null;
        newTransaction.ipAddress = ipAddress;
        newTransaction.freezeOrderId = createOrderDto.freezeOrderId;
        if (createOrderDto.isPurchaseAndTopup) {
          topupTransaction = await this.rfidCardService.purchaseAndTopupAlongWithTerminalOrder(createOrderDto.purchaseAndTopup, user, session);
        }
        orderTransaction = await this.paymentService.startOrderTransaction(newTransaction, topupTransaction);
        order = await this.add(newOrder, session);
        await this.transactionService.add(orderTransaction);
      });
      return { 
        order,
        transaction: {
          externalId: orderTransaction.externalId,
          externalDetails: orderTransaction.externalDetails
        },
      };
    }
    finally {
      session.endSession();
    }
  }

  async createBulk(createBulkOrderDto: CreateBulkOrderDto, user: UserSession) {
    const invalidPaymentMethodsExist = createBulkOrderDto.orders.some(order => [PaymentMethod.RFIDCard, PaymentMethod.Pin].includes(order.paymentMethod))
    if (invalidPaymentMethodsExist) throw new BadRequestException(MESSAGES.INVALID_PAYMENT_METHODS);
    const session = await this.connection.startSession();
    try {
      const freezedOrderIds: string[] = [];
      await session.withTransaction(async () => {
        const orders = [], transactions = [];
        for (const createOrderDto of createBulkOrderDto.orders) {
          const transactionId = createMongoId();
          const orderId = createMongoId();
          const newOrder: any = { ...createOrderDto };
          const newTransaction: any = {
            type: TransactionType.Order,
            paymentMethod: createOrderDto.paymentMethod,
            price: createOrderDto.price,
            vat: createOrderDto.vat,
            status: TransactionStatus.Completed,
          }
          if (createOrderDto.paymentMethod === PaymentMethod.Coupons) {
            newTransaction.coupons = createOrderDto.coupons;
          }
          newOrder._id = newTransaction.order = orderId;
          newOrder.transaction = newTransaction._id = transactionId;
          newOrder.location = newTransaction.location = user.locationId;
          newOrder.user = newTransaction.user = user.id;
          orders.push(newOrder);
          transactions.push(newTransaction);
          if (createOrderDto.freezeOrderId) freezedOrderIds.push(createOrderDto.freezeOrderId);
        }
        await this.addBulk(orders, session);
        await this.transactionService.addBulk(transactions, session);
      })
      if (freezedOrderIds.length) this.deleteFreezeOrdersByFilter({ _id: { $in: freezedOrderIds } });
      return {
        msg: 'Bulk Orders created',
      };
    }
    finally {
      session.endSession();
    }
  }

  async delete(id: string) {
    await this.deleteByID(id);
    return {
      msg: 'Order deleted',
    };
  }

  async get(id: string) {
    const order = await this.findByID(id);
    return { order };
  }

  async listKitchenOrders(listKitchenOrderDto: ListKitchenOrderDto, locationId: string) {
    const filter: any = { 
      subType: OrderSubType.Kitchen,
      location: locationId,
    };
    if (listKitchenOrderDto.orderId) filter._id = listKitchenOrderDto.orderId;
    if (listKitchenOrderDto.paymentMethod) filter.paymentMethod = listKitchenOrderDto.paymentMethod;
    if (listKitchenOrderDto.orderedAtFrom || listKitchenOrderDto.orderedAtTo) {
      filter.orderedAt = {};
      if (listKitchenOrderDto.orderedAtFrom) filter.orderedAt = { ...filter.orderedAt, $gte: new Date(listKitchenOrderDto.orderedAtFrom) };
      if (listKitchenOrderDto.orderedAtTo) filter.orderedAt = { ...filter.orderedAt, $lt: new Date(listKitchenOrderDto.orderedAtTo) };
    }
    if (listKitchenOrderDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(listKitchenOrderDto.searchKeyword, ['invoiceId', 'description']);
    }
    const options = {
      page: listKitchenOrderDto.page,
      limit: listKitchenOrderDto.limit,
      sort: { createdAt: -1 },
      populate: [
        { path: 'eventDetails.event', select: 'name' },
        { 
          path: 'productDetails.product', select: 'name', 
          populate: { 
            path: 'kitchen', 
            select: 'number name' 
          } 
        },
        { path: 'location', select: 'number name' },
        { path: 'user', select: 'name username status' },
        { path: 'card', select: 'printedId credits status' },
        { path: 'transaction', select: '-card -order -location -user' },
      ]
    };
    return await this.listAll(filter, options);
  }

  async list(listOrderDto: ListOrderDto) {
    return await this.fetchOrdersList(listOrderDto);
  }

  async export(exportOrderDto: ExportOrderDto, @Res() response: Response) {
    let page = 1;
    const limit = 1000;
    let shouldStop = false;
    const rows: any = [];
    while (!shouldStop) {
      const { results: orders } = await this.fetchExportableOrders({ ...exportOrderDto, page, limit });
      if (!orders.length) shouldStop = true;
      else {
        for (const order of orders) {
          rows.push({
            invoiceId: order.invoiceId,
            paynlId: order.transaction?.externalId || 'N/A',
            type: order.type,
            items: order.items.join(', '),
            paymentMethod: order.paymentMethod,
            'price(€)': order.transaction?.price.toFixed(2),
            'vat(€)': order.transaction?.vat.toFixed(2),
            credits: order.transaction?.credits.toFixed(2),
            coupons: order.transaction?.coupons.toFixed(2),
            location: order.location?.name || 'N/A',
            orderedAt: formatDate(order.orderedAt),
          });
        }
        page++;
        await delay(300);
      }
    }
    exportCSV(rows, 'orders', response);
  }

  async getProductOrdersStats(getProductOrderStatDto: GetProductOrderStatDto) {
    const productOrdersStats = await this.fetchProductOrdersStats(getProductOrderStatDto);
    return { productOrdersStats };
  }

  async exportProductOrdersStats(getProductOrderStatDto: GetProductOrderStatDto, @Res() response: Response) {
    const productOrdersStats = await this.fetchProductOrdersStats(getProductOrderStatDto);
    const rows: any = [];
    for (const productOrdersStat of productOrdersStats) {
      rows.push({
        id: productOrdersStat._id,
        type: productOrdersStat.type,
        name: productOrdersStat.product?.name || 'N/A',
        soldQuantity: productOrdersStat.totalQuantity,
      });
    }
    exportCSV(rows, 'product_orders_stats', response);
  }

  async getCashProductOrdersStats(getProductOrderStatDto: GetProductOrderStatDto) {
    const otherFilters = {
      paymentMethod: PaymentMethod.Cash
    };
    const cashProductOrdersStats = await this.fetchProductOrdersStats(getProductOrderStatDto, otherFilters);
    return { cashProductOrdersStats };
  }

  async updateCashProductOrdersStats(updateCashProductOrderStatDto: UpdateCashProductOrderStatDto) {
    this.modifyCashProductOrdersStats(updateCashProductOrderStatDto);
    return {
      msg: 'Operation started',
    };
  }

  async getHourlyProductOrdersStats(getHourlyProductOrderStatDto: GetHourlyProductOrderStatDto) {
    const hourlyProductOrdersStats = await this.fetchHourlyProductOrdersStats(getHourlyProductOrderStatDto);
    return { hourlyProductOrdersStats };
  }

  async getLocationOrdersStats(getLocationOrderStatDto: GetLocationOrderStatDto) {
    const locationOrdersStats = await this.fetchLocationOrdersStats(getLocationOrderStatDto);
    return { locationOrdersStats };
  }

  async exportLocationOrdersStats(getLocationOrderStatDto: GetLocationOrderStatDto, @Res() response: Response) {
    const locationOrdersStats = await this.fetchLocationOrdersStats(getLocationOrderStatDto);
    const rows: any = [];
    for (const locationOrdersStat of locationOrdersStats) {
      rows.push({
        location: locationOrdersStat.location?.name || 'N/A',
        totalOrders: locationOrdersStat.totalOrders,
        cashAmount: locationOrdersStat.salesAmountByPaymentMethod[PaymentMethod.Cash].toFixed(2),
        pinAmount: locationOrdersStat.salesAmountByPaymentMethod[PaymentMethod.Pin].toFixed(2),
        couponsConsumed: locationOrdersStat.totalCoupons,
        rfidCreditsConsumed: locationOrdersStat.totalCredits.toFixed(2),
        soldRFIDCardsAmount: locationOrdersStat.rfidSalesStats.totalPurchaseAmount.toFixed(2),
        soldRFIDTopupsAmount: locationOrdersStat.rfidSalesStats.totalTopupAmount.toFixed(2),
      });
    }
    exportCSV(rows, 'location_orders_stats', response);
  }

  async getUserOrdersStats(getUserOrderStatDto: GetUserOrderStatDto) {
    const userOrdersStats = await this.fetchUserOrdersStats(getUserOrderStatDto);
    return { userOrdersStats };
  }

  async exportUserOrdersStats(exportUserOrderStatDto: ExportUserOrderStatDto, @Res() response: Response) {
    const userSalesStats = await this.fetchExportableUserOrdersStats(exportUserOrderStatDto);
    let user = {};
    if (!userSalesStats.productsSalesData.length) user = await this.userService.findByID(exportUserOrderStatDto.user, 'name username');
    else user = userSalesStats.productsSalesData[0]?.user;
    const salesMeta = {
      user,
      startDate: exportUserOrderStatDto.orderedAtFrom ? formatDate(new Date(exportUserOrderStatDto.orderedAtFrom)) : 'N/A',
      endDate: exportUserOrderStatDto.orderedAtTo ? formatDate(new Date(exportUserOrderStatDto.orderedAtTo)) : 'N/A',
      cashGiven: exportUserOrderStatDto.cashGiven,
      coinsGiven: exportUserOrderStatDto.coinsGiven,
      cashReceived: exportUserOrderStatDto.cashReceived,
      coinsReceived: exportUserOrderStatDto.coinsReceived,
    };
    await generateUserOrdersStatsPDFReport(salesMeta, userSalesStats, response);
  }

  async freezeOrder(freezeOrderDto: FreezeOrderDto, user: UserSession) {
    const newFreezeOrder: any = { ...freezeOrderDto };
    newFreezeOrder.location = user.locationId;
    newFreezeOrder.user = user.id; 
    const freezeOrder = await this.addFreezeOrder(newFreezeOrder);
    return { freezeOrder };
  }

  async updateFreezeOrder(id: string, updateFreezeOrderDto: UpdateFreezeOrderDto, user: UserSession) {
    const updateFreezeOrder: any = { ...updateFreezeOrderDto };
    updateFreezeOrder.location = user.locationId;
    updateFreezeOrder.user = user.id;
    const freezeOrder = await this.findAndUpdateFreezeOrderByID(id, updateFreezeOrder);
    return { freezeOrder };
  }

  async deleteFreezeOrder(id: string) {
    await this.deleteFreezeOrderByID(id);
    return {
      msg: 'Freezed order deleted',
    };
  }

  async listFreezeOrders(listFreezeOrderDto: ListFreezeOrderDto) {
    const filter: any = {};
    if (listFreezeOrderDto.freezeOrderId) filter._id = listFreezeOrderDto.freezeOrderId;
    const extraFilters = ['type', 'subType', 'location', 'user'];
    extraFilters.forEach(extraFilter => {
      if (listFreezeOrderDto[extraFilter]) filter[extraFilter] = listFreezeOrderDto[extraFilter];
    })
    if (listFreezeOrderDto.freezedAtFrom || listFreezeOrderDto.freezedAtTo) {
      filter.createdAt = {};
      if (listFreezeOrderDto.freezedAtFrom) filter.createdAt = { ...filter.createdAt, $gte: new Date(listFreezeOrderDto.freezedAtFrom) };
      if (listFreezeOrderDto.freezedAtTo) filter.createdAt = { ...filter.createdAt, $lt: new Date(listFreezeOrderDto.freezedAtTo) };
    }
    if (listFreezeOrderDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(listFreezeOrderDto.searchKeyword, ['customerName', 'tableNo', 'description']);
    }
    const options = {
      page: listFreezeOrderDto.page,
      limit: listFreezeOrderDto.limit,
      sort: { updatedAt: -1 },
      populate: [
        { path: 'eventDetails.event', select: 'name' },
        { path: 'productDetails.product', select: 'name' },
        { path: 'location', select: 'number name' },
        { path: 'user', select: 'name username status' },
      ]
    };
    return await this.listAllFreezeOrders(filter, options);
  }

  async exportFreezeOrders(exportFreezeOrderDto: ExportFreezeOrderDto, @Res() response: Response) {
    const filter: any = {};
    if (exportFreezeOrderDto.freezeOrderId) filter._id = exportFreezeOrderDto.freezeOrderId;
    const extraFilters = ['type', 'subType', 'location', 'user'];
    extraFilters.forEach(extraFilter => {
      if (exportFreezeOrderDto[extraFilter]) filter[extraFilter] = exportFreezeOrderDto[extraFilter];
    })
    if (exportFreezeOrderDto.freezedAtFrom || exportFreezeOrderDto.freezedAtTo) {
      filter.createdAt = {};
      if (exportFreezeOrderDto.freezedAtFrom) filter.createdAt = { ...filter.createdAt, $gte: new Date(exportFreezeOrderDto.freezedAtFrom) };
      if (exportFreezeOrderDto.freezedAtTo) filter.createdAt = { ...filter.createdAt, $lt: new Date(exportFreezeOrderDto.freezedAtTo) };
    }
    if (exportFreezeOrderDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(exportFreezeOrderDto.searchKeyword, ['customerName', 'tableNo', 'description']);
    }
    const options = {
      sort: { updatedAt: -1 },
      populate: [
        { path: 'eventDetails.event', select: 'name' },
        { path: 'productDetails.product', select: 'name' },
        { path: 'location', select: 'number name' },
        { path: 'user', select: 'name username status' },
      ]
    };
    const { results: freezeOrders } = await this.exportAll(filter, options);
    const rows: any = [];
    for (const freezeOrder of freezeOrders) {
      const products = [], events = [];
      freezeOrder.productDetails.forEach(productDetail => {
        if (productDetail.product?.name) products.push(productDetail.product?.name)
      });
      freezeOrder.eventDetails.forEach(eventDetail => {
        if (eventDetail.event?.name) events.push(eventDetail.event?.name)
      });
      rows.push({
        id: freezeOrder._id,
        customer: freezeOrder.customerName,
        tableNo: freezeOrder.tableNo,
        description: freezeOrder.description || 'N/A',
        type: freezeOrder.type,
        subtype: freezeOrder.subType,
        products: products.join(', ') || 'N/A',
        events: events.join(', ') || 'N/A',
        location: freezeOrder.location?.name || 'N/A',
        cashier: freezeOrder.user?.name || 'N/A',
        createdAt: formatDate(freezeOrder.createdAt),
      });
    }
    exportCSV(rows, 'freeze_orders', response);
  }

  async add(order: IOrder, session?: any): Promise<OrderDocument> {
    const orders = await this.orderModel.create([order], { session });
    return orders[0];
  }

  async addBulk(orders: IOrder[], session?: any): Promise<void> {
    await this.orderModel.insertMany(orders, { session, ordered: true, rawResult: true });
  }

  async findByID(id: string, attributes?: any): Promise<IOrder> {
    const order = await this.orderModel.findOne({ _id: id }).select(attributes).lean();
    if (!order) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return order;
  }

  async findAndUpdateByID(id: string, data: any, attributes?: any): Promise<IOrder> {
    const order = await this.orderModel
      .findOneAndUpdate({ _id: id }, data, { runValidators: true, new: true })
      .select(attributes)
      .lean();
    if (!order) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return order;
  }

  async findAndDeleteByID(id: string, attributes?: any): Promise<IOrder> {
    const order = await this.orderModel.findOneAndDelete({ _id: id }).select(attributes).lean();
    if (!order) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return order;
  }

  async findOneByFilter(filter: any, attributes?: any, throwErrorIfNotExists = false): Promise<IOrder | null> {
    const order = await this.orderModel.findOne(filter).select(attributes).lean();
    if (!order && throwErrorIfNotExists) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return order;
  }

  async findOneAndPopulateByFilter(filter: any, populate: any, attributes?: any): Promise<IOrder> {
    const order = await this.orderModel.findOne(filter).populate(populate).select(attributes).lean()
    if (!order) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return order;
  }

  async findByFilter(filter: any, attributes?: any): Promise<IOrder[]> {
    return await this.orderModel.find(filter).select(attributes).lean();
  }

  async findAndPopulateByFilter(filter: any, populate: any, attributes?: any): Promise<IOrder[]> {
    return await this.orderModel.find(filter).populate(populate).select(attributes).lean();
  }

  async updateByID(id: string, data: any): Promise<void> {
    const res = await this.orderModel.updateOne({ _id: id }, data, { runValidators: true }).lean();
    if (!res.matchedCount) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateOneByFilter(filter: any, data: any): Promise<void> {
    const res = await this.orderModel.updateOne(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateByFilter(filter: any, data: any): Promise<void> {
    const res = await this.orderModel.updateMany(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteByID(id: string): Promise<void> {
    const res = await this.orderModel.deleteOne({ _id: id });
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteOneByFilter(filter: any): Promise<void> {
    const res = await this.orderModel.deleteOne(filter);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async estimatedCount(): Promise<number> {
    return await this.orderModel.estimatedDocumentCount();
  }

  async count(filter: any): Promise<number> {
    return await this.orderModel.countDocuments(filter, { readPreference: 'secondaryPreferred' });
  }

  async aggregate(aggregatePipeline: any): Promise<any> {
    return await this.orderModel.aggregate(aggregatePipeline, { readPreference: 'secondaryPreferred' })
  }

  async listAll(filter: any, options: any): Promise<any> {
    const page = options.page ? parseInt(options.page, 10) : 1;
    const limit = options.limit ? parseInt(options.limit, 10) : 10;
    const skip = (page - 1) * limit;
    const listQuery = this.orderModel.find(filter, null, { readPreference: 'secondaryPreferred' });
    if (options.populate) listQuery.populate(options.populate);
    if (options.select) listQuery.select(options.select);
    if (options.sort) listQuery.sort(options.sort);
    listQuery.skip(skip).limit(limit).lean();
    const [results, total] = await Promise.all([
      listQuery.exec(),
      this.count(filter),
    ])
    return {
      page,
      limit,
      total,
      pages: limit > 0 ? Math.ceil(total / limit) || 1 : null,
      results,
    }
  }

  async addFreezeOrder(order: IFreezeOrder): Promise<FreezeOrderDocument> {
    const orders = await this.freezeOrderModel.create([order]);
    return orders[0];
  }

  async findAndUpdateFreezeOrderByID(id: string, data: any, attributes?: any): Promise<IFreezeOrder> {
    const order = await this.freezeOrderModel
      .findOneAndUpdate({ _id: id }, data, { runValidators: true, new: true })
      .select(attributes)
      .lean();
    if (!order) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return order;
  }

  async deleteFreezeOrderByID(id: string): Promise<void> {
    const res = await this.freezeOrderModel.deleteOne({ _id: id });
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteFreezeOrdersByFilter(filter: any): Promise<void> {
    const res = await this.freezeOrderModel.deleteMany(filter);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async estimatedCountFreezeOrders(): Promise<number> {
    return await this.freezeOrderModel.estimatedDocumentCount();
  }

  async countFreezeOrders(filter: any): Promise<number> {
    return await this.freezeOrderModel.countDocuments(filter);
  }

  async listAllFreezeOrders(filter: any, options: any): Promise<any> {
    const page = options.page ? parseInt(options.page, 10) : 1
    const limit = options.limit ? parseInt(options.limit, 10) : 10
    const skip = (page - 1) * limit
    const listQuery = this.freezeOrderModel.find(filter);
    if (options.populate) listQuery.populate(options.populate);
    if (options.select) listQuery.select(options.select);
    if (options.sort) listQuery.sort(options.sort);
    listQuery.skip(skip).limit(limit).lean();
    const [results, total] = await Promise.all([
      listQuery.exec(),
      this.countFreezeOrders(filter),
    ])
    return {
      page,
      limit,
      total,
      pages: limit > 0 ? Math.ceil(total / limit) || 1 : null,
      results,
    }
  }

  async exportAll(filter: any, options: any): Promise<any> {
    const exportQuery = this.freezeOrderModel.find(filter);
    if (options.populate) exportQuery.populate(options.populate);
    if (options.select) exportQuery.select(options.select);
    if (options.sort) exportQuery.sort(options.sort);
    exportQuery.lean();
    const results = await exportQuery.exec();
    return {
      results,
    }
  }

  async fetchOrdersList(listOrderDto: ListOrderDto) {
    const page = listOrderDto.page ? parseInt(String(listOrderDto.page), 10) : 1;
    const limit = listOrderDto.limit ? parseInt(String(listOrderDto.limit), 10) : 10;
    const skip = (page - 1) * limit;
    const filter: any = {};
    const extraFilters = ['type', 'subType', 'paymentMethod'];
    extraFilters.forEach(extraFilter => {
      if (listOrderDto[extraFilter]) filter[extraFilter] = listOrderDto[extraFilter];
    });
    if (listOrderDto.orderId) filter._id = castToMongoId(listOrderDto.orderId);
    if (listOrderDto.location) filter.location = castToMongoId(listOrderDto.location);
    if (listOrderDto.user) filter.user = castToMongoId(listOrderDto.user);
    if (listOrderDto.orderedAtFrom || listOrderDto.orderedAtTo) {
      filter.orderedAt = {};
      if (listOrderDto.orderedAtFrom) filter.orderedAt = { ...filter.orderedAt, $gte: new Date(listOrderDto.orderedAtFrom) };
      if (listOrderDto.orderedAtTo) filter.orderedAt = { ...filter.orderedAt, $lt: new Date(listOrderDto.orderedAtTo) };
    }
    if (listOrderDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(listOrderDto.searchKeyword, ['invoiceId', 'description']);
    }
    const [{ orders, totalOrders }] = await this.aggregate([
      {
        $match: filter
      },
      {
        $lookup: {
          from: 'transactions',
          let: { transactionId: '$transaction' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$_id', '$$transactionId'] },
                    ...(listOrderDto.transactionStatus ? [{ $eq: ['$status', listOrderDto.transactionStatus] }] : []),
                  ]
                }
              }
            },
            {
              $project: {
                type: 1,
                paymentMethod: 1,
                currency: 1,
                price: 1,
                vat: 1,
                credits: 1,
                coupons: 1,
                status: 1,
                createdBy: 1,
              }
            }
          ],
          as: 'transaction'
        }
      },
      { $unwind: '$transaction' },
      {
        $facet: {
          orders: [
            {
              $sort: { 
                createdAt: -1 
              }
            },
            { $skip: skip }, 
            { $limit: limit },
            {
              $lookup: {
                from: 'events',
                let: { eventIds: '$eventDetails.event' },
                pipeline: [
                  {
                    $match: {
                      $expr: { 
                        $in: [ '$_id', '$$eventIds' ]
                      },
                    }
                  },
                  {
                    $project: {
                      name: 1
                    }
                  }
                ],
                as: 'events'
              }
            },
            {
              $lookup: {
                from: 'products',
                let: { productIds: '$productDetails.product' },
                pipeline: [
                  {
                    $match: {
                      $expr: { 
                        $in: [ '$_id', '$$productIds' ]
                      },
                    }
                  },
                  {
                    $project: {
                      name: 1,
                    }
                  }
                ],
                as: 'products'
              }
            },
            {
              $lookup: {
                from: 'locations',
                let: { locationId: '$location' },
                pipeline: [
                  {
                    $match: {
                      $expr: { 
                        $eq: ['$_id', '$$locationId'] 
                      },
                    }
                  },
                  {
                    $project: {
                      number: 1,
                      name: 1
                    }
                  }
                ],
                as: 'location'
              }
            },
            { 
              $unwind: {
                path: '$location', 
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $lookup: {
                from: 'users',
                let: { userId: '$user' },
                pipeline: [
                  {
                    $match: {
                      $expr: { 
                        $eq: ['$_id', '$$userId'] 
                      },
                    }
                  },
                  {
                    $project: {
                      name: 1,
                      username: 1,
                    }
                  }
                ],
                as: 'user'
              }
            },
            { 
              $unwind: {
                path: '$user', 
                preserveNullAndEmptyArrays: true
              }
            },
          ],
          totalOrders: [
            { $count: 'total' }
          ]
        }
      }
    ]);
    const total = totalOrders.length ? totalOrders[0].total : 0;
    for (const order of orders) {
      if (order.type === 'product') {
        for (const productDetail of order.productDetails) {
          const product = order.products.find(product => product._id.toString() === productDetail.product?.toString());
          if (!product) productDetail.product = null;
          else productDetail.product = product;
        }
      }
      else if (order.type === 'event') {
        for (const eventDetail of order.eventDetails) {
          const event = order.events.find(event => event._id.toString() === eventDetail.event?.toString());
          if (!event) eventDetail.event = null;
          else eventDetail.event = event;
        }
      }
      delete order.products;
      delete order.events;
    }
    return {
      page,
      limit,
      total,
      pages: limit > 0 ? Math.ceil(total / limit) || 1 : null,
      results: orders,
    }
  }

  async fetchExportableOrders(orderFilter: any) {
    const { page, limit } = orderFilter;
    const skip = (page - 1) * limit;
    const filter: any = {};
    const extraFilters = ['type', 'paymentMethod'];
    extraFilters.forEach(extraFilter => {
      if (orderFilter[extraFilter]) filter[extraFilter] = orderFilter[extraFilter];
    });
    if (orderFilter.location) filter.location = castToMongoId(orderFilter.location);
    filter.orderedAt = { $gte: new Date(orderFilter.orderedAt), $lt: addDate(1, 'd', orderFilter.orderedAt) };
    const [{ orders, totalOrders }] = await this.aggregate([
      {
        $match: filter
      },
      {
        $lookup: {
          from: 'transactions',
          let: { transactionId: '$transaction' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$_id', '$$transactionId'] },
                    { $eq: ['$status', 'completed'] },
                  ]
                }
              }
            },
            {
              $project: {
                externalId: 1,
                price: 1,
                vat: 1,
                credits: 1,
                coupons: 1
              }
            }
          ],
          as: 'transaction'
        }
      },
      { $unwind: '$transaction' },
      {
        $facet: {
          orders: [
            {
              $sort: { 
                createdAt: -1 
              }
            },
            { $skip: skip }, 
            { $limit: limit },
            {
              $lookup: {
                from: 'events',
                let: { eventIds: '$eventDetails.event' },
                pipeline: [
                  {
                    $match: {
                      $expr: { 
                        $in: [ '$_id', '$$eventIds' ]
                      },
                    }
                  },
                  {
                    $project: {
                      name: 1
                    }
                  }
                ],
                as: 'events'
              }
            },
            {
              $lookup: {
                from: 'products',
                let: { productIds: '$productDetails.product' },
                pipeline: [
                  {
                    $match: {
                      $expr: { 
                        $in: [ '$_id', '$$productIds' ]
                      },
                    }
                  },
                  {
                    $project: {
                      name: 1,
                    }
                  }
                ],
                as: 'products'
              }
            },
            {
              $lookup: {
                from: 'locations',
                let: { locationId: '$location' },
                pipeline: [
                  {
                    $match: {
                      $expr: { 
                        $eq: ['$_id', '$$locationId'] 
                      },
                    }
                  },
                  {
                    $project: {
                      number: 1,
                      name: 1
                    }
                  }
                ],
                as: 'location'
              }
            },
            { 
              $unwind: {
                path: '$location', 
                preserveNullAndEmptyArrays: true
              }
            },
          ],
          totalOrders: [
            { $count: 'total' }
          ]
        }
      }
    ]);
    const total = totalOrders.length ? totalOrders[0].total : 0;
    for (const order of orders) {
      order.items = [];
      if (order.type === 'product') {
        for (const productDetail of order.productDetails) {
          const product = order.products.find(product => product._id.toString() === productDetail.product?.toString());
          if (product) order.items.push(`${product.name}(${productDetail.quantity})`);
        }
      }
      else if (order.type === 'event') {
        for (const eventDetail of order.eventDetails) {
          const event = order.events.find(event => event._id.toString() === eventDetail.event?.toString());
          if (event) order.items.push(`${event.name}(${eventDetail.quantity})`);
        }
      }
      delete order.productDetails;
      delete order.eventDetails;
      delete order.products;
      delete order.events;
    }
    return {
      page,
      limit,
      total,
      pages: limit > 0 ? Math.ceil(total / limit) || 1 : null,
      results: orders,
    }
  }

  async fetchProductOrdersStats(getProductOrderStatDto: GetProductOrderStatDto, otherFilters = {}) {
    const filter: any = {
      ...otherFilters,
    };
    if (getProductOrderStatDto.type) filter.type = getProductOrderStatDto.type;
    if (getProductOrderStatDto.location) filter.location = castToMongoId(getProductOrderStatDto.location);
    if (getProductOrderStatDto.user) filter.user = castToMongoId(getProductOrderStatDto.user);
    if (getProductOrderStatDto.orderedAtFrom || getProductOrderStatDto.orderedAtTo) {
      filter.orderedAt = {};
      if (getProductOrderStatDto.orderedAtFrom) filter.orderedAt = { ...filter.orderedAt, $gte: new Date(getProductOrderStatDto.orderedAtFrom) };
      if (getProductOrderStatDto.orderedAtTo) filter.orderedAt = { ...filter.orderedAt, $lt: new Date(getProductOrderStatDto.orderedAtTo) };
    }
    const productOrdersStats = await this.aggregate([
      {
        $match: filter
      },
      {
        $lookup: {
          from: 'transactions',
          let: { transactionId: '$transaction' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$_id', '$$transactionId'] },
                    { $eq: ['$status', 'completed'] },
                  ],
                }
              }
            },
            {
              $project: {
                _id: 1,
                price: 1,
                credits: 1,
                coupons: 1
              }
            }
          ],
          as: 'transaction'
        }
      },
      { $unwind: '$transaction' },
      {
        $addFields: {
          orderDetails: {
            $concatArrays: [ '$productDetails', '$eventDetails' ]
          }
        }
      },
      { $unwind: '$orderDetails' },
      {
        $project: {
          type: 1,
          orderDetails: 1,
        }
      },
      {
        $group : {
          _id: { $cond: [ { $eq: [ '$type', 'product' ] }, '$orderDetails.product', '$orderDetails.event' ] },
          type: { $first: '$type' },
          totalQuantity: { $sum: '$orderDetails.quantity' },
          totalSalesAmount: { $sum: '$orderDetails.price' },
        }
      },
      {
        $addFields: {
          unitPrice: {
            $divide: [ '$totalSalesAmount', '$totalQuantity' ]
          }
        }
      },
      {
        $lookup: {
          from: 'events',
          let: { eventId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { 
                  $eq: [ '$_id', '$$eventId' ]
                },
              }
            },
            {
              $project: {
                name: 1,
              }
            }
          ],
          as: 'event'
        }
      },
      { 
        $unwind: {
          path: '$event', 
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'products',
          let: { productId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { 
                  $eq: [ '$_id', '$$productId' ]
                },
              }
            },
            {
              $project: {
                name: 1
              }
            }
          ],
          as: 'product'
        }
      },
      { 
        $unwind: {
          path: '$product', 
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          product: {
            $cond: [ { $gt: [ '$product', {} ] }, '$product', '$event' ]
          },
          type: 1,
          totalQuantity: 1,
          unitPrice: 1,
          totalSalesAmount: 1,
        }
      },
      {
        $sort: { totalQuantity: -1 }
      }
    ]);
    productOrdersStats.forEach((productOrdersStat: any) => {
      productOrdersStat.unitPrice = roundUptoTwoDecimals(productOrdersStat.unitPrice);
      productOrdersStat.totalSalesAmount = roundUptoTwoDecimals(productOrdersStat.totalSalesAmount);
    });
    return productOrdersStats;
  }

  async modifyCashProductOrdersStats(updateCashProductOrderStatDto: UpdateCashProductOrderStatDto) {
    const minProductQty = 1;
    const limit = 100;
    const productId = updateCashProductOrderStatDto.type === OrderType.Event ? castToMongoId(updateCashProductOrderStatDto.event) 
      : castToMongoId(updateCashProductOrderStatDto.product);
    const filter: any = {
      paymentMethod: PaymentMethod.Cash,
      type: updateCashProductOrderStatDto.type,
      [updateCashProductOrderStatDto.type === OrderType.Event ? 'eventDetails.event' : 'productDetails.product']: productId,
    };
    if (updateCashProductOrderStatDto.location) filter.location = castToMongoId(updateCashProductOrderStatDto.location);
    if (updateCashProductOrderStatDto.user) filter.user = castToMongoId(updateCashProductOrderStatDto.user);
    if (updateCashProductOrderStatDto.orderedAtFrom || updateCashProductOrderStatDto.orderedAtTo) {
      filter.orderedAt = {};
      if (updateCashProductOrderStatDto.orderedAtFrom) filter.orderedAt = { ...filter.orderedAt, $gte: new Date(updateCashProductOrderStatDto.orderedAtFrom) };
      if (updateCashProductOrderStatDto.orderedAtTo) filter.orderedAt = { ...filter.orderedAt, $lt: new Date(updateCashProductOrderStatDto.orderedAtTo) };
    }
    const aggregationPipeline = [
      {
        $match: filter
      },
      {
        $lookup: {
          from: 'transactions',
          let: { transactionId: '$transaction' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$_id', '$$transactionId'] },
                    { $eq: ['$status', 'completed'] },
                  ],
                }
              }
            },
            {
              $project: {
                _id: 1,
                price: 1,
                actualPrice: 1
              }
            }
          ],
          as: 'transaction'
        }
      },
      { $unwind: '$transaction' },
      {
        $addFields: {
          orderDetails: {
            $concatArrays: ['$eventDetails', '$productDetails']
          },
          totalProducts: {
            $size: updateCashProductOrderStatDto.type === OrderType.Event ? '$eventDetails' : '$productDetails'
          }
        }
      },
      {
        $project: {
          type: 1,
          orderDetails: 1,
          totalProducts: 1,
          transaction: 1,
        }
      },
      { 
        $limit: limit 
      },
    ];
    try {
      let shouldStop = false;
      let currReducedQty = 0;
      const totalReducedQty = updateCashProductOrderStatDto.reducedQuantity;
      while (!shouldStop && (currReducedQty < totalReducedQty)) {
        const productOrders = await this.aggregate(aggregationPipeline);
        if (!productOrders.length) shouldStop = true;
        else {
          for (const productOrder of productOrders) {
            const remainingReducedQty = totalReducedQty - currReducedQty;
            if (remainingReducedQty === 0) {
              shouldStop = true;
              break;
            }
            const { orderDetails, transaction } = productOrder;
            const transactionData: any = {}
            let reducedPrice = 0;
            const productIndex = orderDetails.findIndex(product => {
              const id = productOrder.type === OrderType.Event ? product.event : product.product;
              return String(id) === String(productId);
            });
            if (productIndex === -1) continue;
            const product = orderDetails[productIndex];
            if (product.price === 0) continue;
            if ((productOrder.totalProducts === 1) && (product.quantity <= remainingReducedQty)) {
              currReducedQty += product.quantity;
              await Promise.all([
                this.deleteByID(productOrder._id),
                this.transactionService.deleteByID(transaction._id)
              ]);
            }
            else {
              if ((productOrder.totalProducts === 1) && (product.quantity > remainingReducedQty)) { 
                const unitPrice = roundUptoTwoDecimals(product.price / product.quantity);
                reducedPrice = roundUptoTwoDecimals(unitPrice * remainingReducedQty);
                currReducedQty += remainingReducedQty;
                product.quantity -= remainingReducedQty;
                product.price = roundUptoTwoDecimals(product.price - reducedPrice);
              }
              else {
                if (product.quantity > remainingReducedQty) {
                  const unitPrice = roundUptoTwoDecimals(product.price / product.quantity);
                  reducedPrice = roundUptoTwoDecimals(unitPrice * remainingReducedQty);
                  currReducedQty += remainingReducedQty;
                  product.quantity -= remainingReducedQty;
                  product.price = roundUptoTwoDecimals(product.price - reducedPrice);
                }
                else {
                  reducedPrice = product.price;
                  currReducedQty += product.quantity;
                  orderDetails.splice(productIndex, 1);
                }
              }
              if (!transaction.actualPrice) transactionData.actualPrice = transaction.price;
              transactionData.price = roundUptoTwoDecimals(transaction.price - reducedPrice);
              if (transactionData.price > 0) {
                await Promise.all([
                  this.updateByID(productOrder._id, { 
                    [productOrder.type === OrderType.Event ? 'eventDetails' : 'productDetails']: orderDetails 
                  }),
                  this.transactionService.updateByID(transaction._id, transactionData)
                ]);
              }
            }
            await delay(100);
          }
        }
      }
    }
    catch (e) {
      console.error('Correction Tool Error: ', e);
    }
  }

  async fetchHourlyProductOrdersStats(getHourlyProductOrderStatDto: GetHourlyProductOrderStatDto) {
    const startHour = '06', endHour = '22';
    let startSlotTime = getDayjsDate(new Date(getHourlyProductOrderStatDto.date)).hour(parseInt(startHour));
    let endSlotTime = getDayjsDate(new Date(getHourlyProductOrderStatDto.date)).hour(parseInt(endHour));
    const slots = [];
    const facets = {};
    const paymentMethodAggegatePipeline: any = [
      {
        $group: {
          _id: { 
            product: getHourlyProductOrderStatDto.type === OrderType.Event ? '$orderDetails.event' : '$orderDetails.product', 
            paymentMethod: '$paymentMethod' 
          },
          totalQuantity: { $sum: '$orderDetails.quantity' },
          totalPrice: { $sum: '$orderDetails.price' },
        }
      },
      {
        $group: {
          _id: '$_id.paymentMethod',
          totalQuantity: { $sum: '$totalQuantity' },
          totalSalesAmount: { $sum: '$totalPrice' },
        }
      },
    ];
    while (startSlotTime.isBefore(endSlotTime)) {
      const beginSlotTime = startSlotTime;
      startSlotTime = startSlotTime.add(1, 'h');
      slots.push({
        startTime: beginSlotTime.toDate(),
        endTime: startSlotTime.toDate(),
      });
      const startTime = formatDate(beginSlotTime.toDate()).slice(formatDate(beginSlotTime.toDate()).indexOf('2022') + 5);
      const endTime = formatDate(startSlotTime.toDate()).slice(formatDate(startSlotTime.toDate()).indexOf('2022') + 5);
      facets[`${startTime} - ${endTime}`] = [
        {
          $match: {
            orderedAt: { $gte: beginSlotTime.toDate(), $lte: startSlotTime.toDate() }
          }
        },
        ...paymentMethodAggegatePipeline
      ]
    }
    const productId = getHourlyProductOrderStatDto.type === OrderType.Event ? castToMongoId(getHourlyProductOrderStatDto.event) 
      : castToMongoId(getHourlyProductOrderStatDto.product);
    const filter: any = {
      type: getHourlyProductOrderStatDto.type,
      [getHourlyProductOrderStatDto.type === OrderType.Event ? 'eventDetails.event' : 'productDetails.product']: productId,
      paymentMethod: { $in: [PaymentMethod.Cash, PaymentMethod.Pin] },
      orderedAt: { $gte: slots[0].startTime, $lte: slots[slots.length -1].endTime },
    };
    const hourlyProductOrdersSales = await this.aggregate([
      {
        $match: filter
      },
      {
        $lookup: {
          from: 'transactions',
          let: { transactionId: '$transaction' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$_id', '$$transactionId'] },
                    { $eq: ['$status', 'completed'] },
                  ],
                }
              }
            },
            {
              $project: {
                _id: 1,
              }
            }
          ],
          as: 'transaction'
        }
      },
      { $unwind: '$transaction' },
      {
        $addFields: {
          orderDetails: {
            $concatArrays: [ '$productDetails', '$eventDetails' ]
          }
        }
      },
      { $unwind: '$orderDetails' },
      {
        $project: {
          orderDetails: 1,
          paymentMethod: 1,
          orderedAt: 1,
        }
      },
      {
        $facet: facets
      }
    ]);
    const hourlyProductOrdersStats = [];
    for (const hourlyProductOrdersSaleSlot in hourlyProductOrdersSales[0]) {
      const cashSalesStat = hourlyProductOrdersSales[0][hourlyProductOrdersSaleSlot].find(saleSlot => saleSlot._id === PaymentMethod.Cash);
      const pinSalesStat = hourlyProductOrdersSales[0][hourlyProductOrdersSaleSlot].find(saleSlot => saleSlot._id === PaymentMethod.Pin);
      hourlyProductOrdersStats.push({
        slot: hourlyProductOrdersSaleSlot,
        totalCashOrders: cashSalesStat ? cashSalesStat.totalQuantity : 0,
        totalPinOrders: pinSalesStat ? pinSalesStat.totalQuantity : 0,
        totalCashSalesAmount: cashSalesStat ? cashSalesStat.totalSalesAmount : 0,
        totalPinSalesAmount: pinSalesStat ? pinSalesStat.totalSalesAmount : 0,
      })
    }
    return hourlyProductOrdersStats;
  }

  async fetchLocationOrdersStats(getLocationOrderStatDto: GetLocationOrderStatDto) {
    const filter: any = {};
    const rfidFilter: any = {};
    if (getLocationOrderStatDto.type) filter.type = getLocationOrderStatDto.type;
    if (getLocationOrderStatDto.orderedAtFrom || getLocationOrderStatDto.orderedAtTo) {
      filter.orderedAt = {};
      if (getLocationOrderStatDto.orderedAtFrom) filter.orderedAt = { ...filter.orderedAt, $gte: new Date(getLocationOrderStatDto.orderedAtFrom) };
      if (getLocationOrderStatDto.orderedAtTo) filter.orderedAt = { ...filter.orderedAt, $lt: new Date(getLocationOrderStatDto.orderedAtTo) };
      rfidFilter.createdAt = filter.orderedAt;
    }
    const locationOrdersAggregationPipeline: any = [
      {
        $match: filter
      },
      {
        $lookup: {
          from: 'transactions',
          let: { transactionId: '$transaction' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$_id', '$$transactionId'] },
                    { $eq: ['$status', 'completed'] },
                  ]
                }
              }
            },
            {
              $project: {
                price: 1,
                vat: 1,
                coupons: 1,
                credits: 1,
              }
            }
          ],
          as: 'transaction'
        }
      },
      { $unwind: '$transaction' },
      {
        $lookup: {
          from: 'locations',
          let: { locationId: '$location' },
          pipeline: [
            {
              $match: {
                $expr: { 
                  $eq: ['$_id', '$$locationId'] 
                },
              }
            },
            {
              $project: {
                number: 1,
                name: 1
              }
            }
          ],
          as: 'location'
        }
      },
      { $unwind: '$location' },
      {
        $group : {
          _id: { locationId: '$location._id', paymentMethod: '$paymentMethod' },
          location: { $first: '$location' },
          totalCoupons: { $sum: '$transaction.coupons' },
          totalCredits: { $sum: '$transaction.credits' },
          totalSalesAmount: { $sum: '$transaction.price' },
          totalOrders: { $sum: 1 }
        }
      },
      {
        $group : {
          _id: '$_id.locationId',
          location: { $first: '$location' },
          salesAmountByPaymentMethod: { 
            $push: { 
              paymentMethod: '$_id.paymentMethod',
              totalSalesAmount: '$totalSalesAmount'
            },
          },
          totalCoupons: { $sum: '$totalCoupons' },
          totalCredits: { $sum: '$totalCredits' },
          totalOrders: { $sum: '$totalOrders' },
        }
      },
      {
        $sort: { totalOrders: -1 }
      }
    ];
    const [locationOrdersStats, rfidLocationOrdersStats] = await Promise.all([
      this.aggregate(locationOrdersAggregationPipeline),
      this.transactionService.getRFIDLocationOrdersStats(rfidFilter)
    ]);
    const orderLocationIds = locationOrdersStats.map(locationOrdersStat => String(locationOrdersStat._id));
    const onlyRFIDLocationOrdersStats = rfidLocationOrdersStats.filter(rfidLocationOrdersStat => !orderLocationIds.includes(String(rfidLocationOrdersStat._id)));
    onlyRFIDLocationOrdersStats.forEach((onlyRFIDLocationOrdersStat: any) => {
      locationOrdersStats.push({
        _id: onlyRFIDLocationOrdersStat._id,
        location: onlyRFIDLocationOrdersStat.location,
        salesAmountByPaymentMethod: [],
        totalCoupons: 0,
        totalCredits: 0,
        totalOrders: 0,
      })
    });
    const allPaymentMethods = Object.values(PaymentMethod);
    locationOrdersStats.forEach((locationOrdersStat: any) => {
      const salesAmountByPaymentMethod = {};
      locationOrdersStat.salesAmountByPaymentMethod.forEach(paymentMethodSale => {
        salesAmountByPaymentMethod[paymentMethodSale.paymentMethod] = roundUptoTwoDecimals(paymentMethodSale.totalSalesAmount);
      });
      const existedPaymentMethods = Object.keys(salesAmountByPaymentMethod);
      const remainingPaymentMethods = allPaymentMethods.filter(paymentMethod => !existedPaymentMethods.includes(paymentMethod));
      remainingPaymentMethods.forEach(remainingPaymentMethod => {
        salesAmountByPaymentMethod[remainingPaymentMethod] = 0;
      });
      locationOrdersStat.salesAmountByPaymentMethod = salesAmountByPaymentMethod;
      locationOrdersStat.rfidSalesStats = {
        totalPurchases: 0,
        totalTopups: 0,
        totalPurchaseAmount: 0,
        totalTopupAmount: 0,
      };
      const rfidLocationOrdersStat = rfidLocationOrdersStats.find(rfidLocationOrdersStat => String(rfidLocationOrdersStat._id) === String(locationOrdersStat._id));
      if (rfidLocationOrdersStat) {
        locationOrdersStat.totalOrders += rfidLocationOrdersStat.totalOrders;
        for (const paymentMethod in rfidLocationOrdersStat.salesAmountByPaymentMethod) {
          locationOrdersStat.salesAmountByPaymentMethod[paymentMethod] = roundUptoTwoDecimals(locationOrdersStat.salesAmountByPaymentMethod[paymentMethod] + 
            rfidLocationOrdersStat.salesAmountByPaymentMethod[paymentMethod]);
        }
        locationOrdersStat.rfidSalesStats = {
          totalPurchases: rfidLocationOrdersStat.totalPurchases,
          totalTopups: rfidLocationOrdersStat.totalTopups,
          totalPurchaseAmount: rfidLocationOrdersStat.totalPurchaseAmount,
          totalTopupAmount: rfidLocationOrdersStat.totalTopupAmount,
        }
      }
    });
    return locationOrdersStats;
  }

  async fetchUserOrdersStats(getUserOrderStatDto: GetUserOrderStatDto) {
    const filter: any = {};
    const rfidFilter: any = {};
    if (getUserOrderStatDto.orderedAtFrom || getUserOrderStatDto.orderedAtTo) {
      filter.orderedAt = {};
      if (getUserOrderStatDto.orderedAtFrom) filter.orderedAt = { ...filter.orderedAt, $gte: new Date(getUserOrderStatDto.orderedAtFrom) };
      if (getUserOrderStatDto.orderedAtTo) filter.orderedAt = { ...filter.orderedAt, $lt: new Date(getUserOrderStatDto.orderedAtTo) };
      rfidFilter.createdAt = filter.orderedAt;
    }
    const userOrdersAggregationPipeline: any = [
      {
        $match: filter
      },
      {
        $lookup: {
          from: 'transactions',
          let: { transactionId: '$transaction' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$_id', '$$transactionId'] },
                    { $eq: ['$status', 'completed'] },
                  ]
                }
              }
            },
            {
              $project: {
                price: 1,
                vat: 1,
                coupons: 1,
                credits: 1,
              }
            }
          ],
          as: 'transaction'
        }
      },
      { $unwind: '$transaction' },
      {
        $lookup: {
          from: 'users',
          let: { userId: '$user' },
          pipeline: [
            {
              $match: {
                $expr: { 
                  $eq: ['$_id', '$$userId'] 
                },
              }
            },
            {
              $project: {
                name: 1,
                username: 1,
              }
            }
          ],
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $group : {
          _id : { userId: '$user._id', paymentMethod: '$paymentMethod' },
          user: { $first: "$user" },
          totalCoupons: { $sum: '$transaction.coupons' },
          totalCredits: { $sum: '$transaction.credits' },
          totalSalesAmount: { $sum: '$transaction.price' },
          totalOrders: { $sum: 1 }
        }
      },
      {
        $group : {
          _id: '$_id.userId',
          user: { $first: '$user' },
          salesAmountByPaymentMethod: { 
            $push: { 
              paymentMethod: '$_id.paymentMethod',
              totalSalesAmount: '$totalSalesAmount'
            },
          },
          totalCoupons: { $sum: '$totalCoupons' },
          totalCredits: { $sum: '$totalCredits' },
          totalOrders: { $sum: '$totalOrders' },
        }
      },
      {
        $sort: { totalOrders: -1 }
      }
    ];
    const [userOrdersStats, rfidUserOrdersStats] = await Promise.all([
      this.aggregate(userOrdersAggregationPipeline),
      this.transactionService.getRFIDUserOrdersStats(rfidFilter)
    ]);
    const orderUserIds = userOrdersStats.map(userOrdersStat => String(userOrdersStat._id));
    const onlyRFIDUserOrdersStats = rfidUserOrdersStats.filter(rfidUserOrdersStat => !orderUserIds.includes(String(rfidUserOrdersStat._id)));
    onlyRFIDUserOrdersStats.forEach((onlyRFIDUserOrdersStat: any) => {
      userOrdersStats.push({
        _id: onlyRFIDUserOrdersStat._id,
        user: onlyRFIDUserOrdersStat.user,
        salesAmountByPaymentMethod: [],
        totalCoupons: 0,
        totalCredits: 0,
        totalOrders: 0,
      })
    });
    const allPaymentMethods = Object.values(PaymentMethod);
    userOrdersStats.forEach((userOrdersStat: any) => {
      const salesAmountByPaymentMethod = {};
      userOrdersStat.salesAmountByPaymentMethod.forEach(paymentMethodSale => {
        salesAmountByPaymentMethod[paymentMethodSale.paymentMethod] = roundUptoTwoDecimals(paymentMethodSale.totalSalesAmount);
      });
      const existedPaymentMethods = Object.keys(salesAmountByPaymentMethod);
      const remainingPaymentMethods = allPaymentMethods.filter(paymentMethod => !existedPaymentMethods.includes(paymentMethod));
      remainingPaymentMethods.forEach(remainingPaymentMethod => {
        salesAmountByPaymentMethod[remainingPaymentMethod] = 0;
      });
      userOrdersStat.salesAmountByPaymentMethod = salesAmountByPaymentMethod;
      userOrdersStat.rfidSalesStats = {
        totalPurchases: 0,
        totalTopups: 0,
        totalPurchaseAmount: 0,
        totalTopupAmount: 0,
      };
      const rfidUserOrdersStat = rfidUserOrdersStats.find(rfidUserOrdersStat => String(rfidUserOrdersStat._id) === String(userOrdersStat._id));
      if (rfidUserOrdersStat) {
        userOrdersStat.totalOrders += rfidUserOrdersStat.totalOrders;
        for (const paymentMethod in rfidUserOrdersStat.salesAmountByPaymentMethod) {
          userOrdersStat.salesAmountByPaymentMethod[paymentMethod] = roundUptoTwoDecimals(userOrdersStat.salesAmountByPaymentMethod[paymentMethod] + 
            rfidUserOrdersStat.salesAmountByPaymentMethod[paymentMethod]);
        }
        userOrdersStat.rfidSalesStats = {
          totalPurchases: rfidUserOrdersStat.totalPurchases,
          totalTopups: rfidUserOrdersStat.totalTopups,
          totalPurchaseAmount: rfidUserOrdersStat.totalPurchaseAmount,
          totalTopupAmount: rfidUserOrdersStat.totalTopupAmount,
        }
      }
    });
    return userOrdersStats;
  }

  async fetchExportableUserOrdersStats(exportUserOrderStatDto: ExportUserOrderStatDto) {
    const filter: any = {};
    const rfidFilter: any = {};
    filter.user = rfidFilter.user = castToMongoId(exportUserOrderStatDto.user);
    if (exportUserOrderStatDto.orderedAtFrom || exportUserOrderStatDto.orderedAtTo) {
      filter.orderedAt = {};
      if (exportUserOrderStatDto.orderedAtFrom) filter.orderedAt = { ...filter.orderedAt, $gte: new Date(exportUserOrderStatDto.orderedAtFrom) };
      if (exportUserOrderStatDto.orderedAtTo) filter.orderedAt = { ...filter.orderedAt, $lt: new Date(exportUserOrderStatDto.orderedAtTo) };
      rfidFilter.createdAt = filter.orderedAt;
    }
    const baseAggregationPipeline: any = [
      {
        $match: filter
      },
      {
        $lookup: {
          from: 'transactions',
          let: { transactionId: '$transaction' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$_id', '$$transactionId'] },
                    { $eq: ['$status', 'completed'] },
                  ],
                }
              }
            },
            {
              $project: {
                _id: 1,
                price: 1,
                credits: 1,
                coupons: 1
              }
            }
          ],
          as: 'transaction'
        }
      },
      { $unwind: '$transaction' },
    ];
    const productQtyAggregationPipeline: any = [
      {
        $addFields: {
          orderDetails: {
            $concatArrays: [ '$productDetails', '$eventDetails' ]
          }
        }
      },
      { $unwind: '$orderDetails' },
      {
        $project: {
          type: 1,
          user: 1,
          orderDetails: 1,
        }
      },
      {
        $group : {
          _id: { $cond: [ { $eq: [ '$type', 'product' ] }, '$orderDetails.product', '$orderDetails.event' ] },
          user: { $first: '$user' },
          totalQuantity: { $sum: '$orderDetails.quantity' },
          totalPrice: { $sum: '$orderDetails.price' },
        }
      },
      {
        $addFields: {
          unitPrice: {
            $divide: [ '$totalPrice', '$totalQuantity' ]
          }
        }
      },
      {
        $lookup: {
          from: 'events',
          let: { eventId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { 
                  $eq: [ '$_id', '$$eventId' ]
                },
              }
            },
            {
              $project: {
                name: 1,
              }
            }
          ],
          as: 'event'
        }
      },
      { 
        $unwind: {
          path: '$event', 
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'products',
          let: { productId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { 
                  $eq: [ '$_id', '$$productId' ]
                },
              }
            },
            {
              $project: {
                name: 1
              }
            }
          ],
          as: 'product'
        }
      },
      { 
        $unwind: {
          path: '$product', 
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { userId: '$user' },
          pipeline: [
            {
              $match: {
                $expr: { 
                  $eq: [ '$_id', '$$userId' ]
                },
              }
            },
            {
              $project: {
                name: 1,
                username: 1
              }
            }
          ],
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          product: {
            $cond: [ { $gt: [ '$product', {} ] }, '$product', '$event' ]
          },
          user: 1,
          totalQuantity: 1,
          unitPrice: 1,
          totalPrice: 1,
        }
      },
      {
        $sort: { totalQuantity: -1 }
      }
    ];
    const paymentMethodAggregationPipeline: any = [
      {
        $group : {
          _id : '$paymentMethod',
          totalCoupons: { $sum: '$transaction.coupons' },
          totalCredits: { $sum: '$transaction.credits' },
          totalSalesAmount: { $sum: '$transaction.price' },
          totalOrders: { $sum: 1 }
        }
      },
      {
        $sort: { totalSalesAmount: -1 }
      }
    ];
    const productAggregationPipeline = JSON.parse(JSON.stringify([...baseAggregationPipeline, ...productQtyAggregationPipeline]));
    const paymentAggregationPipeline = [...baseAggregationPipeline, ...paymentMethodAggregationPipeline];
    productAggregationPipeline[0]['$match'] = { ...filter, paymentMethod: { $in: [PaymentMethod.Cash, PaymentMethod.Pin] } };
    const [productsSalesData, paymentMethodsSalesData, rfidUserOrdersStats] = await Promise.all([
      this.aggregate(productAggregationPipeline),
      this.aggregate(paymentAggregationPipeline),
      this.transactionService.getRFIDUserOrdersStats(rfidFilter)
    ]);
    productsSalesData.forEach((producsSalesData: any) => {
      producsSalesData.unitPrice = roundUptoTwoDecimals(producsSalesData.unitPrice);
      producsSalesData.totalPrice = roundUptoTwoDecimals(producsSalesData.totalPrice);
    });
    paymentMethodsSalesData.forEach((paymentMethodSalesData: any) => {
      paymentMethodSalesData.totalCredits = roundUptoTwoDecimals(paymentMethodSalesData.totalCredits);
      paymentMethodSalesData.totalSalesAmount = roundUptoTwoDecimals(paymentMethodSalesData.totalSalesAmount);
    });
    const allPaymentMethods = Object.values(PaymentMethod);
    const existedPaymentMethods = paymentMethodsSalesData.map((paymentMethodSalesData: any) => paymentMethodSalesData._id);
    const remainingPaymentMethods = allPaymentMethods.filter(paymentMethod => !existedPaymentMethods.includes(paymentMethod));
    remainingPaymentMethods.forEach(remainingPaymentMethod => {
      paymentMethodsSalesData.push({
        _id: remainingPaymentMethod,
        totalCoupons: 0,
        totalCredits: 0,
        totalSalesAmount: 0,
        totalOrders: 0
      });
    });
    const rfidSalesData = [];
    const rfidUserOrdersStat = rfidUserOrdersStats.length ? rfidUserOrdersStats[0] : null;
    if (rfidUserOrdersStat) {
      rfidSalesData.push(...[
        {
          product: 'RFID Purchases',
          totalOrders: rfidUserOrdersStat.totalPurchases,
          totalSalesAmount: rfidUserOrdersStat.totalPurchaseAmount
        },
        {
          product: 'RFID Topups',
          totalOrders: rfidUserOrdersStat.totalTopups,
          totalSalesAmount: rfidUserOrdersStat.totalTopupAmount
        }
      ]);
      paymentMethodsSalesData.forEach((paymentMethodSalesData: any) => {
        if (paymentMethodSalesData._id in rfidUserOrdersStat.salesAmountByPaymentMethod) {
          paymentMethodSalesData.totalSalesAmount = roundUptoTwoDecimals(paymentMethodSalesData.totalSalesAmount + 
            rfidUserOrdersStat.salesAmountByPaymentMethod[paymentMethodSalesData._id]);
        }
      });
    }
    return { productsSalesData, rfidSalesData, paymentMethodsSalesData };
  }
}
