import { ArrayMinSize, IsArray, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, maxLength: 80 })
  @MaxLength(80)
  @IsString()
  @IsOptional()
  description?: string;

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
  @ArrayMinSize(1)
  @IsArray()
  @IsMongoId({ each: true })
  locations: string[]
}

export class UpdateEventDto extends PartialType(CreateEventDto) {}

export class ListEventDto {
  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  eventId?: string;

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

export class ExportEventDto extends PartialType(OmitType(ListEventDto, ['page', 'limit'] as const)) {}
