import { Injectable, Res, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Response } from 'express';
import { Category, CategoryDocument } from './entities';
import { CreateCategoryDto, UpdateCategoryDto, ListCategoryDto, ExportCategoryDto } from './dto';
import { ICategory, CategoryType } from '../shared/interfaces';
import { getSearchQueryFilters, formatDate, exportCSV } from '../shared/utils';
import { MESSAGES } from '../shared/constants';

@Injectable()
export class CategoryService {
  constructor(@InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const category = await this.add(createCategoryDto);
    return { category };
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findAndUpdateByID(id, updateCategoryDto);
    return { category };
  }

  async delete(id: string) {
    await this.deleteByID(id);
    return {
      msg: 'Category deleted',
    };
  }

  async get(id: string) {
    const category = await this.findByID(id);
    return { category };
  }

  async list(listCategoryDto: ListCategoryDto) {
    const filter: any = {};
    if (listCategoryDto.categoryId) filter._id = listCategoryDto.categoryId;
    if (listCategoryDto.type === CategoryType.Category) filter.parent = null;
    else if (listCategoryDto.type === CategoryType.SubCategory)  filter.parent = { $ne: null };
    if (listCategoryDto.parent) filter.parent = listCategoryDto.parent;
    if (listCategoryDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(listCategoryDto.searchKeyword, ['name', 'description']);
    }
    const options = {
      page: listCategoryDto.page,
      limit: listCategoryDto.limit,
      sort: { createdAt: -1 },
      populate: { path: 'parent', select: 'name' },
    };
    return await this.listAll(filter, options);
  }

  async export(exportCategoryDto: ExportCategoryDto, @Res() response: Response) {
    const filter: any = {};
    if (exportCategoryDto.categoryId) filter._id = exportCategoryDto.categoryId;
    if (exportCategoryDto.type === CategoryType.Category) filter.parent = null;
    else if (exportCategoryDto.type === CategoryType.SubCategory)  filter.parent = { $ne: null };
    if (exportCategoryDto.parent) filter.parent = exportCategoryDto.parent;
    if (exportCategoryDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(exportCategoryDto.searchKeyword, ['name', 'description']);
    }
    const options = {
      sort: { createdAt: -1 },
      populate: { path: 'parent', select: 'name' },
    };
    const { results: categories } = await this.exportAll(filter, options);
    const rows: any = [];
    for (const category of categories) {
      rows.push({
        id: category._id,
        name: category.name,
        description: category.description || 'N/A',
        ...(!exportCategoryDto.type || (exportCategoryDto.type === CategoryType.SubCategory) ? { category: category.parent?.name || 'N/A' } : {}),
        createdAt: formatDate(category.createdAt),
      });
    }
    exportCSV(rows, exportCategoryDto.type === CategoryType.SubCategory ? 'groups' : 'categories', response);
  }

  async add(createCategoryDto: CreateCategoryDto): Promise<CategoryDocument> {
    const category = await this.categoryModel.create(createCategoryDto);
    return category;
  }

  async findByID(id: string, attributes?: any): Promise<ICategory> {
    const category = await this.categoryModel.findOne({ _id: id }).select(attributes).lean();
    if (!category) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return category;
  }

  async findAndUpdateByID(id: string, data: any, attributes?: any): Promise<ICategory> {
    const category = await this.categoryModel
      .findOneAndUpdate({ _id: id }, data, { runValidators: true, new: true })
      .select(attributes)
      .lean();
    if (!category) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return category;
  }

  async findAndDeleteByID(id: string, attributes?: any): Promise<ICategory> {
    const category = await this.categoryModel.findOneAndDelete({ _id: id }).select(attributes).lean();
    if (!category) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return category;
  }

  async findOneByFilter(filter: any, attributes?: any, throwErrorIfNotExists = false): Promise<ICategory | null> {
    const category = await this.categoryModel.findOne(filter).select(attributes).lean();
    if (!category && throwErrorIfNotExists) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return category;
  }

  async findByFilter(filter: any, attributes?: any): Promise<ICategory[]> {
    return await this.categoryModel.find(filter).select(attributes).lean();
  }

  async updateByID(id: string, data: any): Promise<void> {
    const res = await this.categoryModel.updateOne({ _id: id }, data, { runValidators: true }).lean();
    if (!res.matchedCount) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateOneByFilter(filter: any, data: any): Promise<void> {
    const res = await this.categoryModel.updateOne(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateByFilter(filter: any, data: any): Promise<void> {
    const res = await this.categoryModel.updateMany(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteByID(id: string): Promise<void> {
    const res = await this.categoryModel.deleteOne({ _id: id });
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteOneByFilter(filter: any): Promise<void> {
    const res = await this.categoryModel.deleteOne(filter);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async estimatedCount(): Promise<number> {
    return await this.categoryModel.estimatedDocumentCount();
  }

  async count(filter: any): Promise<number> {
    return await this.categoryModel.countDocuments(filter);
  }

  async listAll(filter: any, options: any): Promise<any> {
    const page = options.page ? parseInt(options.page, 10) : 1
    const limit = options.limit ? parseInt(options.limit, 10) : 10
    const skip = (page - 1) * limit
    const listQuery = this.categoryModel.find(filter);
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
    const exportQuery = this.categoryModel.find(filter);
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
