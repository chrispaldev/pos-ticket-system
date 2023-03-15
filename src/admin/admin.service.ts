import { Injectable, NotFoundException, InternalServerErrorException, PreconditionFailedException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin, AdminDocument } from './entities';
import { CreateAdminDto, UpdateAdminDto, UpdateAdminProfileDto, UpdatePasswordDto, ListAdminDto } from './dto';
import { getHashedPassword, matchPassword, getSearchQueryFilters } from '../shared/utils';
import { LoginDto } from '../shared/dto';
import { IAdmin } from '../shared/interfaces';
import { MESSAGES } from '../shared/constants';

@Injectable()
export class AdminService {
  constructor(@InjectModel(Admin.name) private readonly adminModel: Model<AdminDocument>) {}

  async validateCredentials(loginDto: LoginDto) {
    const attributes = 'name username email password role status';
    const admin = await this.findOneByFilter({ username: loginDto.username }, attributes);
    if (admin) {
      if (admin.status === 'disabled') throw new ForbiddenException(MESSAGES.ACCOUNT_DISABLED);
      const match = await matchPassword(admin.password, loginDto.password);
      if (!match) return { admin: null, jwtPayload: null };
      delete admin.password;
      return {
        admin,
        jwtPayload: {
          sub: admin._id.toString(),
          id: admin._id.toString(),
          name: admin.name,
          username: admin.username,
          role: admin.role,
        }
      };
    }
    return { admin: null, jwtPayload: null };
  }

  async validateAccess(id: string) {
    const admin = await this.findByID(id, 'status');
    if (admin.status === 'disabled') throw new ForbiddenException(MESSAGES.ACCOUNT_DISABLED);
  }

  async create(createAdminDto: CreateAdminDto) {
    createAdminDto.password = await getHashedPassword(createAdminDto.password);
    const admin = await this.add(createAdminDto);
    delete admin.password;
    return { admin };
  }

  async update(id: string, updateAdminDto: UpdateAdminDto) {
    if (updateAdminDto.password) updateAdminDto.password = await getHashedPassword(updateAdminDto.password);
    const admin = await this.findAndUpdateByID(id, updateAdminDto);
    return { admin };
  }

  async updateProfile(id: string, updateAdminProfileDto: UpdateAdminProfileDto) {
    const admin = await this.findAndUpdateByID(id, updateAdminProfileDto);
    return { admin };
  }

  async updatePassword(id: string, updatePasswordDto: UpdatePasswordDto) {
    const admin = await this.findByID(id, { password: 1 });
    const match = await matchPassword(admin.password, updatePasswordDto.currentPassword);
    if (!match) throw new PreconditionFailedException(MESSAGES.INCORRECT_PASSWORD);
    await this.updateByID(id, {
      password: await getHashedPassword(updatePasswordDto.newPassword),
    });
    return {
      msg: 'Password updated',
    };
  }

  async delete(id: string) {
    await this.deleteByID(id);
    return {
      msg: 'Admin deleted',
    };
  }

  async get(id: string) {
    const admin = await this.findByID(id);
    return { admin };
  }

  async list(listAdminDto: ListAdminDto) {
    const filter: any = {};
    if (listAdminDto.adminId) filter._id = listAdminDto.adminId;
    const extraFilters = ['status', 'role'];
    extraFilters.forEach(extraFilter => {
      if (listAdminDto[extraFilter]) filter[extraFilter] = listAdminDto[extraFilter];
    })
    if (listAdminDto.searchKeyword) {
      filter['$or'] = getSearchQueryFilters(listAdminDto.searchKeyword, ['name', 'username', 'email']);
    }
    const options = {
      page: listAdminDto.page,
      limit: listAdminDto.limit,
      sort: { createdAt: -1 },
    };
    return await this.listAll(filter, options);
  }

  async add(createAdminDto: CreateAdminDto): Promise<AdminDocument> {
    const admin = await this.adminModel.create(createAdminDto);
    return admin;
  }

  async findByID(id: string, attributes?: any): Promise<IAdmin> {
    const admin = await this.adminModel.findOne({ _id: id }).select(attributes).lean();
    if (!admin) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return admin;
  }

  async findAndUpdateByID(id: string, data: any, attributes?: any): Promise<IAdmin> {
    const admin = await this.adminModel
      .findOneAndUpdate({ _id: id }, data, { runValidators: true, new: true })
      .select(attributes)
      .lean();
    if (!admin) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return admin;
  }

  async findAndDeleteByID(id: string, attributes?: any): Promise<IAdmin> {
    const admin = await this.adminModel.findOneAndDelete({ _id: id }).select(attributes).lean();
    if (!admin) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return admin;
  }

  async findOneByFilter(filter: any, attributes?: any, throwErrorIfNotExists = false): Promise<IAdmin | null> {
    const admin = await this.adminModel.findOne(filter).select(attributes).lean();
    if (!admin && throwErrorIfNotExists) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return admin;
  }

  async findByFilter(filter: any, attributes?: any): Promise<IAdmin[]> {
    return await this.adminModel.find(filter).select(attributes).lean();
  }

  async updateByID(id: string, data: any): Promise<void> {
    const res = await this.adminModel.updateOne({ _id: id }, data, { runValidators: true }).lean();
    if (!res.matchedCount) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateOneByFilter(filter: any, data: any): Promise<void> {
    const res = await this.adminModel.updateOne(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateByFilter(filter: any, data: any): Promise<void> {
    const res = await this.adminModel.updateMany(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteByID(id: string): Promise<void> {
    const res = await this.adminModel.deleteOne({ _id: id });
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteOneByFilter(filter: any): Promise<void> {
    const res = await this.adminModel.deleteOne(filter);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async estimatedCount(): Promise<number> {
    return await this.adminModel.estimatedDocumentCount();
  }

  async count(filter: any): Promise<number> {
    return await this.adminModel.countDocuments(filter);
  }

  async listAll(filter: any, options: any): Promise<any> {
    const page = options.page ? parseInt(options.page, 10) : 1
    const limit = options.limit ? parseInt(options.limit, 10) : 10
    const skip = (page - 1) * limit
    const listQuery = this.adminModel.find(filter);
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
