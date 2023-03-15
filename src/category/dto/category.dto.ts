import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { CategoryType } from '../../shared/interfaces';
import { Type } from 'class-transformer';

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @MaxLength(80)
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsMongoId()
  @IsOptional()
  parent?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class ListCategoryDto {
  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ required: false, enum: CategoryType })
  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  parent?: string;

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

export class ExportCategoryDto extends PartialType(OmitType(ListCategoryDto, ['page', 'limit'] as const)) {}
