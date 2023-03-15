import { Inject, Injectable, forwardRef, Res, ForbiddenException, NotFoundException, InternalServerErrorException, PreconditionFailedException, ConflictException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Response } from 'express';
import { RFIDCard, RFIDCardDocument } from './entities';
import { TransactionService } from '../transaction';
import { PaymentService } from '../payment';
import { PurchaseAndTopupRFIDDto, CreateRFIDCardDto, UpdateRFIDCardDto, ListRFIDCardDto, ExportRFIDCardDto } from './dto';
import { IRFIDCard, ITransaction, RFIDCardOperation, AccountStatus, TransactionStatus, TransactionType, UserSession, RFIDCardPurchaseStatus, AllPaymentMethod } from '../shared/interfaces';
import { getSearchQueryFilters, roundUptoTwoDecimals, formatDate, exportCSV, createMongoId } from '../shared/utils';
import { MESSAGES, RFID_SETTINGS } from '../shared/constants';

@Injectable()
export class RFIDCardService {
  constructor(
    private readonly transactionService: TransactionService,
    @Inject(forwardRef(() => PaymentService)) private readonly paymentService: PaymentService,
    @InjectModel(RFIDCard.name) private readonly rfidCardModel: Model<RFIDCardDocument>,
    @InjectConnection() private readonly connection: Connection
  ) {}

  async purchaseAndTopup(purchaseAndTopupRFIDDto: PurchaseAndTopupRFIDDto, user: UserSession) {
    if (purchaseAndTopupRFIDDto.paymentMethod === AllPaymentMethod.Pin) throw new PreconditionFailedException(MESSAGES.INVALID_PAYMENT_METHOD);
    const session = await this.connection.startSession();
    try {
      let rfidCard = null;
      await session.withTransaction(async () => {
        const { cardId, operation, paymentMethod, topupPrice } = purchaseAndTopupRFIDDto;
        rfidCard = await this.findByID(cardId, undefined, session);
        if (rfidCard.status === AccountStatus.Disabled) throw new ForbiddenException(MESSAGES.RFID_CARD_DISABLED);
        const transaction: any = {
          type: TransactionType.Card,
          paymentMethod,
          card: cardId,
          status: TransactionStatus.Completed,
          location: user.locationId,
          user: user.id,
        };
        if (operation !== RFIDCardOperation.Topup) {
          if (rfidCard.purchaseStatus === RFIDCardPurchaseStatus.Purchased) throw new PreconditionFailedException(MESSAGES.RFID_CARD_ALREADY_PURCHASED);
          transaction.cardDetails = {
            purchase: true,
            purchasePrice: RFID_SETTINGS.purchasePrice,
          };
          transaction.price = RFID_SETTINGS.purchasePrice;
          let topupCredits = 0;
          if (operation === RFIDCardOperation.Both && topupPrice) {
            topupCredits = roundUptoTwoDecimals(topupPrice * RFID_SETTINGS.euroToCredit);
            transaction.cardDetails = {
              ...transaction.cardDetails,
              topup: true,
              topupPrice, 
            };
            transaction.creditDetails = {
              preCredits: 0,
              credits: topupCredits,
              postCredits: topupCredits
            };
            transaction.price = roundUptoTwoDecimals(RFID_SETTINGS.purchasePrice + topupPrice);
          }
          await Promise.all([
            this.updateByID(cardId, {
              credits: operation === RFIDCardOperation.Both ? topupCredits : 0,
              purchaseStatus: RFIDCardPurchaseStatus.Purchased,
            }, session),
            this.transactionService.add(transaction, session)
          ]);
          rfidCard.credits = (operation === RFIDCardOperation.Both) ? topupCredits : 0;
          rfidCard.purchaseStatus = RFIDCardPurchaseStatus.Purchased;
        }
        else if (topupPrice) {
          if (rfidCard.purchaseStatus === RFIDCardPurchaseStatus.Available) throw new PreconditionFailedException(MESSAGES.RFID_CARD_NOT_PURCHASED);
          const topupCredits = roundUptoTwoDecimals(topupPrice * RFID_SETTINGS.euroToCredit);
          const postCredits = roundUptoTwoDecimals(rfidCard.credits + topupCredits);
          transaction.cardDetails = {
            topup: true,
            topupPrice,
          };
          transaction.creditDetails = {
            preCredits: rfidCard.credits,
            credits: topupCredits,
            postCredits: postCredits
          },
          transaction.price = topupPrice;
          await Promise.all([
            this.updateByID(cardId, { credits: postCredits }, session),
            this.transactionService.add(transaction, session)
          ]);
          rfidCard.credits = postCredits;
        }
      });
      return { rfidCard };
    }
    finally {
      session.endSession();
    }
  }

  async purchaseAndTopupUsingTerminal(purchaseAndTopupRFIDDto: PurchaseAndTopupRFIDDto, user: UserSession, ipAddress: string) {
    if (purchaseAndTopupRFIDDto.paymentMethod !== AllPaymentMethod.Pin) throw new PreconditionFailedException(MESSAGES.INVALID_PAYMENT_METHOD);
    const { cardId, operation, paymentMethod, topupPrice } = purchaseAndTopupRFIDDto;
    const rfidCard = await this.findByID(cardId);
    const transaction: any = {
      _id: createMongoId(),
      type: TransactionType.Card,
      paymentMethod,
      card: cardId,
      status: TransactionStatus.Pending,
      location: user.locationId,
      user: user.id,
      ipAddress,
    };
    if (rfidCard.status === AccountStatus.Disabled) throw new ForbiddenException(MESSAGES.RFID_CARD_DISABLED);
    if (operation !== RFIDCardOperation.Topup) {
      if (rfidCard.purchaseStatus === RFIDCardPurchaseStatus.Purchased) throw new PreconditionFailedException(MESSAGES.RFID_CARD_ALREADY_PURCHASED);
      transaction.cardDetails = {
        purchase: true,
        purchasePrice: RFID_SETTINGS.purchasePrice,
      };
      transaction.price = RFID_SETTINGS.purchasePrice;
      let topupCredits = 0;
      if (operation === RFIDCardOperation.Both && topupPrice) {
        topupCredits = roundUptoTwoDecimals(topupPrice * RFID_SETTINGS.euroToCredit);
        transaction.cardDetails = {
          ...transaction.cardDetails,
          topup: true,
          topupPrice, 
        }
        transaction.creditDetails = {
          preCredits: 0,
          credits: topupCredits,
          postCredits: topupCredits
        };
        transaction.price = roundUptoTwoDecimals(RFID_SETTINGS.purchasePrice + topupPrice);
      }
    }
    else if (topupPrice) {
      if (rfidCard.purchaseStatus === RFIDCardPurchaseStatus.Available) throw new PreconditionFailedException(MESSAGES.RFID_CARD_NOT_PURCHASED);
      const topupCredits = roundUptoTwoDecimals(topupPrice * RFID_SETTINGS.euroToCredit);
      const postCredits = roundUptoTwoDecimals(rfidCard.credits + topupCredits);
      transaction.cardDetails = {
        topup: true,
        topupPrice,
      };
      transaction.creditDetails = {
        preCredits: rfidCard.credits,
        credits: topupCredits,
        postCredits: postCredits
      },
      transaction.price = topupPrice;
    }
    const topupTransaction = await this.paymentService.startTopupTransaction(transaction);
    await this.transactionService.add(topupTransaction);
    return { 
      transaction: {
        externalId: topupTransaction.externalId,
        externalDetails: topupTransaction.externalDetails
      },
    };
  }

  async purchaseAndTopupAlongWithOrder(purchaseAndTopupRFIDDto: PurchaseAndTopupRFIDDto, user: UserSession, session: any) {
    if (purchaseAndTopupRFIDDto.paymentMethod === AllPaymentMethod.Pin) throw new PreconditionFailedException(MESSAGES.INVALID_PAYMENT_METHOD);
    const { cardId, operation, paymentMethod, topupPrice } = purchaseAndTopupRFIDDto;
    let rfidCard = await this.findByID(cardId, undefined, session);
    if (rfidCard.status === AccountStatus.Disabled) throw new ForbiddenException(MESSAGES.RFID_CARD_DISABLED);
    const transaction: any = {
      type: TransactionType.Card,
      paymentMethod,
      card: cardId,
      status: TransactionStatus.Completed,
      location: user.locationId,
      user: user.id,
    };
    if (operation !== RFIDCardOperation.Topup) {
      if (rfidCard.purchaseStatus === RFIDCardPurchaseStatus.Purchased) throw new PreconditionFailedException(MESSAGES.RFID_CARD_ALREADY_PURCHASED);
      transaction.cardDetails = {
        purchase: true,
        purchasePrice: RFID_SETTINGS.purchasePrice,
      };
      transaction.price = RFID_SETTINGS.purchasePrice;
      let topupCredits = 0;
      if (operation === RFIDCardOperation.Both && topupPrice) {
        topupCredits = roundUptoTwoDecimals(topupPrice * RFID_SETTINGS.euroToCredit);
        transaction.cardDetails = {
          ...transaction.cardDetails,
          topup: true,
          topupPrice, 
        };
        transaction.creditDetails = {
          preCredits: 0,
          credits: topupCredits,
          postCredits: topupCredits
        };
        transaction.price = roundUptoTwoDecimals(RFID_SETTINGS.purchasePrice + topupPrice);
      }
      await Promise.all([
        this.updateByID(cardId, {
          credits: operation === RFIDCardOperation.Both ? topupCredits : 0,
          purchaseStatus: RFIDCardPurchaseStatus.Purchased,
        }, session),
        this.transactionService.add(transaction, session)
      ]);
      rfidCard.credits = (operation === RFIDCardOperation.Both) ? topupCredits : 0;
      rfidCard.purchaseStatus = RFIDCardPurchaseStatus.Purchased;
    }
    else if (topupPrice) {
      if (rfidCard.purchaseStatus === RFIDCardPurchaseStatus.Available) throw new PreconditionFailedException(MESSAGES.RFID_CARD_NOT_PURCHASED);
      const topupCredits = roundUptoTwoDecimals(topupPrice * RFID_SETTINGS.euroToCredit);
      const postCredits = roundUptoTwoDecimals(rfidCard.credits + topupCredits);
      transaction.cardDetails = {
        topup: true,
        topupPrice,
      };
      transaction.creditDetails = {
        preCredits: rfidCard.credits,
        credits: topupCredits,
        postCredits: postCredits
      },
      transaction.price = topupPrice;
      await Promise.all([
        this.updateByID(cardId, { credits: postCredits }, session),
        this.transactionService.add(transaction, session)
      ]);
      rfidCard.credits = postCredits;
    }
    return rfidCard;
  }

  async purchaseAndTopupAlongWithTerminalOrder(purchaseAndTopupRFIDDto: PurchaseAndTopupRFIDDto, user: UserSession, session: any) {
    if (purchaseAndTopupRFIDDto.paymentMethod !== AllPaymentMethod.Pin) throw new PreconditionFailedException(MESSAGES.INVALID_PAYMENT_METHOD);
    const { cardId, operation, paymentMethod, topupPrice } = purchaseAndTopupRFIDDto;
    const rfidCard = await this.findByID(cardId);
    const transaction: any = {
      _id: createMongoId(),
      type: TransactionType.Card,
      paymentMethod,
      card: cardId,
      status: TransactionStatus.Pending,
      location: user.locationId,
      user: user.id,
    };
    if (rfidCard.status === AccountStatus.Disabled) throw new ForbiddenException(MESSAGES.RFID_CARD_DISABLED);
    if (operation !== RFIDCardOperation.Topup) {
      if (rfidCard.purchaseStatus === RFIDCardPurchaseStatus.Purchased) throw new PreconditionFailedException(MESSAGES.RFID_CARD_ALREADY_PURCHASED);
      transaction.cardDetails = {
        purchase: true,
        purchasePrice: RFID_SETTINGS.purchasePrice,
      };
      transaction.price = RFID_SETTINGS.purchasePrice;
      let topupCredits = 0;
      if (operation === RFIDCardOperation.Both && topupPrice) {
        topupCredits = roundUptoTwoDecimals(topupPrice * RFID_SETTINGS.euroToCredit);
        transaction.cardDetails = {
          ...transaction.cardDetails,
          topup: true,
          topupPrice, 
        }
        transaction.creditDetails = {
          preCredits: 0,
          credits: topupCredits,
          postCredits: topupCredits
        };
        transaction.price = roundUptoTwoDecimals(RFID_SETTINGS.purchasePrice + topupPrice);
      }
    }
    else if (topupPrice) {
      if (rfidCard.purchaseStatus === RFIDCardPurchaseStatus.Available) throw new PreconditionFailedException(MESSAGES.RFID_CARD_NOT_PURCHASED);
      const topupCredits = roundUptoTwoDecimals(topupPrice * RFID_SETTINGS.euroToCredit);
      const postCredits = roundUptoTwoDecimals(rfidCard.credits + topupCredits);
      transaction.cardDetails = {
        topup: true,
        topupPrice,
      };
      transaction.creditDetails = {
        preCredits: rfidCard.credits,
        credits: topupCredits,
        postCredits: postCredits
      },
      transaction.price = topupPrice;
    }
    const topupTransaction = await this.transactionService.add(transaction, session);
    return topupTransaction;
  }

  async purchaseOrder(transaction: ITransaction, session: any) {
    const rfidCard = await this.findByID(transaction.card as string, undefined, session);
    if (rfidCard.purchaseStatus === RFIDCardPurchaseStatus.Available) throw new PreconditionFailedException(MESSAGES.RFID_CARD_NOT_PURCHASED);
    if (rfidCard.status === AccountStatus.Disabled) throw new ForbiddenException(MESSAGES.RFID_CARD_DISABLED);
    if (rfidCard.credits < transaction.credits) throw new ConflictException(MESSAGES.RFID_CARD_LOW_CREDITS);
    const postCredits = roundUptoTwoDecimals(rfidCard.credits - transaction.credits);
    await Promise.all([
      this.updateByID(transaction.card as string, { 
        credits: postCredits,
      }, session),
      this.transactionService.add({
        ...transaction,
        creditDetails: {
          preCredits: rfidCard.credits,
          credits: transaction.credits,
          postCredits: postCredits
        }
      }, session)
    ]);
  }
  
  async create(createRFIDCardDto: CreateRFIDCardDto) {
    const rfidCard = await this.add({ 
      _id: createRFIDCardDto.cardId,
      printedId: createRFIDCardDto.printedId,
      cvc: createRFIDCardDto.cvc,
      credits: 0,
      status: createRFIDCardDto.status,
    });
    return { rfidCard };
  }

  async update(id: string, updateRFIDCardDto: UpdateRFIDCardDto) {
    const { purchaseStatus } = await this.findByID(id, { purchaseStatus: 1 });
    if (purchaseStatus === RFIDCardPurchaseStatus.Available) {
      if ((updateRFIDCardDto.purchaseStatus === RFIDCardPurchaseStatus.Purchased) || updateRFIDCardDto.credits) {
        throw new PreconditionFailedException(MESSAGES.RFID_CARD_MUST_BE_PURCHASED);
      }
    }
    else {
      if (updateRFIDCardDto.purchaseStatus === RFIDCardPurchaseStatus.Available) updateRFIDCardDto.credits = 0;
    }
    const rfidCard = await this.findAndUpdateByID(id, updateRFIDCardDto);
    return { rfidCard };
  }

  async delete(id: string) {
    await this.deleteByID(id);
    return {
      msg: 'RFID Card deleted',
    };
  }

  async get(id: string) {
    const rfidCard = await this.findByID(id);
    return { rfidCard };
  }

  async list(listRFIDCardDto: ListRFIDCardDto) {
    const filter: any = {};
    if (listRFIDCardDto.cardId) filter._id = listRFIDCardDto.cardId;
    const extraFilters = ['purchaseStatus', 'status'];
    extraFilters.forEach(extraFilter => {
      if (listRFIDCardDto[extraFilter]) filter[extraFilter] = listRFIDCardDto[extraFilter];
    })
    if (listRFIDCardDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(listRFIDCardDto.searchKeyword, ['_id', 'printedId', 'cvc']);
    }
    const options = {
      page: listRFIDCardDto.page,
      limit: listRFIDCardDto.limit
    };
    return await this.listAll(filter, options);
  }

  async export(exportRFIDCardDto: ExportRFIDCardDto, @Res() response: Response) {
    const filter: any = {};
    if (exportRFIDCardDto.cardId) filter._id = exportRFIDCardDto.cardId;
    const extraFilters = ['purchaseStatus', 'status'];
    extraFilters.forEach(extraFilter => {
      if (exportRFIDCardDto[extraFilter]) filter[extraFilter] = exportRFIDCardDto[extraFilter];
    })
    if (exportRFIDCardDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(exportRFIDCardDto.searchKeyword, ['_id', 'printedId', 'cvc']);
    }
    const options = {
      sort: { createdAt: -1 },
    };
    const { results: rfidCards } = await this.exportAll(filter, options);
    const rows: any = [];
    for (const rfidCard of rfidCards) {
      rows.push({
        id: rfidCard._id,
        printedId: rfidCard.printedId,
        cvc: rfidCard.cvc,
        credits: rfidCard.credits.toFixed(2),
        status: rfidCard.status,
        purchaseStatus: rfidCard.purchaseStatus,
        createdAt: formatDate(rfidCard.createdAt),
      });
    }
    exportCSV(rows, 'rfid_cards', response);
  }

  async getRFIDCardsStats() {
    const rfidCardsStats = {
      totalPurchased: 0,
      totalCredits: 0,
    };
    const rfidStats = await this.aggregate([
      {
        $match: {
          purchaseStatus: RFIDCardPurchaseStatus.Purchased,
        }
      },
      {
        $project: {
          credits: 1,
        }
      },
      {
        $group : {
          _id: null,
          totalPurchased: { $sum: 1 },
          totalCredits: { $sum: '$credits' },
        }
      },
    ]);
    if (rfidStats.length) {
      rfidCardsStats.totalPurchased = rfidStats[0].totalPurchased;
      rfidCardsStats.totalCredits = roundUptoTwoDecimals(rfidStats[0].totalCredits);
    }
    return rfidCardsStats;
  }

  async add(createRFIDCardDto: IRFIDCard, session?: any): Promise<RFIDCardDocument> {
    const rfidCards = await this.rfidCardModel.create([createRFIDCardDto], { session });
    return rfidCards[0];
  }

  async addBulk(rfidCards: IRFIDCard[], session?: any): Promise<void> {
    await this.rfidCardModel.insertMany(rfidCards, { session, ordered: true, rawResult: true });
  }

  async findByID(id: string, attributes?: any, session?: any): Promise<IRFIDCard> {
    const rfidCard = await this.rfidCardModel.findOne({ _id: id }).session(session).select(attributes).lean();
    if (!rfidCard) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return rfidCard;
  }

  async findAndUpdateByID(id: string, data: any, attributes?: any, session?: any): Promise<IRFIDCard> {
    const rfidCard = await this.rfidCardModel.findOneAndUpdate({ _id: id }, data, { runValidators: true, new: true }).
      session(session).select(attributes).lean();
    if (!rfidCard) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return rfidCard;
  }

  async findAndDeleteByID(id: string, attributes?: any): Promise<IRFIDCard> {
    const rfidCard = await this.rfidCardModel.findOneAndDelete({ _id: id }).select(attributes).lean();
    if (!rfidCard) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return rfidCard;
  }

  async findOneByFilter(filter: any, attributes?: any, throwErrorIfNotExists = false): Promise<IRFIDCard | null> {
    const rfidCard = await this.rfidCardModel.findOne(filter).select(attributes).lean();
    if (!rfidCard && throwErrorIfNotExists) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return rfidCard;
  }

  async findByFilter(filter: any, attributes?: any): Promise<IRFIDCard[]> {
    return await this.rfidCardModel.find(filter).select(attributes).lean();
  }

  async updateByID(id: string, data: any, session?: any): Promise<void> {
    const res = await this.rfidCardModel.updateOne({ _id: id }, data, { runValidators: true }).session(session).lean();
    if (!res.matchedCount) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateOneByFilter(filter: any, data: any): Promise<void> {
    const res = await this.rfidCardModel.updateOne(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateByFilter(filter: any, data: any): Promise<void> {
    const res = await this.rfidCardModel.updateMany(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteByID(id: string): Promise<void> {
    const res = await this.rfidCardModel.deleteOne({ _id: id });
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteOneByFilter(filter: any): Promise<void> {
    const res = await this.rfidCardModel.deleteOne(filter);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async estimatedCount(): Promise<number> {
    return await this.rfidCardModel.estimatedDocumentCount();
  }

  async count(filter: any): Promise<number> {
    return await this.rfidCardModel.countDocuments(filter);
  }

  async aggregate(aggregatePipeline: any): Promise<any> {
    return await this.rfidCardModel.aggregate(aggregatePipeline)
  }

  async listAll(filter: any, options: any): Promise<any> {
    const page = options.page ? parseInt(options.page, 10) : 1
    const limit = options.limit ? parseInt(options.limit, 10) : 10
    const skip = (page - 1) * limit
    const listQuery = this.rfidCardModel.find(filter);
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

  async exportAll(filter: any, options: any): Promise<any> {
    const exportQuery = this.rfidCardModel.find(filter);
    if (options.populate) exportQuery.populate(options.populate);
    if (options.select) exportQuery.select(options.select);
    if (options.sort) exportQuery.sort(options.sort);
    exportQuery.lean();
    const results = await exportQuery.exec();
    return {
      results,
    }
  }
}
