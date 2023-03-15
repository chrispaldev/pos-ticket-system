import { IsNotEmpty, IsString, IsEmail, MinLength, IsPhoneNumber, IsEnum, IsOptional, IsNumber, Min, Max, MaxLength, IsMongoId } from 'class-validator';
import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { AccountStatus } from '../../shared/interfaces';
import { Transform, Type } from 'class-transformer';

export class CreateUserDto {
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
  @IsOptional()
  email?: string;

  @ApiProperty()
  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @ApiProperty({ minLength: 8 })
  @MinLength(8)
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ required: false, enum: AccountStatus })
  @IsEnum(AccountStatus)
  @IsOptional()
  status?: AccountStatus;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  terminal: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class ListUserDto {
  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  userId?: string;

  @ApiProperty({ required: false, enum: AccountStatus })
  @IsEnum(AccountStatus)
  @IsOptional()
  status?: AccountStatus;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  location?: string;

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
  limit?: number = 2;
}

export class ExportUserDto extends PartialType(OmitType(ListUserDto, ['page', 'limit'] as const)) {}
