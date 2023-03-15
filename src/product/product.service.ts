import { Injectable, Res, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Response } from 'express';
import { Product, ProductDocument } from './entities';
import { CreateProductDto, UpdateProductDto, ListProductDto, ExportProductDto } from './dto';
import { IProduct } from '../shared/interfaces';
import { getSearchQueryFilters, formatDate, exportCSV } from '../shared/utils';
import { MESSAGES } from '../shared/constants';

@Injectable()
export class ProductService {
  constructor(@InjectModel(Product.name) private readonly productModel: Model<ProductDocument>) {}

  async create(createProductDto: CreateProductDto) {
    const product = await this.add(createProductDto);
    return { product };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.findAndUpdateByID(id, updateProductDto);
    return { product };
  }

  async delete(id: string) {
    await this.deleteByID(id);
    return {
      msg: 'Product deleted',
    };
  }

  async get(id: string) {
    const product = await this.findByID(id);
    return { product };
  }

  async list(listProductDto: ListProductDto) {
    const filter: any = {};
    if (listProductDto.productId) filter._id = listProductDto.productId;
    const extraFilters = ['category', 'subCategory', 'kitchen'];
    extraFilters.forEach(extraFilter => {
      if (listProductDto[extraFilter]) filter[extraFilter] = listProductDto[extraFilter];
    });
    if (listProductDto.location) filter.locations = listProductDto.location;
    if (listProductDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(listProductDto.searchKeyword, ['name', 'description']);
    }
    const options = {
      page: listProductDto.page,
      limit: listProductDto.limit,
      sort: { createdAt: -1 },
      populate: [
        { path: 'category', select: 'name' },
        { path: 'subCategory', select: 'name' },
        { path: 'kitchen', select: 'number name' },
        { path: 'locations', select: 'number name' },
      ]
    };
    return await this.listAll(filter, options);
  }

  async export(exportProductDto: ExportProductDto, @Res() response: Response) {
    const filter: any = {};
    if (exportProductDto.productId) filter._id = exportProductDto.productId;
    const extraFilters = ['category', 'subCategory', 'kitchen'];
    extraFilters.forEach(extraFilter => {
      if (exportProductDto[extraFilter]) filter[extraFilter] = exportProductDto[extraFilter];
    });
    if (exportProductDto.location) filter.locations = exportProductDto.location;
    if (exportProductDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(exportProductDto.searchKeyword, ['name', 'description']);
    }
    const options = {
      sort: { createdAt: -1 },
      populate: [
        { path: 'category', select: 'name' },
        { path: 'subCategory', select: 'name' },
        { path: 'kitchen', select: 'number name' },
        { path: 'locations', select: 'number name' },
      ]
    };
    const { results: products } = await this.exportAll(filter, options);
    const rows: any = [];
    for (const product of products) {
      rows.push({
        id: product._id,
        name: product.name,
        description: product.description || 'N/A',
        category: product.category?.name,
        group: product.subCategory?.name || 'N/A',
        kitchen: product.kitchen?.name || 'N/A',
        qtyPerUnit: product.quantityPerUnit || 'N/A',
        'price(€)': product.price.toFixed(2),
        'vat(%)': product.vat.toFixed(2),
        credits: product.credits.toFixed(2),
        coupons: product.coupons.toFixed(2),
        locations: product.locations?.map(location => location.name).join(', '),
        createdAt: formatDate(product.createdAt),
      });
    }
    exportCSV(rows, 'products', response);
  }

  async getProductsByLocation(locationId: string) {
    const products = await this.findAndPopulateByFilter({ locations: locationId }, [
      { path: 'category', select: 'name description' },
      { path: 'subCategory', select: 'name description' },
      { path: 'kitchen', select: 'number name description' },
    ], '-locations');
    return products;
  }

  async add(createProductDto: CreateProductDto): Promise<ProductDocument> {
    const product = await this.productModel.create(createProductDto);
    return product;
  }

  async findByID(id: string, attributes?: any): Promise<IProduct> {
    const product = await this.productModel.findOne({ _id: id }).select(attributes).lean();
    if (!product) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return product;
  }

  async findAndUpdateByID(id: string, data: any, attributes?: any): Promise<IProduct> {
    const product = await this.productModel
      .findOneAndUpdate({ _id: id }, data, { runValidators: true, new: true })
      .select(attributes)
      .lean();
    if (!product) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return product;
  }

  async findAndDeleteByID(id: string, attributes?: any): Promise<IProduct> {
    const product = await this.productModel.findOneAndDelete({ _id: id }).select(attributes).lean();
    if (!product) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return product;
  }

  async findOneByFilter(filter: any, attributes?: any, throwErrorIfNotExists = false): Promise<IProduct | null> {
    const product = await this.productModel.findOne(filter).select(attributes).lean();
    if (!product && throwErrorIfNotExists) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return product;
  }

  async findOneAndPopulateByFilter(filter: any, populate: any, attributes?: any): Promise<IProduct> {
    const user = await this.productModel.findOne(filter).populate(populate).select(attributes).lean()
    if (!user) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return user
  }

  async findByFilter(filter: any, attributes?: any): Promise<IProduct[]> {
    return await this.productModel.find(filter).select(attributes).lean();
  }

  async findAndPopulateByFilter(filter: any, populate: any, attributes?: any): Promise<IProduct[]> {
    return await this.productModel.find(filter).populate(populate).select(attributes).lean();
  }

  async updateByID(id: string, data: any): Promise<void> {
    const res = await this.productModel.updateOne({ _id: id }, data, { runValidators: true }).lean();
    if (!res.matchedCount) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateOneByFilter(filter: any, data: any): Promise<void> {
    const res = await this.productModel.updateOne(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateByFilter(filter: any, data: any): Promise<void> {
    const res = await this.productModel.updateMany(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteByID(id: string): Promise<void> {
    const res = await this.productModel.deleteOne({ _id: id });
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteOneByFilter(filter: any): Promise<void> {
    const res = await this.productModel.deleteOne(filter);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async estimatedCount(): Promise<number> {
    return await this.productModel.estimatedDocumentCount();
  }

  async count(filter: any): Promise<number> {
    return await this.productModel.countDocuments(filter);
  }

  async listAll(filter: any, options: any): Promise<any> {
    const page = options.page ? parseInt(options.page, 10) : 1
    const limit = options.limit ? parseInt(options.limit, 10) : 10
    const skip = (page - 1) * limit
    const listQuery = this.productModel.find(filter);
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
    const exportQuery = this.productModel.find(filter);
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
