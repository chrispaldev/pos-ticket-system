import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserModel } from './entities';

@Module({
  imports: [UserModel],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
