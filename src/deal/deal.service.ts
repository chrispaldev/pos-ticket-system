import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ticket, TicketDocument } from './entities';
import { CreateTicketDto, UpdateTicketDto, ListTicketDto, GetTicketSlotDto, BookTicketSlotDto, RedeemQRVoucherDto } from './dto';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ITicket, ITicketTrack, OnlinePaymentMethod, OnlinePaymentMethodID, TransactionCreatedBy } from '../shared/interfaces';
import { TransactionService } from '../transaction';
import { PaymentService } from '../payment';
import { AllPaymentMethod, TransactionStatus, TransactionType, UserSession } from '../shared/interfaces';
import { createMongoId, generateTicketAndSendEmail, getDayjsDate, getNLDayjsDate, getNumericNanoId, getSearchQueryFilters, requestHelper, roundUptoTwoDecimals } from '../shared/utils';
import { MESSAGES } from '../shared/constants';

@Injectable()
export class DealService {
  constructor(
    private readonly configService: ConfigService,
    private readonly transactionService: TransactionService,
    private readonly paymentService: PaymentService,
    @InjectModel(Ticket.name) private readonly ticketModel: Model<TicketDocument>
  ) {}

  async create(createTicketDto: CreateTicketDto) {
    const trackIds: number[] = [];
    createTicketDto.tracks.forEach((track: any) => {
      if (trackIds.includes(track.id)) throw new BadRequestException(MESSAGES.DUPLICATE_TRACK_IDS);
      trackIds.push(track.id);
    });
    const ticket = await this.add(createTicketDto);
    return { ticket };
  }

  async update(id: string, updateTicketDto: UpdateTicketDto) {
    const trackIds: number[] = [];
    updateTicketDto.tracks.forEach((track: any) => {
      if (trackIds.includes(track.id)) throw new BadRequestException(MESSAGES.DUPLICATE_TRACK_IDS);
      trackIds.push(track.id);
    });
    const ticket = await this.findAndUpdateByID(id, updateTicketDto);
    return { ticket };
  }

  async delete(id: string) {
    await this.deleteByID(id);
    return {
      msg: 'Ticket deleted',
    };
  }

  async get(id: string) {
    const ticket = await this.findByID(id);
    return { ticket };
  }

  async list(listTicketDto: ListTicketDto) {
    const filter: any = {};
    if (listTicketDto.ticketId) filter._id = listTicketDto.ticketId;
    if (listTicketDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(listTicketDto.searchKeyword, ['name', 'description']);
    }
    const options = {
      page: listTicketDto.page,
      limit: listTicketDto.limit,
      sort: { createdAt: -1 },
    };
    return await this.listAll(filter, options);
  }

  async getTicketSlots(getTicketSlotDto: GetTicketSlotDto) {
    const [ticket, transactions]: [any, any] = await Promise.all([
      this.findOneByFilter({}, undefined, true),
      this.transactionService.findByFilter({
        type: TransactionType.Ticket,
        'ticketDetails.slots': { 
          $elemMatch: { 
            date: getTicketSlotDto.date,
          }
        },
        status: { $ne: TransactionStatus.Failed },
      })
    ]);
    if (!ticket) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    const isValid = this.isTicketDateValid(ticket, getTicketSlotDto.date);
    ticket.tracks.forEach(track => {
      if (!isValid) track.slots = [];
      else track.slots = this.getTicketTrackSlots(getTicketSlotDto.date, track, transactions);
    });
    return {
      ticket
    }
  }

  async bookTicketSlots(bookTicketSlotDto: BookTicketSlotDto, ipAddress?: string) {
    const ticket: any = await this.findOneByFilter({}, undefined, true);
    if (!ticket) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    await this.validateTicketTrackSlotsAvailability(ticket, bookTicketSlotDto.slots);
    const transaction: any = {
      _id: createMongoId(),
      type: TransactionType.Ticket,
      description: bookTicketSlotDto.description,
      paymentMethod: bookTicketSlotDto.paymentMethod,
      code: `TK${getNumericNanoId(18)}`,
      ticket: ticket._id,
      ticketDetails: {
        slots: bookTicketSlotDto.slots
      },
      customerDetails: bookTicketSlotDto.customerDetails,
      price: this.getTicketTrackSlotsPrice(ticket.tracks, bookTicketSlotDto.slots),
      status: TransactionStatus.Pending,
      createdBy: TransactionCreatedBy.Customer,
      paymentMethodId: OnlinePaymentMethodID[bookTicketSlotDto.paymentMethod],
      ipAddress,
    }
    // await generateTicketAndSendEmail(transaction);
    const ticketTransaction = await this.paymentService.startTicketTransactionByCustomer(transaction);
    await this.transactionService.add(ticketTransaction);
    return { 
      transactionId: ticketTransaction.externalId,
      paymentUrl: ticketTransaction.externalDetails.paymentURL,
    };
  }

  async getQRVoucherInfo(code: string) {
    const resp = await requestHelper.post(this.configService.get<string>('SANMAX_API_BASEURL') + '/ticket/get-ticket-by-code', {
      ticketCode: code,
      apiKey: this.configService.get<string>('SANMAX_API_KEY')
    })
    if (resp.status === 'error') throw new BadRequestException(resp.message);
    if (!resp.info?.ticket?.length) throw new BadRequestException(MESSAGES.INTERNAL_SERVER_ERROR);
    if (resp.info.ticket[0].scanned) {
      return {
        alreadyRedeemed: true,
        info: {
          redeemedAt: resp.info.ticket[0].scanned
        }
      }
    }
    return { 
      alreadyRedeemed: false,
      info: {
        uuid: resp.info.ticket[0].uuid,
        code: resp.info.ticket[0].code,
        variant: resp.info.ticket[0].variant,
        order: resp.info.ticket[0].order,
      }
    }
  }

  async redeemQRVoucher(redeemQRVoucherDto: RedeemQRVoucherDto, user: UserSession) {
    const resp = await requestHelper.post(this.configService.get<string>('SANMAX_API_BASEURL') + '/qr/scan', {
      code: redeemQRVoucherDto.code,
      apiKey: this.configService.get<string>('SANMAX_API_KEY')
    });
    if (resp.status === 'error') {
      if (resp.info) throw new BadRequestException(MESSAGES.QR_VOUCHER_ALREADY_REDEEMED);
      throw new BadRequestException(resp.message);
    }
    await this.transactionService.add({
      type: TransactionType.Deal,
      paymentMethod: AllPaymentMethod.UnKnown,
      code: redeemQRVoucherDto.code,
      dealDetails: {
        uuid: resp.info.uuid,
        code: resp.info.code,
        variant: resp.info.variant,
        order: resp.info.order,
      },
      price: parseFloat(resp.info.variant.price),
      status: TransactionStatus.Completed,
      location: user.locationId,
      user: user.id,
    });
    return { 
      msg: 'QR Voucher redeemed successfully'
    }
  }

  async quickRedeemQRVoucher(redeemQRVoucherDto: RedeemQRVoucherDto, user: UserSession) {
    const resp = await requestHelper.post(this.configService.get<string>('SANMAX_API_BASEURL') + '/qr/scan', {
      code: redeemQRVoucherDto.code,
      apiKey: this.configService.get<string>('SANMAX_API_KEY')
    });
    if (resp.status === 'error') {
      if (resp.info) {
        return {
          alreadyRedeemed: true,
          info: {
            redeemedAt: resp.info.scanned
          }
        }
      }
      throw new BadRequestException(resp.message);
    }
    await this.transactionService.add({
      type: TransactionType.Deal,
      paymentMethod: AllPaymentMethod.UnKnown,
      code: redeemQRVoucherDto.code,
      dealDetails: {
        uuid: resp.info.uuid,
        code: resp.info.code,
        variant: resp.info.variant,
        order: resp.info.order,
      },
      price: parseFloat(resp.info.variant.price),
      status: TransactionStatus.Completed,
      location: user.locationId,
      user: user.id,
    });
    return { 
      alreadyRedeemed: false,
      info: {
        uuid: resp.info.uuid,
        code: resp.info.code,
        variant: resp.info.variant,
        order: resp.info.order,
      }
    }
  }

  async add(createTicketDto: CreateTicketDto): Promise<TicketDocument> {
    const ticket = await this.ticketModel.create(createTicketDto);
    return ticket;
  }

  async findByID(id: string, attributes?: any): Promise<ITicket> {
    const ticket = await this.ticketModel.findOne({ _id: id }).select(attributes).lean();
    if (!ticket) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return ticket;
  }

  async findAndUpdateByID(id: string, data: any, attributes?: any): Promise<ITicket> {
    const ticket = await this.ticketModel
      .findOneAndUpdate({ _id: id }, data, { runValidators: true, new: true })
      .select(attributes)
      .lean();
    if (!ticket) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return ticket;
  }

  async findAndDeleteByID(id: string, attributes?: any): Promise<ITicket> {
    const ticket = await this.ticketModel.findOneAndDelete({ _id: id }).select(attributes).lean();
    if (!ticket) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return ticket;
  }

  async findOneByFilter(filter: any, attributes?: any, throwErrorIfNotExists = false): Promise<ITicket | null> {
    const ticket = await this.ticketModel.findOne(filter).select(attributes).lean();
    if (!ticket && throwErrorIfNotExists) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return ticket;
  }

  async findByFilter(filter: any, attributes?: any): Promise<ITicket[]> {
    return await this.ticketModel.find(filter).select(attributes).lean();
  }

  async updateByID(id: string, data: any): Promise<void> {
    const res = await this.ticketModel.updateOne({ _id: id }, data, { runValidators: true }).lean();
    if (!res.matchedCount) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateOneByFilter(filter: any, data: any): Promise<void> {
    const res = await this.ticketModel.updateOne(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateByFilter(filter: any, data: any): Promise<void> {
    const res = await this.ticketModel.updateMany(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteByID(id: string): Promise<void> {
    const res = await this.ticketModel.deleteOne({ _id: id });
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteOneByFilter(filter: any): Promise<void> {
    const res = await this.ticketModel.deleteOne(filter);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async estimatedCount(): Promise<number> {
    return await this.ticketModel.estimatedDocumentCount();
  }

  async count(filter: any): Promise<number> {
    return await this.ticketModel.countDocuments(filter);
  }

  async listAll(filter: any, options: any): Promise<any> {
    const page = options.page ? parseInt(options.page, 10) : 1
    const limit = options.limit ? parseInt(options.limit, 10) : 10
    const skip = (page - 1) * limit
    const listQuery = this.ticketModel.find(filter);
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

  getUnFlaggedTicketTrackSlots(date: string, track: ITicketTrack) {
    const slots: any = [];
    const { startTime, endTime, minsPerSlot } = track;
    let startSlotTime = getNLDayjsDate(new Date(date)).hour(parseInt(startTime.split(':')[0])).minute(parseInt(startTime.split(':')[1]));
    const endSlotTime = getNLDayjsDate(new Date(date)).hour(parseInt(endTime.split(':')[0])).minute(parseInt(endTime.split(':')[1]));
    const currentTime = getNLDayjsDate();
    while (startSlotTime.isBefore(endSlotTime)) {
      const beginSlotTime = startSlotTime;
      startSlotTime = startSlotTime.add(minsPerSlot, 'm'); 
      slots.push({
        startTime: beginSlotTime.format('HH:mm'),
        endTime: startSlotTime.format('HH:mm'),
        available: currentTime.isBefore(beginSlotTime),
      });
    }
    return slots;
  }

  getTicketTrackSlots(date: string, track: ITicketTrack, transactions: any) {
    const bookedSlots: any = [];
    const slots = this.getUnFlaggedTicketTrackSlots(date, track);
    transactions.forEach(transaction => {
      bookedSlots.push(...transaction.ticketDetails.slots.filter(slot => slot.trackId === track.id));
    });
    slots.forEach(slot => {
      if (slot.available) {
        bookedSlots.forEach(bookedSlot => {
          if ((bookedSlot.startTime === slot.startTime) && (bookedSlot.endTime === slot.endTime)) slot.available = false;
        });
      }
    });
    return slots;
  }

  async validateTicketTrackSlotsAvailability(ticket: ITicket, slots: any) {
    slots.forEach(slot => {
      const track = ticket.tracks.find(track => track.id === slot.trackId);
      if (!track) throw new BadRequestException(MESSAGES.INVALID_TRACK_ID);
      const isValid = this.isTicketDateValid(ticket, slot.date);
      if (!isValid) throw new BadRequestException(`Track Slot ${slot.startTime} - ${slot.endTime} on ${slot.date} is unavailable`);
      const dateSlots = this.getUnFlaggedTicketTrackSlots(slot.date, track);
      const matchedSlot = dateSlots.find(dateSlot => ((slot.startTime === dateSlot.startTime) && (slot.endTime === dateSlot.endTime) && dateSlot.available));
      if (!matchedSlot) throw new BadRequestException(`Track Slot ${slot.startTime} - ${slot.endTime} on ${slot.date} is unavailable`);
    });
    for (const slot of slots) {
      const transaction = await this.transactionService.findOneByFilter({
        type: TransactionType.Ticket,
        'ticketDetails.slots': { 
          $elemMatch: { 
            trackId: slot.trackId, 
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
          }
        },
        status: { $ne: TransactionStatus.Failed },
      }, '_id');
      if (transaction) {
        throw new BadRequestException(`Track Slot ${slot.startTime} - ${slot.endTime} on ${slot.date} is already booked`);
      }
    }
  }

  isTicketDateValid(ticket: ITicket, date: string) { 
    const validFrom = new Date(ticket.validFrom);
    const validTill = new Date(ticket.validTill);
    const ticketDate = new Date(date).toISOString().split('T')[0];
    const currentDate = new Date().toISOString().split('T')[0];
    if (getDayjsDate(validFrom).isAfter(ticketDate) || (getDayjsDate(validTill).isBefore(ticketDate))) return false;
    if (getDayjsDate(currentDate).isAfter(ticketDate)) return false;
    return true;
  }

  getTicketTrackSlotsPrice(tracks: ITicketTrack[], slots: any) {
    let price = 0;
    slots.forEach(slot => {
      const track = tracks.find(track => track.id === slot.trackId);
      price += track.promotionPrice || track.price;
    });
    return roundUptoTwoDecimals(price);
  }
}
