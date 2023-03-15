import { Injectable, Res } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Response } from 'express';
import { Transaction, TransactionDocument } from './entities';
import { ListTransactionDto, GetCashRFIDOrderStatDto, UpdateCashRFIDOrderStatDto, ExportTransactionDto } from './dto';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { AllPaymentMethod, ITransaction, PaymentMethod, RFIDCardOperation, TransactionCreatedBy, TransactionStatus, TransactionType } from '../shared/interfaces';
import { addDate, castToMongoId, delay, exportCSV, formatDate, getSearchQueryFilters, roundUptoTwoDecimals } from '../shared/utils';
import { MESSAGES, GENERAL_DATA } from '../shared/constants';

@Injectable()
export class TransactionService {
  constructor(@InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>) {}

  async get(id: string) {
    const transaction = await this.findByID(id);
    return { transaction };
  }

  async list(listTransactionDto: ListTransactionDto) {
    const filter: any = {};
    if (listTransactionDto.transactionId) filter._id = listTransactionDto.transactionId;
    if (listTransactionDto.cardOperation ) {
      if (listTransactionDto.cardOperation === RFIDCardOperation.Purchase) filter['cardDetails.purchase'] = true;
      if (listTransactionDto.cardOperation === RFIDCardOperation.Topup) filter['cardDetails.topup'] = true;
      if (listTransactionDto.cardOperation === RFIDCardOperation.Both) {
        filter['cardDetails.purchase'] = true;
        filter['cardDetails.topup'] = true;
      }
    }
    const extraFilters = ['type', 'paymentMethod', 'order', 'card', 'status', 'location', 'user', 'createdBy'];
    extraFilters.forEach(extraFilter => {
      if (listTransactionDto[extraFilter]) filter[extraFilter] = listTransactionDto[extraFilter];
    });
    if (listTransactionDto.orderedAtFrom || listTransactionDto.orderedAtTo) {
      filter.createdAt = {};
      if (listTransactionDto.orderedAtFrom) filter.createdAt = { ...filter.createdAt, $gte: new Date(listTransactionDto.orderedAtFrom) };
      if (listTransactionDto.orderedAtTo) filter.createdAt = { ...filter.createdAt, $lt: new Date(listTransactionDto.orderedAtTo) };
    }
    if (listTransactionDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(listTransactionDto.searchKeyword, ['description']);
    }
    const options = {
      page: listTransactionDto.page,
      limit: listTransactionDto.limit,
      sort: { createdAt: -1 },
      populate: [
        { path: 'card', select: 'printedId credits status' },
        { path: 'location', select: 'number name' },
        { path: 'user', select: 'name username status' },
        { 
          path: 'order', select: '-card -transaction -location -user',
          populate: [
            { path: 'eventDetails.event', select: 'name' },
            { path: 'productDetails.product', select: 'name' },
          ]
        },
      ]
    };
    return await this.listAll(filter, options);
  }

  async export(exportTransactionDto: ExportTransactionDto, response: Response) {
    const filter: any = {
      type: TransactionType.Card,
      status: TransactionStatus.Completed,
      createdAt: { 
        $gte: new Date(exportTransactionDto.orderedAt), 
        $lt: addDate(1, 'd', exportTransactionDto.orderedAt) 
      },
    };
    const extraFilters = ['paymentMethod', 'location', 'createdBy'];
    extraFilters.forEach(extraFilter => {
      if (exportTransactionDto[extraFilter]) filter[extraFilter] = exportTransactionDto[extraFilter];
    });
    let shouldStop = false;
    const rows: any = [];
    const options = {
      page: 1,
      limit: 1000,
      sort: { createdAt: -1 },
      populate: [
        { path: 'location', select: 'number name' },
        { path: 'user', select: 'name username status' },
      ]
    };
    while (!shouldStop) {
      const { results: transactions } = await this.listAll(filter, options);
      if (!transactions.length) shouldStop = true;
      else {
        for (const transaction of transactions) {
          rows.push({
            id: transaction._id,
            paynlId: transaction.externalId || 'N/A',
            paymentMethod: transaction.paymentMethod,
            cardId: transaction.card,
            IsPurchased: transaction.cardDetails.purchase ? 'Yes' : 'No',
            IsTopup: transaction.cardDetails.topup ? 'Yes' : 'No',
            'purchasePrice(€)': transaction.cardDetails.purchasePrice,
            'topupPrice(€)': transaction.cardDetails.topupPrice,
            'price(€)': transaction.price.toFixed(2),
            'vat(€)': transaction.vat.toFixed(2),
            location: transaction.location?.name || 'N/A',
            user: transaction.user?.name || 'N/A',
            createdBy: transaction.createdBy,
            orderedAt: formatDate(transaction.createdAt),
          });
        }
        options.page++;
        await delay(300);
      }
    }
    exportCSV(rows, 'transactions', response);
  }

  async exportRefundRequests(response: Response) {
    const filter: any = {
      type: TransactionType.Refund,
      status: TransactionStatus.Pending,
    };
    let shouldStop = false;
    const rows: any = [];
    const options = {
      page: 1,
      limit: 1000,
      sort: { createdAt: -1 },
    };
    while (!shouldStop) {
      const { results: transactions } = await this.listAll(filter, options);
      if (!transactions.length) shouldStop = true;
      else {
        for (const transaction of transactions) {
          rows.push({
            id: transaction._id,
            name: transaction.customerDetails.name,
            email: transaction.customerDetails.email,
            phone: transaction.customerDetails.phone,
            city: transaction.customerDetails.city,
            iban: transaction.customerDetails.iban,
            cardId: transaction.card,
            credits: transaction.creditDetails.credits,
            'price(€)': transaction.price.toFixed(2),
            requestedAt: formatDate(transaction.createdAt),
          });
        }
        options.page++;
        await delay(300);
      }
    }
    exportCSV(rows, 'refund_requests', response);
  }

  async getCashRFIDOrdersStats(getCashRFIDOrderStatDto: GetCashRFIDOrderStatDto) {
    const filter = this.getCashRFIDFilter(getCashRFIDOrderStatDto);
    const rfidSalesData = await this.getRFIDOrdersStats(filter);
    const cashRFIDOrdersStats = [
      {
        product: 'RFID Purchases',
        totalOrders: rfidSalesData.totalPurchases,
        totalSalesAmount: rfidSalesData.totalPurchaseAmount
      },
      {
        product: 'RFID Topups',
        totalOrders: rfidSalesData.totalTopups,
        totalSalesAmount: rfidSalesData.totalTopupAmount
      }
    ];
    return { cashRFIDOrdersStats };
  }

  async updateCashRFIDOrdersStats(updateCashRFIDOrderStatDto: UpdateCashRFIDOrderStatDto) {
    this.modifyCashRFIDOrdersStats(updateCashRFIDOrderStatDto);
    return {
      msg: 'Operation started',
    };
  }

  async getOrdersStats() {
    const [totalOrders, totalOrdersByRFID] = await Promise.all([
      this.count({ type: TransactionType.Order, status: TransactionStatus.Completed }),
      this.count({ type: TransactionType.Order, status: TransactionStatus.Completed, paymentMethod: PaymentMethod.RFIDCard })
    ]);
    return { totalOrders, totalOrdersByRFID };
  }

  async countDeals(): Promise<number> {
    return await this.count({ type: TransactionType.Deal });
  }

  async getRFIDOrdersStats(rfidFilter = {}) {
    const filter: any = {
      type: TransactionType.Card,
      status: TransactionStatus.Completed,
      ...rfidFilter,
    };
    const rfidOrdersStats = {
      totalOrders: 0,
      totalPurchases: 0,
      totalTopups: 0,
      totalPurchaseAmount: 0,
      totalTopupAmount: 0,
      totalSalesAmount: 0,
    };
    const rfidSales = await this.aggregate([
      {
        $match: filter
      },
      {
        $project: {
          cardDetails: 1,
          price: 1,
        }
      },
      {
        $group : {
          _id: null,
          totalPurchases: {
            $sum: { $cond: ['$cardDetails.purchase', 1, 0] }
          },
          totalTopups: {
            $sum: { $cond: ['$cardDetails.topup', 1, 0] }
          },
          totalPurchaseAmount: { $sum: '$cardDetails.purchasePrice' },
          totalTopupAmount: { $sum: '$cardDetails.topupPrice' },
          totalSalesAmount: { $sum: '$price' },
          totalOrders: { $count: {} },
        },
      },
    ]);
    if (rfidSales.length) {
      rfidOrdersStats.totalOrders = rfidSales[0].totalOrders;
      rfidOrdersStats.totalPurchases = rfidSales[0].totalPurchases;
      rfidOrdersStats.totalTopups = rfidSales[0].totalTopups;
      rfidOrdersStats.totalPurchaseAmount = roundUptoTwoDecimals(rfidSales[0].totalPurchaseAmount);
      rfidOrdersStats.totalTopupAmount = roundUptoTwoDecimals(rfidSales[0].totalTopupAmount);
      rfidOrdersStats.totalSalesAmount = roundUptoTwoDecimals(rfidSales[0].totalSalesAmount);
    }
    return rfidOrdersStats;
  }

  async getRFIDLocationOrdersStats(rfidFilter: any) {
    const rfidLocationOrdersStats = await this.aggregate([
      {
        $match: {
          type: TransactionType.Card,
          status: TransactionStatus.Completed,
          createdBy: TransactionCreatedBy.User,
          ...rfidFilter,
        }
      },
      {
        $project: {
          paymentMethod: 1,
          cardDetails: 1,
          price: 1,
          location: 1,
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
      { $unwind: '$location' },
      {
        $group : {
          _id: { locationId: '$location._id', paymentMethod: '$paymentMethod' },
          location: { $first: '$location' },
          totalPurchases: {
            $sum: { $cond: ['$cardDetails.purchase', 1, 0] }
          },
          totalTopups: {
            $sum: { $cond: ['$cardDetails.topup', 1, 0] }
          },
          totalPurchaseAmount: { $sum: '$cardDetails.purchasePrice' },
          totalTopupAmount: { $sum: '$cardDetails.topupPrice' },
          totalSalesAmount: { $sum: '$price' },
          totalOrders: { $count: {} },
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
          totalPurchases: { $sum: '$totalPurchases' },
          totalTopups: { $sum: '$totalTopups' },
          totalPurchaseAmount: { $sum: '$totalPurchaseAmount' },
          totalTopupAmount: { $sum: '$totalTopupAmount' },
          totalSalesAmount: { $sum: '$totalSalesAmount' },
          totalOrders: { $sum: '$totalOrders' },
        }
      },
    ]);
    const allPaymentMethods = [PaymentMethod.Cash, PaymentMethod.Pin];
    rfidLocationOrdersStats.forEach((rfidLocationOrdersStat: any) => {
      const salesAmountByPaymentMethod = {};
      rfidLocationOrdersStat.salesAmountByPaymentMethod.forEach(paymentMethodSale => {
        salesAmountByPaymentMethod[paymentMethodSale.paymentMethod] = roundUptoTwoDecimals(paymentMethodSale.totalSalesAmount);
      });
      const existedPaymentMethods = Object.keys(salesAmountByPaymentMethod);
      const remainingPaymentMethods = allPaymentMethods.filter(paymentMethod => !existedPaymentMethods.includes(paymentMethod));
      remainingPaymentMethods.forEach(remainingPaymentMethod => {
        salesAmountByPaymentMethod[remainingPaymentMethod] = 0;
      });
      rfidLocationOrdersStat.salesAmountByPaymentMethod = salesAmountByPaymentMethod;
      rfidLocationOrdersStat.totalPurchaseAmount = roundUptoTwoDecimals(rfidLocationOrdersStat.totalPurchaseAmount);
      rfidLocationOrdersStat.totalTopupAmount = roundUptoTwoDecimals(rfidLocationOrdersStat.totalTopupAmount);
      rfidLocationOrdersStat.totalSalesAmount = roundUptoTwoDecimals(rfidLocationOrdersStat.totalSalesAmount);
    });
    return rfidLocationOrdersStats;
  }

  async getRFIDUserOrdersStats(rfidFilter: any) {
    const rfidUserOrdersStats = await this.aggregate([
      {
        $match: {
          type: TransactionType.Card,
          status: TransactionStatus.Completed,
          createdBy: TransactionCreatedBy.User,
          ...rfidFilter,
        }
      },
      {
        $project: {
          paymentMethod: 1,
          cardDetails: 1,
          price: 1,
          user: 1,
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
                username: 1
              }
            }
          ],
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $group : {
          _id: { userId: '$user._id', paymentMethod: '$paymentMethod' },
          user: { $first: "$user" },
          totalPurchases: {
            $sum: { $cond: ['$cardDetails.purchase', 1, 0] }
          },
          totalTopups: {
            $sum: { $cond: ['$cardDetails.topup', 1, 0] }
          },
          totalPurchaseAmount: { $sum: '$cardDetails.purchasePrice' },
          totalTopupAmount: { $sum: '$cardDetails.topupPrice' },
          totalSalesAmount: { $sum: '$price' },
          totalOrders: { $count: {} },
        }
      },
      {
        $group : {
          _id: '$_id.userId',
          user: { $first: "$user" },
          salesAmountByPaymentMethod: { 
            $push: { 
              paymentMethod: '$_id.paymentMethod',
              totalSalesAmount: '$totalSalesAmount'
            },
          },
          totalPurchases: { $sum: '$totalPurchases' },
          totalTopups: { $sum: '$totalTopups' },
          totalPurchaseAmount: { $sum: '$totalPurchaseAmount' },
          totalTopupAmount: { $sum: '$totalTopupAmount' },
          totalSalesAmount: { $sum: '$totalSalesAmount' },
          totalOrders: { $sum: '$totalOrders' },
        }
      },
    ]);
    const allPaymentMethods = [PaymentMethod.Cash, PaymentMethod.Pin];
    rfidUserOrdersStats.forEach((rfidUserOrdersStat: any) => {
      const salesAmountByPaymentMethod = {};
      rfidUserOrdersStat.salesAmountByPaymentMethod.forEach(paymentMethodSale => {
        salesAmountByPaymentMethod[paymentMethodSale.paymentMethod] = roundUptoTwoDecimals(paymentMethodSale.totalSalesAmount);
      });
      const existedPaymentMethods = Object.keys(salesAmountByPaymentMethod);
      const remainingPaymentMethods = allPaymentMethods.filter(paymentMethod => !existedPaymentMethods.includes(paymentMethod));
      remainingPaymentMethods.forEach(remainingPaymentMethod => {
        salesAmountByPaymentMethod[remainingPaymentMethod] = 0;
      });
      rfidUserOrdersStat.salesAmountByPaymentMethod = salesAmountByPaymentMethod;
      rfidUserOrdersStat.totalPurchaseAmount = roundUptoTwoDecimals(rfidUserOrdersStat.totalPurchaseAmount);
      rfidUserOrdersStat.totalTopupAmount = roundUptoTwoDecimals(rfidUserOrdersStat.totalTopupAmount);
      rfidUserOrdersStat.totalSalesAmount = roundUptoTwoDecimals(rfidUserOrdersStat.totalSalesAmount);
    });
    return rfidUserOrdersStats;
  }

  async getTurnoverStats() {
    const turnoverStats = {
      actualCashTurnover: 0,
      cashTurnover: 0,
      pinTurnover: 0,
      onlineTurnover: 0,
      totalTurnover: 0,
      actualTotalTurnover: 0,
    };
    const [{ actualSalesStats, censoredSalesStats }] = await this.aggregate([
      {
        $match: {
          status: TransactionStatus.Completed,
          paymentMethod: { 
            $in: [
              AllPaymentMethod.Cash, 
              AllPaymentMethod.Pin,
              AllPaymentMethod.Ideal,
              AllPaymentMethod.Bancontact,
              AllPaymentMethod.VisaMastercard,
            ], 
          },
        }
      },
      {
        $facet: {
          actualSalesStats: [
            {
              $project: {
                paymentMethod: 1,
                price: { $cond: [ { $gt: [ '$actualPrice', null ] }, '$actualPrice', '$price' ] },
              }
            },
            {
              $group : {
                _id: '$paymentMethod',
                totalSalesAmount: { $sum: '$price' },
              }
            },
          ],
          censoredSalesStats: [
            {
              $match: { 
                paymentMethod: AllPaymentMethod.Cash,
                location: {
                  $nin: GENERAL_DATA.censoredLocations.map(location => castToMongoId(location))
                }
              }
            },
            {
              $project: {
                paymentMethod: 1,
                price: 1,
              }
            },
            {
              $group : {
                _id: '$paymentMethod',
                totalSalesAmount: { $sum: '$price' },
              }
            },
          ]
        }
      },
    ]);
    actualSalesStats.forEach(actualSalesStat => {
      if (actualSalesStat._id === PaymentMethod.Cash) {
        turnoverStats.actualCashTurnover = roundUptoTwoDecimals(actualSalesStat.totalSalesAmount);
      }
      else if (actualSalesStat._id === PaymentMethod.Pin) {
        turnoverStats.pinTurnover = roundUptoTwoDecimals(actualSalesStat.totalSalesAmount);
      }
      else turnoverStats.onlineTurnover += roundUptoTwoDecimals(actualSalesStat.totalSalesAmount);
    });
    censoredSalesStats.forEach(censoredSalesStat => {
      if (censoredSalesStat._id === PaymentMethod.Cash) {
        turnoverStats.cashTurnover = roundUptoTwoDecimals(censoredSalesStat.totalSalesAmount);
        if (turnoverStats.cashTurnover > 0) {
          turnoverStats.cashTurnover = roundUptoTwoDecimals(turnoverStats.cashTurnover - (turnoverStats.cashTurnover * 0.1));
        }
      }
    });
    turnoverStats.totalTurnover = roundUptoTwoDecimals(turnoverStats.cashTurnover + turnoverStats.pinTurnover + turnoverStats.onlineTurnover);
    turnoverStats.actualTotalTurnover = roundUptoTwoDecimals(turnoverStats.actualCashTurnover + turnoverStats.pinTurnover + turnoverStats.onlineTurnover);
    return turnoverStats;
  }

  getCashRFIDFilter(getCashRFIDOrderStatDto: GetCashRFIDOrderStatDto) {
    const filter: any = {
      type: TransactionType.Card,
      status: TransactionStatus.Completed,
      paymentMethod: PaymentMethod.Cash,
    };
    if (getCashRFIDOrderStatDto.location) filter.location = castToMongoId(getCashRFIDOrderStatDto.location);
    if (getCashRFIDOrderStatDto.user) filter.user = castToMongoId(getCashRFIDOrderStatDto.user);
    if (getCashRFIDOrderStatDto.orderedAtFrom || getCashRFIDOrderStatDto.orderedAtTo) {
      filter.createdAt = {};
      if (getCashRFIDOrderStatDto.orderedAtFrom) filter.createdAt = { ...filter.createdAt, $gte: new Date(getCashRFIDOrderStatDto.orderedAtFrom) };
      if (getCashRFIDOrderStatDto.orderedAtTo) filter.createdAt = { ...filter.createdAt, $lt: new Date(getCashRFIDOrderStatDto.orderedAtTo) };
    }
    return filter;
  }

  async modifyCashRFIDOrdersStats(updateCashRFIDOrderStatDto: UpdateCashRFIDOrderStatDto) {
    if (updateCashRFIDOrderStatDto.operation === RFIDCardOperation.Both) return;
    const minRFIDTopupAmount = 5;
    const limit = 10;
    const filter = this.getCashRFIDFilter(updateCashRFIDOrderStatDto);
    filter['cardDetails.topup'] = true;
    if (updateCashRFIDOrderStatDto.operation === RFIDCardOperation.Purchase) filter['cardDetails.purchase'] = true;
    else filter['cardDetails.topupPrice'] = { $gt: minRFIDTopupAmount };
    const aggregationPipeline: any = [
      {
        $match: filter
      },
      {
        $project: {
          type: 1,
          cardDetails: 1,
          price: 1,
          actualPrice: 1,
          createdAt: 1,
        }
      },
    ];
    try {
      if (updateCashRFIDOrderStatDto.operation === RFIDCardOperation.Purchase) {
        let shouldStop = false;
        let currReducedQty = 0;
        const totalReducedQty = updateCashRFIDOrderStatDto.reducedQuantity;
        aggregationPipeline.push({ $limit: limit });
        while (!shouldStop && (currReducedQty < totalReducedQty)) {
          const rfidOrders = await this.aggregate(aggregationPipeline);
          if (!rfidOrders.length) shouldStop = true;
          else {
            const operations = [];
            for (const rfidOrder of rfidOrders) {
              const remainingReducedQty = totalReducedQty - currReducedQty;
              if (remainingReducedQty === 0) {
                shouldStop = true;
                break;
              }
              const transactionData: any = {};
              let reducedPrice = 0;
              reducedPrice = rfidOrder.cardDetails.purchasePrice;
              currReducedQty += 1;
              rfidOrder.cardDetails.purchase = false;
              rfidOrder.cardDetails.purchasePrice = 0;
              transactionData.cardDetails = rfidOrder.cardDetails;
              if (!rfidOrder.actualPrice) transactionData.actualPrice = rfidOrder.price;
              transactionData.price = roundUptoTwoDecimals(rfidOrder.price - reducedPrice);
              if (transactionData.price > 0) operations.push(this.updateByID(rfidOrder._id, transactionData));
            }
            if (operations.length) {
              await Promise.all(operations);
              await delay(100);
            }
          }
        }
      }
      else {
        let shouldStop = false;
        let page = 1;
        const reducedPercentage = updateCashRFIDOrderStatDto.reducedPercentage;
        while (!shouldStop) {
          const skip = (page - 1) * limit;
          const rfidOrders = await this.aggregate([...aggregationPipeline, ...[
            {
              $sort: { 
                createdAt: 1 
              }
            },
            { $skip: skip }, 
            { $limit: limit },
          ]]);
          if (!rfidOrders.length) shouldStop = true;
          else {
            page++;
            const operations = [];
            for (const rfidOrder of rfidOrders) {
              const transactionData: any = {};
              let reducedPrice = 0;
              reducedPrice = roundUptoTwoDecimals(rfidOrder.cardDetails.topupPrice * (reducedPercentage / 100));
              rfidOrder.cardDetails.topupPrice = roundUptoTwoDecimals(rfidOrder.cardDetails.topupPrice - reducedPrice);
              transactionData.cardDetails = rfidOrder.cardDetails;
              if (!rfidOrder.actualPrice) transactionData.actualPrice = rfidOrder.price;
              transactionData.price = roundUptoTwoDecimals(rfidOrder.price - reducedPrice);
              if (transactionData.price > 0) operations.push(this.updateByID(rfidOrder._id, transactionData));
            }
            if (operations.length) {
              await Promise.all(operations);
              await delay(100);
            }
          }
        }
      }
    }
    catch(e) {
      console.error('Correction Tool Error: ', e);
    }
  }

  async add(transaction: ITransaction, session?: any): Promise<TransactionDocument> {
    const transactions = await this.transactionModel.create([transaction], { session });
    return transactions[0];
  }

  async addBulk(orders: ITransaction[], session?: any): Promise<void> {
    await this.transactionModel.insertMany(orders, { session, ordered: true, rawResult: true });
  }

  async findByID(id: string, attributes?: any): Promise<ITransaction> {
    const transaction = await this.transactionModel.findOne({ _id: id }).select(attributes).lean();
    if (!transaction) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return transaction;
  }

  async findAndUpdateByID(id: string, data: any, attributes?: any): Promise<ITransaction> {
    const transaction = await this.transactionModel
      .findOneAndUpdate({ _id: id }, data, { runValidators: true, new: true })
      .select(attributes)
      .lean();
    if (!transaction) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return transaction;
  }

  async findAndDeleteByID(id: string, attributes?: any): Promise<ITransaction> {
    const transaction = await this.transactionModel.findOneAndDelete({ _id: id }).select(attributes).lean();
    if (!transaction) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return transaction;
  }

  async findOneByFilter(filter: any, attributes?: any, throwErrorIfNotExists = false): Promise<ITransaction | null> {
    const transaction = await this.transactionModel.findOne(filter).select(attributes).lean();
    if (!transaction && throwErrorIfNotExists) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return transaction;
  }

  async findByFilter(filter: any, attributes?: any): Promise<ITransaction[]> {
    return await this.transactionModel.find(filter).select(attributes).lean();
  }

  async updateByID(id: string, data: any): Promise<void> {
    const res = await this.transactionModel.updateOne({ _id: id }, data, { runValidators: true }).lean();
    if (!res.matchedCount) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateOneByFilter(filter: any, data: any): Promise<void> {
    const res = await this.transactionModel.updateOne(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateByFilter(filter: any, data: any): Promise<void> {
    const res = await this.transactionModel.updateMany(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteByID(id: string): Promise<void> {
    const res = await this.transactionModel.deleteOne({ _id: id });
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteOneByFilter(filter: any): Promise<void> {
    const res = await this.transactionModel.deleteOne(filter);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async estimatedCount(): Promise<number> {
    return await this.transactionModel.estimatedDocumentCount();
  }

  async count(filter: any): Promise<number> {
    return await this.transactionModel.countDocuments(filter, { readPreference: 'secondaryPreferred' });
  }

  async aggregate(aggregatePipeline: any): Promise<any> {
    return await this.transactionModel.aggregate(aggregatePipeline, { readPreference: 'secondaryPreferred' });
  }

  async listAll(filter: any, options: any): Promise<any> {
    const page = options.page ? parseInt(options.page, 10) : 1
    const limit = options.limit ? parseInt(options.limit, 10) : 10
    const skip = (page - 1) * limit
    const listQuery = this.transactionModel.find(filter, null, { readPreference: 'secondaryPreferred' });
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
}
