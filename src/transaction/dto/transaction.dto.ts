import { IsEnum, IsISO8601, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';
import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentMethod, TransactionCreatedBy, TransactionStatus, TransactionType, RFIDCardOperation } from '../../shared/interfaces';

export class ListTransactionDto {
  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  transactionId?: string;

  @ApiProperty({ required: false, enum: TransactionType })
  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @ApiProperty({ required: false, enum: RFIDCardOperation })
  @IsEnum(RFIDCardOperation)
  @IsOptional()
  cardOperation: RFIDCardOperation;

  @ApiProperty({ required: false, enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  order?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  card?: string;

  @ApiProperty({ required: false, enum: TransactionStatus })
  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @ApiProperty({ required: false })
  @IsISO8601({ strict: true })
  @IsOptional()
  orderedAtFrom?: Date;

  @ApiProperty({ required: false })
  @IsISO8601({ strict: true })
  @IsOptional()
  orderedAtTo?: Date;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  location?: string;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  user?: string;

  @ApiProperty({ required: false, enum: TransactionCreatedBy })
  @IsEnum(TransactionCreatedBy)
  @IsOptional()
  createdBy?: TransactionCreatedBy;

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

export class ExportTransactionDto extends PartialType(PickType(ListTransactionDto, ['paymentMethod', 'location', 'user', 'createdBy'] as const)) {
  @ApiProperty()
  @IsISO8601({ strict: true })
  @IsNotEmpty()
  orderedAt: Date;
}

export class GetCashRFIDOrderStatDto extends PartialType(PickType(ListTransactionDto, ['orderedAtFrom', 'orderedAtTo', 'location', 'user'] as const)) {}

export class UpdateCashRFIDOrderStatDto extends GetCashRFIDOrderStatDto {
  @ApiProperty({ enum: RFIDCardOperation })
  @IsEnum(RFIDCardOperation)
  operation: RFIDCardOperation;

  @ApiProperty({ minimum: 1 })
  @Min(1)
  @IsNumber()
  @IsNotEmpty()
  @ValidateIf(o => {
    return o.operation === RFIDCardOperation.Purchase;
  })
  reducedQuantity: number;

  @ApiProperty({ minimum: 1, maximum: 90 })
  @Min(1)
  @Max(90)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @ValidateIf(o => {
    return o.operation === RFIDCardOperation.Topup;
  })
  reducedPercentage: number;
}
