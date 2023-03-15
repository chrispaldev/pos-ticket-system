import { Injectable, Res, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Response } from 'express';
import { Kitchen, KitchenDocument } from './entities';
import { CreateKitchenDto, UpdateKitchenDto, ListKitchenDto, ExportKitchenDto } from './dto';
import { IKitchen } from '../shared/interfaces';
import { getSearchQueryFilters, formatDate, exportCSV } from '../shared/utils';
import { MESSAGES } from '../shared/constants';

@Injectable()
export class KitchenService {
  constructor(@InjectModel(Kitchen.name) private readonly kitchenModel: Model<KitchenDocument>) {}

  async create(createKitchenDto: CreateKitchenDto) {
    const kitchen = await this.add(createKitchenDto);
    return { kitchen };
  }

  async update(id: string, updateKitchenDto: UpdateKitchenDto) {
    const kitchen = await this.findAndUpdateByID(id, updateKitchenDto);
    return { kitchen };
  }

  async delete(id: string) {
    await this.deleteByID(id);
    return {
      msg: 'Kitchen deleted',
    };
  }

  async get(id: string) {
    const kitchen = await this.findByID(id);
    return { kitchen };
  }

  async list(listKitchenDto: ListKitchenDto) {
    const filter: any = {};
    if (listKitchenDto.kitchenId) filter._id = listKitchenDto.kitchenId;
    if (listKitchenDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(listKitchenDto.searchKeyword, ['name', 'description']);
    }
    const options = {
      page: listKitchenDto.page,
      limit: listKitchenDto.limit,
      sort: { number: -1 },
    };
    return await this.listAll(filter, options);
  }

  async export(exportKitchenDto: ExportKitchenDto, @Res() response: Response) {
    const filter: any = {};
    if (exportKitchenDto.kitchenId) filter._id = exportKitchenDto.kitchenId;
    if (exportKitchenDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(exportKitchenDto.searchKeyword, ['name', 'description']);
    }
    const options = {
      sort: { number: -1 },
    };
    const { results: kitchens } = await this.exportAll(filter, options);
    const rows: any = [];
    for (const kitchen of kitchens) {
      rows.push({
        id: kitchen._id,
        number: kitchen.number,
        name: kitchen.name,
        description: kitchen.description || 'N/A',
        createdAt: formatDate(kitchen.createdAt),
      });
    }
    exportCSV(rows, 'kitchens', response);
  }

  async add(createKitchenDto: CreateKitchenDto): Promise<KitchenDocument> {
    const kitchen = await this.kitchenModel.create(createKitchenDto);
    return kitchen;
  }

  async findByID(id: string, attributes?: any): Promise<IKitchen> {
    const kitchen = await this.kitchenModel.findOne({ _id: id }).select(attributes).lean();
    if (!kitchen) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return kitchen;
  }

  async findAndUpdateByID(id: string, data: any, attributes?: any): Promise<IKitchen> {
    const kitchen = await this.kitchenModel
      .findOneAndUpdate({ _id: id }, data, { runValidators: true, new: true })
      .select(attributes)
      .lean();
    if (!kitchen) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return kitchen;
  }

  async findAndDeleteByID(id: string, attributes?: any): Promise<IKitchen> {
    const kitchen = await this.kitchenModel.findOneAndDelete({ _id: id }).select(attributes).lean();
    if (!kitchen) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return kitchen;
  }

  async findOneByFilter(filter: any, attributes?: any, throwErrorIfNotExists = false): Promise<IKitchen | null> {
    const kitchen = await this.kitchenModel.findOne(filter).select(attributes).lean();
    if (!kitchen && throwErrorIfNotExists) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return kitchen;
  }

  async findByFilter(filter: any, attributes?: any): Promise<IKitchen[]> {
    return await this.kitchenModel.find(filter).select(attributes).lean();
  }

  async updateByID(id: string, data: any): Promise<void> {
    const res = await this.kitchenModel.updateOne({ _id: id }, data, { runValidators: true }).lean();
    if (!res.matchedCount) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateOneByFilter(filter: any, data: any): Promise<void> {
    const res = await this.kitchenModel.updateOne(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateByFilter(filter: any, data: any): Promise<void> {
    const res = await this.kitchenModel.updateMany(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteByID(id: string): Promise<void> {
    const res = await this.kitchenModel.deleteOne({ _id: id });
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteOneByFilter(filter: any): Promise<void> {
    const res = await this.kitchenModel.deleteOne(filter);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async estimatedCount(): Promise<number> {
    return await this.kitchenModel.estimatedDocumentCount();
  }

  async count(filter: any): Promise<number> {
    return await this.kitchenModel.countDocuments(filter);
  }

  async listAll(filter: any, options: any): Promise<any> {
    const page = options.page ? parseInt(options.page, 10) : 1
    const limit = options.limit ? parseInt(options.limit, 10) : 10
    const skip = (page - 1) * limit
    const listQuery = this.kitchenModel.find(filter);
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
    const exportQuery = this.kitchenModel.find(filter);
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
