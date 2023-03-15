import * as Paynl from 'paynl-sdk';
import { TransactionResult } from 'paynl-sdk/lib/result/transaction';
import { Inject, Injectable, forwardRef, UnauthorizedException, ForbiddenException, ConflictException, PreconditionFailedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user';
import { RFIDCardService } from '../rfidcard';
import { OrderService } from '../order';
import { TransactionService } from '../transaction';
import { StartTopupTransactionDto, GetTerminalTransactionStatusDto, RequestRefundDto } from './dto';
import { AccountStatus, AllPaymentMethod, OnlinePaymentMethod, OnlinePaymentMethodID, RFIDCardPurchaseStatus, TransactionCreatedBy, TransactionStatus, TransactionType } from '../shared/interfaces';
import { roundUptoTwoDecimals, addDate, getIPAddress, requestHelper, createMongoId } from '../shared/utils';
import { GENERAL_DATA, MESSAGES, RFID_SETTINGS } from '../shared/constants';

@Injectable()
export class PaymentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly transactionService: TransactionService,
    @Inject(forwardRef(() => RFIDCardService)) private readonly rfidCardService: RFIDCardService,
    @Inject(forwardRef(() => OrderService)) private readonly orderService: OrderService,
  ) {
    Paynl.Config.setApiToken(this.configService.get<string>('PAYNL_API_KEY'));
    Paynl.Config.setServiceId(this.configService.get<string>('PAYNL_SERVICE_ID'));
  }
 
  async startOrderTransaction(orderTransaction: any, topupTransaction?: any): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const { terminal } = await this.userService.findByID(orderTransaction.user, 'terminal');
      if (!terminal) throw new PreconditionFailedException(MESSAGES.TERMINAL_NOT_LINKED);
      const transaction: any = {
        returnUrl: 'N/A',
        ipAddress: getIPAddress(orderTransaction?.ipAddress),
        amount: orderTransaction.price,
        paymentMethodId: GENERAL_DATA.terminalPaymentMethodId,
        terminalId: terminal,
        testMode: false,
        orderNumber: orderTransaction._id,
        extra1: orderTransaction._id,
        extra3: `:${orderTransaction.freezeOrderId || ''}`,
        description: 'order',
      };
      if (topupTransaction) {
        transaction.amount += roundUptoTwoDecimals(topupTransaction.price);
        transaction.extra2 = topupTransaction.card;
        transaction.extra3 = `${topupTransaction._id}:${orderTransaction.freezeOrderId || ''}`;
        transaction.description = 'order_and_topup';
      }
      Paynl.Transaction.start(transaction).subscribe(result => {
        orderTransaction = {
          ...orderTransaction,
          externalId: result.transactionId,
          externalDetails: {
            paymentReference: result.paymentReference,
            paymentURL: result.paymentURL,
            terminalHash: result.terminalHash,
            terminalStatusUrl: result.terminalStatusUrl,
          }
        }
        resolve(orderTransaction);
      }, (e) => {
        reject(new Error(e))
      });
    })
  }

  async startTopupTransaction(topupTransaction: any): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const { terminal } = await this.userService.findByID(topupTransaction.user, 'terminal');
      if (!terminal) throw new PreconditionFailedException(MESSAGES.TERMINAL_NOT_LINKED);
      Paynl.Transaction.start({
        returnUrl: 'N/A',
        ipAddress: getIPAddress(topupTransaction?.ipAddress),
        amount: topupTransaction.price,
        paymentMethodId: GENERAL_DATA.terminalPaymentMethodId,
        terminalId: terminal,
        testMode: false,
        orderNumber: topupTransaction._id,
        extra1: topupTransaction._id,
        extra2: topupTransaction.card,
        description: 'user_topup',
      }).subscribe(result => {
        topupTransaction = {
          ...topupTransaction,
          externalId: result.transactionId,
          externalDetails: {
            paymentReference: result.paymentReference,
            paymentURL: result.paymentURL,
            terminalHash: result.terminalHash,
            terminalStatusUrl: result.terminalStatusUrl,
          }
        }
        resolve(topupTransaction);
      }, (e) => {
        reject(new Error(e))
      });
    })
  }

  async startTicketTransactionByCustomer(ticketTransaction: any): Promise<any> {
    return new Promise(async (resolve, reject) => {
      Paynl.Transaction.start({
        returnUrl: `${GENERAL_DATA.webshopUrl}`,
        ipAddress: getIPAddress(ticketTransaction?.ipAddress),
        amount: ticketTransaction.price,
        paymentMethodId: ticketTransaction.paymentMethodId,
        testMode: false,
        orderNumber: ticketTransaction._id,
        extra1: ticketTransaction._id,
        description: 'customer_order',
        expireDate: addDate(10, 'm'),
      }).subscribe(result => {
        ticketTransaction = {
          ...ticketTransaction,
          externalId: result.transactionId,
          externalDetails: {
            paymentReference: result.paymentReference,
            paymentURL: result.paymentURL,
          }
        }
        resolve(ticketTransaction);
      }, (e) => {
        reject(new Error(e))
      });
    })
  }

  async getTerminals() {
    return new Promise((resolve, reject) => {
      const terminals = [];
      Paynl.Instore.getTerminals().subscribe((terminal) => {
        terminals.push({ 
          id: terminal.id,
          name: terminal.name, 
        });
      }, 
      (e) => reject(e),
      () => {
        resolve({ terminals });
      });
    })
  }
  
  async getPaymentMethods() {
    return new Promise((resolve, reject) => {
      const paymentMethods = [];
      Paynl.Paymentmethods.getList().subscribe((paymentMethod) => {
        let { id, name, visibleName } = paymentMethod;
        id = parseInt(String(id));
        if (Object.values(OnlinePaymentMethodID).includes(id as any)) {
          paymentMethods.push({ 
            id, 
            name: name.split(' ').join(''), 
            visibleName, 
          });
        }
      }, 
      (e) => reject(e),
      () => {
        resolve({ paymentMethods, settings: RFID_SETTINGS });
      });
    })
  }

  async getRFIDBalance(id: string) {
    const rfidCard = await this.rfidCardService.findByID(id);
    if (rfidCard.purchaseStatus === RFIDCardPurchaseStatus.Available) throw new PreconditionFailedException(MESSAGES.RFID_CARD_NOT_PURCHASED);
    if (rfidCard.status === AccountStatus.Disabled) throw new ForbiddenException(MESSAGES.RFID_CARD_DISABLED);
    return {
      credits: rfidCard.credits,
      price: roundUptoTwoDecimals(rfidCard.credits * RFID_SETTINGS.creditToEuro),
      refundable: roundUptoTwoDecimals(rfidCard.credits * RFID_SETTINGS.creditToEuro - RFID_SETTINGS.refundPrice),
    }
  }

  async startTopupTransactionByCustomer(startTopupTransactionDto: StartTopupTransactionDto, ipAddress?: string) { 
    return new Promise(async (resolve, reject) => {
      try {
        ipAddress = getIPAddress(ipAddress);
        const rfidCard = await this.rfidCardService.findByID(startTopupTransactionDto.cardId);
        if (rfidCard.purchaseStatus === RFIDCardPurchaseStatus.Available) throw new PreconditionFailedException(MESSAGES.RFID_CARD_NOT_PURCHASED);
        if (rfidCard.status === AccountStatus.Disabled) throw new ForbiddenException(MESSAGES.RFID_CARD_DISABLED);
        const topupCredits = roundUptoTwoDecimals(startTopupTransactionDto.topupPrice * RFID_SETTINGS.euroToCredit);
        const postCredits = roundUptoTwoDecimals(rfidCard.credits + topupCredits);
        const transaction: any = {
          _id: createMongoId(),
          type: TransactionType.Card,
          paymentMethod: startTopupTransactionDto.paymentMethod,
          card: startTopupTransactionDto.cardId,
          cardDetails: {
            topup: true,
            topupPrice: startTopupTransactionDto.topupPrice, 
          },
          creditDetails: {
            preCredits: rfidCard.credits,
            credits: topupCredits,
            postCredits: postCredits
          },
          customerDetails: {
            ipAddress,
          },
          price: startTopupTransactionDto.topupPrice,
          status: TransactionStatus.Pending,
          createdBy: TransactionCreatedBy.Customer,
        };
        const otherAttributes: any = {}
        if (startTopupTransactionDto.paymentMethod === OnlinePaymentMethod.VisaMastercard) {
          otherAttributes.endUser = {
            initials: startTopupTransactionDto.customerDetails.firstName,
            lastName: startTopupTransactionDto.customerDetails.lastName,
            emailAddress: startTopupTransactionDto.customerDetails.email,
          }
          otherAttributes.address = otherAttributes.invoiceAddress = {
            countryCode: startTopupTransactionDto.customerDetails.countryCode
          }
        }
        Paynl.Transaction.start({
          returnUrl: `${GENERAL_DATA.cashCardWebUrl}?id=${startTopupTransactionDto.cardId}`,
          ipAddress,
          amount: startTopupTransactionDto.topupPrice,
          paymentMethodId: OnlinePaymentMethodID[startTopupTransactionDto.paymentMethod],
          testMode: false,
          orderNumber: transaction._id,
          extra1: transaction._id,
          extra2: startTopupTransactionDto.cardId,
          description: 'customer_topup',
          expireDate: addDate(10, 'm'),
          ...otherAttributes,
        }).subscribe(async (result) => {
          transaction.externalId = result.transactionId;
          transaction.externalDetails = {
            paymentReference: result.paymentReference,
            paymentURL: result.paymentURL,
          };
          await this.transactionService.add(transaction);
          resolve({
            transactionId: result.transactionId,
            paymentUrl: result.paymentURL,
          });
        }, (e) => {
          reject(new Error(e))
        });
      }
      catch (e) {
        reject(e)
      }
    });
  }

  async getTransactionStatus(externalId: string) {
    let transactionStatus = '';
    const externalTransaction = await this.getExternalTransaction(externalId);
    if (externalTransaction.isPending()) transactionStatus = TransactionStatus.Pending;
    if (externalTransaction.isPaid()) transactionStatus = TransactionStatus.Completed;
    if (externalTransaction.isCanceled()) transactionStatus = TransactionStatus.Failed;
    return {
      transactionStatus
    }
  }

  async getTerminalTransactionStatus(getTerminalTransactionStatusDto: GetTerminalTransactionStatusDto) {
    let transactionStatus = '', reason = '';
    let terminalStatusUrl = getTerminalTransactionStatusDto.terminalStatusUrl;
    if (terminalStatusUrl.includes('&timeout')) {
      terminalStatusUrl = terminalStatusUrl.slice(0, terminalStatusUrl.length - 1) + '1';
    }
    const resp = await requestHelper.get(terminalStatusUrl);
    if (resp.status === 'start') transactionStatus = TransactionStatus.Pending;
    else {
      if (parseInt(resp.approved) === 1) transactionStatus = TransactionStatus.Completed;
      else {
        if ((parseInt(resp.error) === 1) || (parseInt(resp.cancelled) === 1)) {
          transactionStatus = TransactionStatus.Failed;
          reason = resp.incidentcodetext;
        }
      }
    }
    return {
      transactionStatus,
      reason
    }
  }

  async updateTransactionStatus(data: any) {
    const { action, order_id: externalId } = data;
    if (['new_ppt', 'cancel'].includes(action)) {
      const externalTransaction = await this.getExternalTransaction(externalId);
      const { extra1: transactionId, extra2: cardId, extra3: extraData } = externalTransaction.statsDetails;
      const [topupTransactionId, freezeOrderId] = extraData ? extraData.split(':') : ['', ''];
      if (action === 'new_ppt') {
        if (externalTransaction.paymentDetails.description === 'order') {
          if (externalTransaction.isPaid()) {
            await this.transactionService.updateByID(transactionId, {
              'externalDetails.cardBrand': (externalTransaction.paymentDetails as any).cardBrand,
              'externalDetails.cardType': (externalTransaction.paymentDetails as any).cardType,
              status: TransactionStatus.Completed,
            });
            if (freezeOrderId) await this.orderService.deleteFreezeOrderByID(freezeOrderId);
          }
        }
        else if (externalTransaction.paymentDetails.description === 'customer_order') {
          if (externalTransaction.isPaid()) {
            await this.transactionService.updateByID(transactionId, {
              status: TransactionStatus.Completed,
            });
          }
        }
        else if (externalTransaction.paymentDetails.description === 'order_and_topup') {
          if (externalTransaction.isPaid()) {
            await this.transactionService.updateByID(transactionId, {
              'externalDetails.cardBrand': (externalTransaction.paymentDetails as any).cardBrand,
              'externalDetails.cardType': (externalTransaction.paymentDetails as any).cardType,
              status: TransactionStatus.Completed,
            });
            const [rfidCard, topupTransaction] = await Promise.all([
              this.rfidCardService.findByID(cardId),
              this.transactionService.findByID(topupTransactionId, 'cardDetails'),
            ]);
            if (topupTransaction.cardDetails?.topup) {
              const topupCredits = roundUptoTwoDecimals(topupTransaction.cardDetails?.topupPrice * RFID_SETTINGS.euroToCredit);
              const postCredits = roundUptoTwoDecimals(rfidCard.credits + topupCredits);
              await Promise.all([
                this.rfidCardService.updateByID(cardId, {
                  purchaseStatus: RFIDCardPurchaseStatus.Purchased,
                  credits: postCredits,
                }),
                this.transactionService.updateByID(topupTransactionId, {
                  creditDetails: {
                    preCredits: rfidCard.credits,
                    credits: topupCredits,
                    postCredits: postCredits,
                  },
                  status: TransactionStatus.Completed,
                })
              ]);
            }
            else if (topupTransaction.cardDetails?.purchase) {
              await Promise.all([
                this.rfidCardService.updateByID(cardId, {
                  purchaseStatus: RFIDCardPurchaseStatus.Purchased,
                }),
                this.transactionService.updateByID(topupTransactionId, {
                  status: TransactionStatus.Completed,
                })
              ]);
            }
          }
          if (freezeOrderId) await this.orderService.deleteFreezeOrderByID(freezeOrderId);
        }
        else if (['user_topup', 'customer_topup'].includes(externalTransaction.paymentDetails.description)) {
          if (externalTransaction.isPaid()) {
            const [rfidCard, topupTransaction] = await Promise.all([
              this.rfidCardService.findByID(cardId),
              this.transactionService.findByID(transactionId, 'cardDetails'),
            ]);
            if (topupTransaction.cardDetails?.topup) {
              const topupCredits = roundUptoTwoDecimals(topupTransaction.cardDetails?.topupPrice * RFID_SETTINGS.euroToCredit);
              const postCredits = roundUptoTwoDecimals(rfidCard.credits + topupCredits);
              await Promise.all([
                this.rfidCardService.updateByID(cardId, {
                  purchaseStatus: RFIDCardPurchaseStatus.Purchased,
                  credits: postCredits,
                }),
                this.transactionService.updateByID(transactionId, {
                  creditDetails: {
                    preCredits: rfidCard.credits,
                    credits: topupCredits,
                    postCredits: postCredits,
                  },
                  status: TransactionStatus.Completed,
                })
              ]);
            }
            else if (topupTransaction.cardDetails?.purchase) {
              await Promise.all([
                this.rfidCardService.updateByID(cardId, {
                  purchaseStatus: RFIDCardPurchaseStatus.Purchased,
                }),
                this.transactionService.updateByID(transactionId, {
                  status: TransactionStatus.Completed,
                })
              ]);
            }
          }
        }
      }
      else if (action === 'cancel') {
        try {
          if (['order', 'customer_order'].includes(externalTransaction.paymentDetails.description)) {
            if (externalTransaction.isCanceled()) {
              await this.transactionService.updateByID(transactionId, {
                status: TransactionStatus.Failed
              });
            }
          }
          else if (externalTransaction.paymentDetails.description === 'order_and_topup') {
            if (externalTransaction.isCanceled()) {
              await Promise.all([
                this.transactionService.updateByID(transactionId, {
                  status: TransactionStatus.Failed
                }),
                this.transactionService.updateByID(topupTransactionId, {
                  status: TransactionStatus.Failed
                })
              ]);
            }
          }
          else if (['user_topup', 'customer_topup'].includes(externalTransaction.paymentDetails.description)) {
            if (externalTransaction.isCanceled()) {
              await this.transactionService.updateByID(transactionId, {
                status: TransactionStatus.Failed
              });
            }
          }
        }
        catch (e) {
          if (e?.status !== 404) throw e;
        }
      }
    }
    return 'TRUE';
  }

  async requestRefund(requestRefundDto: RequestRefundDto) {
    const [rfidCard, transaction] = await Promise.all([
      this.rfidCardService.findByID(requestRefundDto.cardId),
      this.transactionService.findOneByFilter({ 
        type: TransactionType.Refund, 
        card: requestRefundDto.cardId, 
      }),
    ]);
    if (transaction) throw new ConflictException(MESSAGES.REFUND_REQ_ALREADY_SUBMITTED);
    if ((rfidCard.printedId !== requestRefundDto.printedId) || (rfidCard.cvc !== requestRefundDto.cvc)) {
      throw new UnauthorizedException(MESSAGES.RFID_CARD_INVALID_DETAILS);
    }
    if (rfidCard.purchaseStatus === RFIDCardPurchaseStatus.Available) throw new PreconditionFailedException(MESSAGES.RFID_CARD_NOT_PURCHASED);
    if (rfidCard.status === AccountStatus.Disabled) throw new ForbiddenException(MESSAGES.RFID_CARD_DISABLED);
    const refundPrice = roundUptoTwoDecimals(rfidCard.credits * RFID_SETTINGS.creditToEuro - RFID_SETTINGS.refundPrice);
    if (refundPrice < 0) throw new ConflictException(MESSAGES.RFID_CARD_LOW_CREDITS);
    await this.transactionService.add({
      type: TransactionType.Refund,
      paymentMethod: AllPaymentMethod.UnKnown,
      card: requestRefundDto.cardId,
      creditDetails: {
        preCredits: rfidCard.credits,
        credits: rfidCard.credits,
        postCredits: 0
      },
      customerDetails: requestRefundDto.customerDetails,
      price: refundPrice,
      status: TransactionStatus.Pending,
      createdBy: TransactionCreatedBy.Customer,
    });
    return {
      msg: 'Refund request submitted'
    }
  }

  getExternalTransaction(externalId: string): Promise<TransactionResult> {
    return new Promise((resolve, reject) => {
      Paynl.Transaction.get(externalId).subscribe((result) => {
        resolve(result);
      }, (e) => reject(new Error(e)));
    })
  }
}
