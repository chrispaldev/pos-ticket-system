import { Injectable, Res, ForbiddenException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Response } from 'express';
import { User, UserDocument } from './entities';
import { CreateUserDto, UpdateUserDto, ListUserDto, ExportUserDto } from './dto';
import { ILocation, IUser } from '../shared/interfaces';
import { LoginDto } from '../shared/dto';
import { getHashedPassword, getSearchQueryFilters, matchPassword, formatDate, exportCSV } from '../shared/utils';
import { MESSAGES } from '../shared/constants';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async validateCredentials(loginDto: LoginDto) {
    const attributes = 'name username password status'
    const user = await this.findOneAndPopulateByFilter({ username: loginDto.username }, { 
      path: 'location' 
    }, attributes, false);
    if (user) {
      if (user.status === 'disabled') throw new ForbiddenException(MESSAGES.ACCOUNT_DISABLED);
      const match = await matchPassword(user.password, loginDto.password);
      if (!match) return { user: null, jwtPayload: null };
      delete user.password;
      return {
        user,
        jwtPayload: {
          sub: user._id.toString(),
          id: user._id.toString(),
          name: user.name,
          username: user.username,
          locationId: (user.location as ILocation)?._id || '',
          role: 'user',
        }
      };
    }
    return { user: null, jwtPayload: null };
  }

  async validateAccess(id: string) {
    const user = await this.findByID(id, 'status');
    if (user.status === 'disabled') throw new ForbiddenException(MESSAGES.ACCOUNT_DISABLED);
  }

  async create(createUserDto: CreateUserDto) {
    createUserDto.password = await getHashedPassword(createUserDto.password);
    const user = await this.add(createUserDto);
    delete user.password;
    return { user };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if (updateUserDto.password) updateUserDto.password = await getHashedPassword(updateUserDto.password);
    const user = await this.findAndUpdateByID(id, updateUserDto);
    return { user };
  }

  async delete(id: string) {
    await this.deleteByID(id);
    return {
      msg: 'User deleted',
    };
  }

  async get(id: string) {
    const user = await this.findOneAndPopulateByFilter({ _id: id }, { path: 'location' })
    return { user }
  }

  async list(listUserDto: ListUserDto) {
    const filter: any = {};
    if (listUserDto.userId) filter._id = listUserDto.userId;
    const extraFilters = ['status', 'location'];
    extraFilters.forEach(extraFilter => {
      if (listUserDto[extraFilter]) filter[extraFilter] = listUserDto[extraFilter];
    })
    if (listUserDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(listUserDto.searchKeyword, ['name', 'username', 'email', 'terminal']);
    }
    const options = {
      page: listUserDto.page,
      limit: listUserDto.limit,
      sort: { createdAt: -1 },
      populate: { path: 'location', select: 'number name' }
    };
    return await this.listAll(filter, options);
  }

  async export(exportUserDto: ExportUserDto, @Res() response: Response) {
    const filter: any = {};
    if (exportUserDto.userId) filter._id = exportUserDto.userId;
    const extraFilters = ['status', 'location'];
    extraFilters.forEach(extraFilter => {
      if (exportUserDto[extraFilter]) filter[extraFilter] = exportUserDto[extraFilter];
    })
    if (exportUserDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(exportUserDto.searchKeyword, ['name', 'username', 'email', 'terminal']);
    }
    const options = {
      sort: { createdAt: -1 },
      populate: { path: 'location', select: 'number name' }
    };
    const { results: users } = await this.exportAll(filter, options);
    const rows: any = [];
    for (const user of users) {
      rows.push({
        id: user._id,
        name: user.name,
        username: user.username,
        status: user.status,
        location: user.location?.name || 'N/A',
        terminal: user.terminal || 'N/A',
        createdAt: formatDate(user.createdAt),
      });
    }
    exportCSV(rows, 'cashiers', response);
  }

  async add(createUserDto: CreateUserDto): Promise<UserDocument> {
    const user = await this.userModel.create(createUserDto);
    return user.toObject();
  }

  async findByID(id: string, attributes?: any): Promise<IUser> {
    const user = await this.userModel.findOne({ _id: id }).select(attributes).lean();
    if (!user) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return user;
  }

  async findAndUpdateByID(id: string, data: any, attributes?: any): Promise<IUser> {
    const user = await this.userModel
      .findOneAndUpdate({ _id: id }, data, { runValidators: true, new: true })
      .select(attributes)
      .lean();
    if (!user) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return user;
  }

  async findAndDeleteByID(id: string, attributes?: any): Promise<IUser> {
    const user = await this.userModel.findOneAndDelete({ _id: id }).select(attributes).lean();
    if (!user) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return user;
  }

  async findOneByFilter(filter: any, attributes?: any, throwErrorIfNotExists = true): Promise<IUser | null> {
    const user = await this.userModel.findOne(filter).select(attributes).lean();
    if (!user && throwErrorIfNotExists) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return user;
  }

  async findOneAndPopulateByFilter(filter: any, populate: any, attributes?: any, throwErrorIfNotExists = true): Promise<IUser> {
    const user = await this.userModel.findOne(filter).populate(populate).select(attributes).lean()
    if (!user && throwErrorIfNotExists) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return user
  }

  async findByFilter(filter: any, attributes?: any): Promise<IUser[]> {
    return await this.userModel.find(filter).select(attributes).lean();
  }

  async findAndPopulateByFilter(filter: any, populate: any, attributes?: any): Promise<IUser[]> {
    return await this.userModel.find(filter).populate(populate).select(attributes).lean();
  }

  async updateByID(id: string, data: any): Promise<void> {
    const res = await this.userModel.updateOne({ _id: id }, data, { runValidators: true }).lean();
    if (!res.matchedCount) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateOneByFilter(filter: any, data: any): Promise<void> {
    const res = await this.userModel.updateOne(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateByFilter(filter: any, data: any): Promise<void> {
    const res = await this.userModel.updateMany(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteByID(id: string): Promise<void> {
    const res = await this.userModel.deleteOne({ _id: id });
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteOneByFilter(filter: any): Promise<void> {
    const res = await this.userModel.deleteOne(filter);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async estimatedCount(): Promise<number> {
    return await this.userModel.estimatedDocumentCount();
  }

  async count(filter: any): Promise<number> {
    return await this.userModel.countDocuments(filter);
  }

  async listAll(filter: any, options: any): Promise<any> {
    const page = options.page ? parseInt(options.page, 10) : 1
    const limit = options.limit ? parseInt(options.limit, 10) : 10
    const skip = (page - 1) * limit
     const listQuery = this.userModel.find(filter);
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
    const exportQuery = this.userModel.find(filter);
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
