import { Injectable, UnauthorizedException, NotFoundException, InternalServerErrorException  } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { nanoid } from 'nanoid';
import { Model } from 'mongoose';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { Session, SessionDocument } from './entities';
import { AdminService } from '../admin';
import { UserService } from '../user';
import { refreshJwtConfig } from '../config/jwt.config';
import { LoginDto } from '../shared/dto';
import { RefreshTokenDto, DeleteSessionsDto, ListSessionsDto } from './dto';
import { ISession } from '../shared/interfaces';
import { getTokenExpiryDate } from '../shared/utils';
import { MESSAGES, RFID_SETTINGS } from '../shared/constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly adminService: AdminService, 
    private readonly userService: UserService, 
    private readonly jwtService: JwtService,
    @InjectModel(Session.name) private readonly sessionModel: Model<SessionDocument>
  ) {}

  async loginAdmin(loginDto: LoginDto, browserInfo: string) {
    const { admin, jwtPayload } = await this.adminService.validateCredentials(loginDto);
    if (!admin) throw new UnauthorizedException(MESSAGES.INVALID_CREDENTIALS);
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload),
      this.createRefreshToken({...jwtPayload}, browserInfo)
    ]);
    return {
      admin,
      accessToken,
      refreshToken,
    }
  }

  async loginUser(loginDto: LoginDto, browserInfo: string) {
    const { user, jwtPayload } = await this.userService.validateCredentials(loginDto);
    if (!user) throw new UnauthorizedException(MESSAGES.INVALID_CREDENTIALS);
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload),
      this.createRefreshToken({...jwtPayload}, browserInfo)
    ]);
    return {
      user,
      settings: RFID_SETTINGS,
      accessToken,
      refreshToken,
    }
  }

  async refreshToken(refreshToken: string, browserInfo: string) {
    const refreshTokenPayload = await this.jwtService.verifyAsync(refreshToken, refreshJwtConfig);
    if (new Date(refreshTokenPayload.exp * 1000) <= new Date()) throw new UnauthorizedException(MESSAGES.EXPIRED_REFRESH_TOKEN);
    await this.validateAccessAndRefreshToken(refreshToken, refreshTokenPayload);
    const { iat, exp, family, ...user } = refreshTokenPayload;
    const [accessToken, newRefreshToken] = await Promise.all([
      this.jwtService.signAsync(user),
      this.rotateRefreshToken(refreshToken, { ...user, family }, browserInfo)
    ]);
    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshTokenDto: RefreshTokenDto) {
    await this.deleteByFilter({ refreshToken: refreshTokenDto.refreshToken });
    return {
      msg: 'Logged out'
    }
  }

  async logoutAll(userId: string) {
    await this.deleteByFilter({ user: userId });
    return {
      msg: 'Logged out'
    }
  }

  async delete(deleteSessionsDto: DeleteSessionsDto) {
    const filter: any = {}
    if (deleteSessionsDto.userId) filter.user = deleteSessionsDto.userId;
    if (deleteSessionsDto.status === 'active') filter.expiredAt = { $gt: new Date() };
    if (deleteSessionsDto.status === 'expired') filter.expiredAt = { $lte: new Date() };
    await this.deleteByFilter(filter);
    return {
      msg: 'Sessions deleted'
    }
  }

  async list(listSessionsDto: ListSessionsDto) {
    const filter: any = {};
    if (listSessionsDto.userId) filter.user = listSessionsDto.userId;
    if (listSessionsDto.status === 'active') filter.expiredAt = { $gt: new Date() };
    if (listSessionsDto.status === 'expired') filter.expiredAt = { $lte: new Date() };
    const options = {
      page: listSessionsDto.page,
      limit: listSessionsDto.limit,
    };
    return await this.listAll(filter, options);
  }

  async createRefreshToken(user: any, browserInfo: string) {
    if (!user.family) user.family = nanoid()
    const refreshToken = await this.jwtService.signAsync(user, {
      privateKey: refreshJwtConfig.privateKey,
      ...refreshJwtConfig.signOptions,
    });
    await this.add({
      user: user.id,
      refreshToken,
      family: user.family,
      expiredAt: getTokenExpiryDate(refreshJwtConfig.signOptions.expiresIn),
      browserInfo,
    });
    return refreshToken;
  }

  async validateAccessAndRefreshToken(refreshToken: string, refreshTokenPayload: any) {
    if (refreshTokenPayload.role === 'user') await this.userService.validateAccess(refreshTokenPayload.id)
    else await this.adminService.validateAccess(refreshTokenPayload.id)
    const refreshTokens = await this.findByFilter({ user: refreshTokenPayload.id, refreshToken });
    if (!refreshTokens.length) {
      this.deleteByFilter({ user: refreshTokenPayload.id, family: refreshTokenPayload.family })
      throw new UnauthorizedException(MESSAGES.INVALID_REFRESH_TOKEN)
    }
    return true;
  }

  async rotateRefreshToken(refreshToken: string, user: any, browserInfo: string) {
    await this.deleteByFilter({ refreshToken });
    const newRefreshToken = this.createRefreshToken(user, browserInfo);
    return newRefreshToken;
  }

  getBrowserInfo(req: Request) {
    const { ip } = req;
    const userAgent = req.get('user-agent') || 'N/A';
    return `${userAgent} ${ip}`;
  }

  async add(createSessionDto: ISession): Promise<SessionDocument> {
    const session = await this.sessionModel.create(createSessionDto);
    return session;
  }

  async isFoundByID(id: string): Promise<boolean> {
    const session = await this.sessionModel.findOne({ _id: id }).select({ _id: 1 }).lean();
    if (!session) return false;
    return true;
  }

  async findByID(id: string, attributes?: any): Promise<ISession> {
    const session = await this.sessionModel.findOne({ _id: id }).select(attributes).lean();
    if (!session) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return session;
  }

  async findAndUpdateByID(id: string, data: any, attributes?: any): Promise<ISession> {
    const session = await this.sessionModel
      .findOneAndUpdate({ _id: id }, data, { runValidators: true, new: true })
      .select(attributes)
      .lean();
    if (!session) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return session;
  }

  async findAndDeleteByID(id: string, attributes?: any): Promise<ISession> {
    const session = await this.sessionModel.findOneAndDelete({ _id: id }).select(attributes).lean();
    if (!session) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return session;
  }

  async findOneByFilter(filter: any, attributes?: any, throwErrorIfNotExists = false): Promise<ISession | null> {
    const session = await this.sessionModel.findOne(filter).select(attributes).lean();
    if (!session && throwErrorIfNotExists) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    return session;
  }

  async findByFilter(filter: any, attributes?: any): Promise<ISession[]> {
    return await this.sessionModel.find(filter).select(attributes).lean();
  }

  async updateByID(id: string, data: any): Promise<void> {
    const res = await this.sessionModel.updateOne({ _id: id }, data, { runValidators: true }).lean();
    if (!res.matchedCount) throw new NotFoundException(MESSAGES.ENTITY_DOES_NOT_EXIST);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateOneByFilter(filter: any, data: any): Promise<void> {
    const res = await this.sessionModel.updateOne(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async updateByFilter(filter: any, data: any): Promise<void> {
    const res = await this.sessionModel.updateMany(filter, data, { runValidators: true }).lean();
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteByID(id: string): Promise<void> {
    const res = await this.sessionModel.deleteOne({ _id: id });
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteOneByFilter(filter: any): Promise<void> {
    const res = await this.sessionModel.deleteOne(filter);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async deleteByFilter(filter: any): Promise<void> {
    const res = await this.sessionModel.deleteMany(filter);
    if (!res.acknowledged) throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
  }

  async estimatedCount(): Promise<number> {
    return await this.sessionModel.estimatedDocumentCount();
  }

  async count(filter: any): Promise<number> {
    return await this.sessionModel.countDocuments(filter);
  }

  async listAll(filter: any, options: any): Promise<any> {
    const page = options.page ? parseInt(options.page, 10) : 1
    const limit = options.limit ? parseInt(options.limit, 10) : 10
    const skip = (page - 1) * limit
    const listQuery = this.sessionModel.find(filter);
    if (options.populate) listQuery.populate(options.populate);
    if (options.select) listQuery.select(options.select);
    if (options.sort) listQuery.sort(options.sort);
    listQuery.skip(skip).limit(limit).lean();
    const [results, total] = await Promise.all([
      listQuery.exec(),
      this.count(filter)
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
