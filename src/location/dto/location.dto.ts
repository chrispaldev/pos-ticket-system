import { ArrayMinSize, ArrayUnique, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../shared/interfaces';

export class CreateLocationDto {
  @ApiProperty()
  @Min(1)
  @IsNumber()
  @IsNotEmpty()
  number: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, maxLength: 80 })
  @MaxLength(80)
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: PaymentMethod, isArray: true })
  @ArrayUnique()
  @ArrayMinSize(1)
  @IsEnum(PaymentMethod, { each: true })
  paymentMethods: PaymentMethod[];

  @ApiProperty()
  @ArrayMinSize(1)
  @IsString({ each: true })
  menus?: string[];
}

export class UpdateLocationDto extends PartialType(CreateLocationDto) {}

export class ListLocationDto {
  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  locationId?: string;

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

export class ExportLocationDto extends PartialType(OmitType(ListLocationDto, ['page', 'limit'] as const)) {}
