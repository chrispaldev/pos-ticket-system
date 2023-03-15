import { ArrayMinSize, IsArray, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, maxLength: 80 })
  @MaxLength(80)
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ required: false, nullable: true })
  @IsMongoId()
  @IsOptional()
  subCategory?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsMongoId()
  @IsOptional()
  kitchen?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  quantityPerUnit?: string;

  @ApiProperty({ minimum: 0 })
  @Min(0)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  price: number;

  @ApiProperty({ minimum: 0 })
  @Min(0)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  vat: number;

  @ApiProperty({ minimum: 0 })
  @Min(0)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  credits: number;

  @ApiProperty({ minimum: 0 })
  @Min(0)
  @IsNumber()
  @IsNotEmpty()
  coupons: number;

  @ApiProperty({ type: [String] })
  @IsString({ each: true })
  @ArrayMinSize(1)
  @IsArray()
  locations: string[]
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class ListProductDto {
  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  productId?: string;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  subCategory?: string;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  kitchen?: string;

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
  limit?: number = 10;
}

export class ExportProductDto extends PartialType(OmitType(ListProductDto, ['page', 'limit'] as const)) {}
