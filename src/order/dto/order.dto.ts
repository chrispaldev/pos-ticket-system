import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsISO8601, IsMongoId, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsPositive, IsString, Length, Max, MaxLength, Min, 
  ValidateIf, ValidateNested } from 'class-validator';
import { IEventDetails, IProductDetails, OrderType, OrderSubType, PaymentMethod, TransactionStatus } from '../../shared/interfaces';
import { PurchaseAndTopupRFIDDto } from '../../rfidcard/dto';
import { ApiProperty, PickType, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class EventDetailsDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  event: string;

  @ApiProperty({ minimum: 1 })
  @Min(1)
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

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
}

export class ProductDetailsDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  product: string;

  @ApiProperty({ minimum: 1 })
  @Min(1)
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

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
}

export class CreateOrderDto {
  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  freezeOrderId?: string;

  @ApiProperty({ required: false })
  @IsNumberString()
  @IsOptional()
  invoiceId?: string;

  @ApiProperty({ required: false, maxLength: 250 })
  @MaxLength(250)
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: OrderType })
  @IsEnum(OrderType)
  type: OrderType;

  @ApiProperty({ enum: OrderSubType })
  @IsEnum(OrderSubType)
  @ValidateIf(o => {
    return o.type === OrderType.Product;
  })
  subType: OrderSubType;

  @ApiProperty({ type: [EventDetailsDto] })
  @Type(() => EventDetailsDto)
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @IsArray()
  @ValidateIf(o => {
    return o.type === OrderType.Event;
  })
  eventDetails?: IEventDetails[];

  @ApiProperty({ type: [ProductDetailsDto] })
  @Type(() => ProductDetailsDto)
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @IsArray()
  @ValidateIf(o => {
    return o.type === OrderType.Product;
  })
  productDetails?: IProductDetails[];

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

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

  @ApiProperty()
  @IsPositive()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @ValidateIf(o => {
    return o.paymentMethod === PaymentMethod.RFIDCard;
  })
  credits: number;

  @ApiProperty()
  @IsPositive()
  @IsNumber()
  @IsNotEmpty()
  @ValidateIf(o => {
    return o.paymentMethod === PaymentMethod.Coupons;
  })
  coupons: number;

  @ApiProperty({ required: false })
  @IsISO8601({ strict: true })
  @IsOptional()
  orderedAt?: Date;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => {
    return o.paymentMethod === PaymentMethod.RFIDCard;
  })
  card: string;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isPurchaseAndTopup: boolean;

  @ApiProperty({ type: PurchaseAndTopupRFIDDto })
  @Type(() => PurchaseAndTopupRFIDDto)
  @ValidateNested()
  @IsNotEmpty()
  @ValidateIf(o => {
    return o.isPurchaseAndTopup === true;
  })
  purchaseAndTopup: PurchaseAndTopupRFIDDto;
}

export class CreateBulkOrderDto {
  @ApiProperty({ type: [CreateOrderDto] })
  @Type(() => CreateOrderDto)
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @IsArray()
  orders: CreateOrderDto[];
}

export class ListKitchenOrderDto {
  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ required: false, enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiProperty({ required: false })
  @IsISO8601({ strict: true })
  @IsOptional()
  orderedAtFrom?: Date;

  @ApiProperty({ required: false })
  @IsISO8601({ strict: true })
  @IsOptional()
  orderedAtTo?: Date;

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

export class ListOrderDto {
  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ required: false, enum: OrderType })
  @IsEnum(OrderType)
  @IsOptional()
  type?: OrderType;

  @ApiProperty({ required: false, enum: OrderSubType })
  @IsEnum(OrderSubType)
  @IsOptional()
  subType: OrderSubType;

  @ApiProperty({ required: false, enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiProperty({ required: false, enum: TransactionStatus })
  @IsEnum(TransactionStatus)
  @IsOptional()
  transactionStatus?: TransactionStatus;

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

export class ExportOrderDto extends PartialType(PickType(ListOrderDto, ['type', 'paymentMethod', 'location'] as const)) {
  @ApiProperty()
  @IsISO8601({ strict: true })
  @IsNotEmpty()
  orderedAt: Date;
}

export class GetProductOrderStatDto extends PartialType(PickType(ListOrderDto, ['type', 'orderedAtFrom', 'orderedAtTo', 'location', 'user'] as const)) {}

export class UpdateCashProductOrderStatDto extends PartialType(PickType(ListOrderDto, ['orderedAtFrom', 'orderedAtTo', 'location', 'user'] as const)) {
  @ApiProperty({ enum: OrderType })
  @IsEnum(OrderType)
  type: OrderType;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  @ValidateIf(o => {
    return o.type === OrderType.Product;
  })
  product: string;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  @ValidateIf(o => {
    return o.type === OrderType.Event;
  })
  event: string;

  @ApiProperty({ minimum: 1 })
  @Min(1)
  @IsNumber()
  @IsNotEmpty()
  reducedQuantity: number;
}

export class GetHourlyProductOrderStatDto {
  @ApiProperty({ enum: OrderType })
  @IsEnum(OrderType)
  type: OrderType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => {
    return o.type === OrderType.Product;
  })
  product: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => {
    return o.type === OrderType.Event;
  })
  event: string;

  @ApiProperty()
  @IsISO8601({ strict: true })
  @Length(10, 10)
  @IsNotEmpty()
  date: string;
}

export class GetLocationOrderStatDto extends PartialType(PickType(ListOrderDto, ['type', 'orderedAtFrom', 'orderedAtTo'] as const)) {}

export class GetUserOrderStatDto extends PartialType(PickType(ListOrderDto, ['orderedAtFrom', 'orderedAtTo'] as const)) {}

export class ExportUserOrderStatDto extends GetUserOrderStatDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  user: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @Min(0)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  cashGiven: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @Min(0)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  coinsGiven: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @Min(0)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  cashReceived: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @Min(0)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  coinsReceived: string;
}

export class FreezeOrderDto {
  @ApiProperty({ required: false, maxLength: 25 })
  @MaxLength(25)
  @IsString()
  @IsOptional()
  customerName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tableNo: string;

  @ApiProperty({ required: false, maxLength: 250 })
  @MaxLength(250)
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: OrderType })
  @IsEnum(OrderType)
  type: OrderType;

  @ApiProperty({ enum: OrderSubType })
  @IsEnum(OrderSubType)
  @ValidateIf(o => {
    return o.type === OrderType.Product;
  })
  subType: OrderSubType;

  @ApiProperty({ type: [EventDetailsDto] })
  @Type(() => EventDetailsDto)
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @IsArray()
  @ValidateIf(o => {
    return o.type === OrderType.Event;
  })
  eventDetails?: IEventDetails[];

  @ApiProperty({ type: [ProductDetailsDto] })
  @Type(() => ProductDetailsDto)
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @IsArray()
  @ValidateIf(o => {
    return o.type === OrderType.Product;
  })
  productDetails?: IProductDetails[];
}

export class UpdateFreezeOrderDto extends PartialType(FreezeOrderDto) {}

export class ListFreezeOrderDto {
  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  freezeOrderId?: string;

  @ApiProperty({ required: false, enum: OrderType })
  @IsEnum(OrderType)
  @IsOptional()
  type?: OrderType;

  @ApiProperty({ required: false, enum: OrderSubType })
  @IsEnum(OrderSubType)
  @IsOptional()
  subType: OrderSubType;

  @ApiProperty({ required: false })
  @IsISO8601({ strict: true })
  @IsOptional()
  freezedAtFrom?: Date;

  @ApiProperty({ required: false })
  @IsISO8601({ strict: true })
  @IsOptional()
  freezedAtTo?: Date;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  location?: string;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  user?: string;

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

export class ExportFreezeOrderDto extends PartialType(OmitType(ListFreezeOrderDto, ['page', 'limit'] as const)) {}
