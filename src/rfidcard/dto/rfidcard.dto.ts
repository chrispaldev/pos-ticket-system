import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Max, Min, ValidateIf } from 'class-validator';
import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AccountStatus, AllPaymentMethod, RFIDCardOperation, RFIDCardPurchaseStatus } from '../../shared/interfaces';

export class PurchaseAndTopupRFIDDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cardId: string;

  @ApiProperty({ enum: RFIDCardOperation })
  @IsEnum(RFIDCardOperation)
  operation: RFIDCardOperation;

  @ApiProperty({ enum: AllPaymentMethod })
  @IsEnum(AllPaymentMethod)
  paymentMethod: AllPaymentMethod;
  
  @ApiProperty()
  @IsPositive()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @ValidateIf(o => {
    return o.operation !== RFIDCardOperation.Purchase;
  })
  topupPrice: number
}

export class CreateRFIDCardDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cardId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  printedId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cvc: string;

  @ApiProperty({ minimum: 0 })
  @Min(0)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  credits: number;

  @ApiProperty({ enum: AccountStatus })
  @IsEnum(AccountStatus)
  @IsOptional()
  status?: AccountStatus;
}

export class UpdateRFIDCardDto extends PartialType(OmitType(CreateRFIDCardDto, ['cardId'] as const)) {
  @ApiProperty({ enum: RFIDCardPurchaseStatus })
  @IsEnum(RFIDCardPurchaseStatus)
  @IsOptional()
  purchaseStatus: RFIDCardPurchaseStatus;
}

export class ListRFIDCardDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  cardId?: string;

  @ApiProperty({ required: false, enum: RFIDCardPurchaseStatus })
  @IsEnum(RFIDCardPurchaseStatus)
  @IsOptional()
  purchaseStatus: RFIDCardPurchaseStatus;
  
  @ApiProperty({ required: false, enum: AccountStatus })
  @IsEnum(AccountStatus)
  @IsOptional()
  status: AccountStatus;

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

export class ExportRFIDCardDto extends PartialType(OmitType(ListRFIDCardDto, ['page', 'limit'] as const)) {}
