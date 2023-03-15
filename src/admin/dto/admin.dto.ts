import { IsNotEmpty, IsString, IsEmail, MinLength, IsOptional, IsNumber, Min, Max, IsEnum, MaxLength, IsMongoId } from 'class-validator';
import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { Match } from '../../shared/decorators';
import { AdminRole, AccountStatus } from '../../shared/interfaces';

export class CreateAdminDto {
  @ApiProperty({ minLength: 4, maxLength: 25 })
  @MinLength(4)
  @MaxLength(25)
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ minLength: 4, maxLength: 25 })
  @Type(() => String)
  @Transform(({ value }) => value.toLowerCase())
  @MinLength(4)
  @MaxLength(25)
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ minLength: 8 })
  @MinLength(8)
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ required: false, enum: AccountStatus })
  @IsEnum(AccountStatus)
  @IsOptional()
  status: AccountStatus;
}

export class UpdateAdminDto extends PartialType(CreateAdminDto) {}

export class UpdateAdminProfileDto extends PartialType(PickType(CreateAdminDto, ['name', 'username', 'email'] as const)) {}

export class UpdatePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ minLength: 8 })
  @MinLength(8)
  @IsString()
  @IsNotEmpty()
  newPassword: string;

  @ApiProperty({ minLength: 8 })
  @Match('newPassword')
  @MinLength(8)
  @IsString()
  @IsNotEmpty()
  confirmNewPassword: string;
}

export class ListAdminDto {
  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  adminId?: string;

  @ApiProperty({ required: false, enum: AdminRole })
  @IsEnum(AdminRole)
  @IsOptional()
  role?: AdminRole;

  @ApiProperty({ required: false, enum: AccountStatus })
  @IsEnum(AccountStatus)
  @IsOptional()
  status?: AccountStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  searchKeyword?: string;

  @ApiProperty({ required: false, default: 1 })
  @Type(() => Number)
  @Min(1)
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @Type(() => Number)
  @Min(1)
  @Max(500)
  @IsNumber()
  @IsOptional()
  limit?: number = 10;
}
