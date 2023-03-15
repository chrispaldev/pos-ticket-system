import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { accessJwtConfig } from '../config/jwt.config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SessionModel } from './entities';
import { AuthController } from './auth.controller';
import { AdminModule } from '../admin';
import { UserModule } from '../user';

@Module({
  imports: [
    PassportModule,
    JwtModule.register(accessJwtConfig),
    SessionModel,
    AdminModule,
    UserModule
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
