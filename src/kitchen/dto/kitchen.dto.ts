import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateKitchenDto {
  @ApiProperty()
  @Min(1)
  @IsNumber()
  @IsNotEmpty()
  number: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @MaxLength(80)
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateKitchenDto extends PartialType(CreateKitchenDto) {}

export class ListKitchenDto {
  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  kitchenId?: string;

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

export class ExportKitchenDto extends PartialType(OmitType(ListKitchenDto, ['page', 'limit'] as const)) {}
