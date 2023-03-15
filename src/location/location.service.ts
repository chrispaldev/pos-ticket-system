import { Injectable, Res, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Response } from 'express';
import { Location, LocationDocument } from './entities';
import { CreateLocationDto, UpdateLocationDto, ListLocationDto, ExportLocationDto } from './dto';
import { EventService } from '../event';
import { ProductService } from '../product';
import { ILocation, PaymentMethod } from '../shared/interfaces';
import { getSearchQueryFilters, formatDate, exportCSV } from '../shared/utils';
import { MESSAGES, MENUS } from '../shared/constants';

@Injectable()
export class LocationService {
  constructor(
    private readonly eventService: EventService,
    private readonly productService: ProductService, 
    @InjectModel(Location.name) private readonly locationModel: Model<LocationDocument>
  ) {}

  async create(createLocationDto: CreateLocationDto) {
    const location = await this.add(createLocationDto);
    return { location };
  }

  async update(id: string, updateLocationDto: UpdateLocationDto) {
    const location = await this.findAndUpdateByID(id, updateLocationDto);
    return { location };
  }

  async delete(id: string) {
    await this.deleteByID(id);
    return {
      msg: 'Location deleted',
    };
  }

  async get(id: string) {
    const location = await this.findByID(id);
    return { location };
  }

  async list(listLocationDto: ListLocationDto) {
    const filter: any = {};
    if (listLocationDto.locationId) filter._id = listLocationDto.locationId;
    if (listLocationDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(listLocationDto.searchKeyword, ['name', 'description']);
    }
    const options = {
      page: listLocationDto.page,
      limit: listLocationDto.limit,
      sort: { number: -1 },
    };
    return await this.listAll(filter, options);
  }

  async export(exportLocationDto: ExportLocationDto, @Res() response: Response) {
    const filter: any = {};
    if (exportLocationDto.locationId) filter._id = exportLocationDto.locationId;
    if (exportLocationDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(exportLocationDto.searchKeyword, ['name', 'description']);
    }
    const options = {
      sort: { number: -1 },
    };
    const { results: locations } = await this.exportAll(filter, options);
    const rows: any = [];
    for (const location of locations) {
      rows.push({
        id: location._id,
        number: location.number,
        name: location.name,
        description: location.description || 'N/A',
        paymentMethods: location.paymentMethods,
        createdAt: formatDate(location.createdAt),
      });
    }
    exportCSV(rows, 'locations', response);
  }

  getExtras() {
    return {
      paymentMethods: Object.values(PaymentMethod),
      menus: [ ...MENUS ],
    }
  }

  async getEntitiesByUser(locationId: string) {
    const [events, products] = await Promise.all([
      this.eventService.getEventsByLocation(locationId as string),
      this.productService.getProductsByLocation(locationId as string)
    ])
    return { events, products }
  }

  async add(createAdminDto: CreateLocationDto): Promise<LocationDocument> {
    const location = await this.locationModel.create(createAdminDto);
    return location;
  }

  async findByID(id: string, attributes?: any): Promise<ILocation> {
    const location = await this.locationModel.findOne({ _id: id }).select(attributes).lean();
    if (!location) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return location;
  }

  async findAndUpdateByID(id: string, data: any, attributes?: any): Promise<ILocation> {
    const location = await this.locationModel
      .findOneAndUpdate({ _id: id }, data, { runValidators: true, new: true })
      .select(attributes)
      .lean();
    if (!location) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return location;
  }

  async findAndDeleteByID(id: string, attributes?: any): Promise<ILocation> {
    const location = await this.locationModel.findOneAndDelete({ _id: id }).select(attributes).lean();
    if (!location) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return location;
  }

  async findOneByFilter(filter: any, attributes?: any, throwErrorIfNotExists = false): Promise<ILocation | null> {
    const location = await this.locationModel.findOne(filter).select(attributes).lean();
    if (!location && throwErrorIfNotExists) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return location;
  }

  async findByFilter(filter: any, attributes?: any): Promise<ILocation[]> {
    return await this.locationModel.find(filter).select(attributes).lean();
  }

  async updateByID(id: string, data: any): Promise<void> {
    const res = await this.locationModel.updateOne({ _id: id }, data, { runValidators: true }).lean();
    if (!res.matchedCount) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateOneByFilter(filter: any, data: any): Promise<void> {
    const res = await this.locationModel.updateOne(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateByFilter(filter: any, data: any): Promise<void> {
    const res = await this.locationModel.updateMany(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteByID(id: string): Promise<void> {
    const res = await this.locationModel.deleteOne({ _id: id });
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteOneByFilter(filter: any): Promise<void> {
    const res = await this.locationModel.deleteOne(filter);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async estimatedCount(): Promise<number> {
    return await this.locationModel.estimatedDocumentCount();
  }

  async count(filter: any): Promise<number> {
    return await this.locationModel.countDocuments(filter);
  }

  async listAll(filter: any, options: any): Promise<any> {
    const page = options.page ? parseInt(options.page, 10) : 1
    const limit = options.limit ? parseInt(options.limit, 10) : 10
    const skip = (page - 1) * limit
    const listQuery = this.locationModel.find(filter);
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
    const exportQuery = this.locationModel.find(filter);
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
