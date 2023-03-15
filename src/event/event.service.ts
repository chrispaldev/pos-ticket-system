import { Injectable, Res } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Response } from 'express';
import { Event, EventDocument } from './entities';
import { CreateEventDto, UpdateEventDto, ListEventDto, ExportEventDto } from './dto';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { IEvent } from '../shared/interfaces';
import { getSearchQueryFilters, formatDate, exportCSV } from '../shared/utils';
import { MESSAGES } from '../shared/constants';

@Injectable()
export class EventService {
  constructor(@InjectModel(Event.name) private readonly eventModel: Model<EventDocument>) {}

  async create(createEventDto: CreateEventDto) {
    const event = await this.add(createEventDto);
    return { event };
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    const event = await this.findAndUpdateByID(id, updateEventDto);
    return { event };
  }

  async delete(id: string) {
    await this.deleteByID(id);
    return {
      msg: 'Event deleted',
    };
  }

  async get(id: string) {
    const event = await this.findByID(id);
    return { event };
  }

  async list(listEventDto: ListEventDto) {
    const filter: any = {};
    if (listEventDto.eventId) filter._id = listEventDto.eventId;
    if (listEventDto.location) filter.locations = listEventDto.location;
    if (listEventDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(listEventDto.searchKeyword, ['name', 'description']);
    }
    const options = {
      page: listEventDto.page,
      limit: listEventDto.limit,
      sort: { createdAt: -1 },
      populate: { path: 'locations', select: 'number name' },
    };
    return await this.listAll(filter, options);
  }

  async export(exportEventDto: ExportEventDto, @Res() response: Response) {
    const filter: any = {};
    if (exportEventDto.eventId) filter._id = exportEventDto.eventId;
    if (exportEventDto.location) filter.locations = exportEventDto.location;
    if (exportEventDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(exportEventDto.searchKeyword, ['name', 'description']);
    }
    const options = {
      sort: { createdAt: -1 },
      populate: { path: 'locations', select: 'number name' },
    };
    const { results: events } = await this.exportAll(filter, options);
    const rows: any = [];
    for (const event of events) {
      rows.push({
        id: event._id,
        name: event.name,
        description: event.description || 'N/A',
        'price(€)': event.price.toFixed(2),
        'vat(%)': event.vat.toFixed(2),
        credits: event.credits.toFixed(2),
        coupons: event.coupons.toFixed(2),
        locations: event.locations?.map(location => location.name).join(', '),
        createdAt: formatDate(event.createdAt),
      });
    }
    exportCSV(rows, 'events', response);
  }

  async getEventsByLocation(locationId: string) {
    const events = await this.findByFilter({ locations: locationId })
    return events
  }

  async add(createEventDto: CreateEventDto): Promise<EventDocument> {
    const event = await this.eventModel.create(createEventDto);
    return event;
  }

  async findByID(id: string, attributes?: any): Promise<IEvent> {
    const event = await this.eventModel.findOne({ _id: id }).select(attributes).lean();
    if (!event) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return event;
  }

  async findAndUpdateByID(id: string, data: any, attributes?: any): Promise<IEvent> {
    const event = await this.eventModel
      .findOneAndUpdate({ _id: id }, data, { runValidators: true, new: true })
      .select(attributes)
      .lean();
    if (!event) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return event;
  }

  async findAndDeleteByID(id: string, attributes?: any): Promise<IEvent> {
    const event = await this.eventModel.findOneAndDelete({ _id: id }).select(attributes).lean();
    if (!event) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return event;
  }

  async findOneByFilter(filter: any, attributes?: any, throwErrorIfNotExists = false): Promise<IEvent | null> {
    const event = await this.eventModel.findOne(filter).select(attributes).lean();
    if (!event && throwErrorIfNotExists) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return event;
  }

  async findByFilter(filter: any, attributes?: any): Promise<IEvent[]> {
    return await this.eventModel.find(filter).select(attributes).lean();
  }

  async updateByID(id: string, data: any): Promise<void> {
    const res = await this.eventModel.updateOne({ _id: id }, data, { runValidators: true }).lean();
    if (!res.matchedCount) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateOneByFilter(filter: any, data: any): Promise<void> {
    const res = await this.eventModel.updateOne(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateByFilter(filter: any, data: any): Promise<void> {
    const res = await this.eventModel.updateMany(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteByID(id: string): Promise<void> {
    const res = await this.eventModel.deleteOne({ _id: id });
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteOneByFilter(filter: any): Promise<void> {
    const res = await this.eventModel.deleteOne(filter);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async estimatedCount(): Promise<number> {
    return await this.eventModel.estimatedDocumentCount();
  }

  async count(filter: any): Promise<number> {
    return await this.eventModel.countDocuments(filter);
  }

  async listAll(filter: any, options: any): Promise<any> {
    const page = options.page ? parseInt(options.page, 10) : 1
    const limit = options.limit ? parseInt(options.limit, 10) : 10
    const skip = (page - 1) * limit
    const listQuery = this.eventModel.find(filter);
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
    const exportQuery = this.eventModel.find(filter);
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
