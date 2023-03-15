import { ArrayMinSize, IsArray, IsEmail, IsEnum, IsISO8601, IsMilitaryTime, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsPhoneNumber, IsPositive, IsString, Length, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OnlinePaymentMethod } from '../../shared/interfaces';

export class TicketTrackDto {
  @ApiProperty({ minimum: 1 })
  @Min(1)
  @IsNumber({ maxDecimalPlaces: 0 })
  @IsNotEmpty()
  id: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, maxLength: 250 })
  @MaxLength(250)
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsMilitaryTime()	
  @IsNotEmpty()
  startTime: string;

  @ApiProperty()
  @IsMilitaryTime()	
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ minimum: 1 })
  @Min(1)
  @Max(60)
  @IsNumber({ maxDecimalPlaces: 0 })
  @IsNotEmpty()
  minsPerSlot: number;

  @ApiProperty()
  @IsPositive()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  price: number;

  @ApiProperty({ required: false })
  @IsPositive()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  promotionPrice?: number;
}

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, maxLength: 250 })
  @MaxLength(250)
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsISO8601({ strict: true })
  @IsNotEmpty()
  validFrom: Date;
  
  @ApiProperty()
  @IsISO8601({ strict: true })
  @IsNotEmpty()
  validTill: Date;

  @ApiProperty({ type: [TicketTrackDto] })
  @Type(() => TicketTrackDto)
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @IsArray()
  tracks?: TicketTrackDto[];
}

export class UpdateTicketDto extends PartialType(CreateTicketDto) {}

export class ListTicketDto {
  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  ticketId?: string;

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

export class GetTicketSlotDto {
  @ApiProperty()
  @IsISO8601({ strict: true })
  @Length(10, 10)
  @IsNotEmpty()
  date: string;
}

export class CustomerDetailsDto {
  @ApiProperty({ maxLength: 40 })
  @MaxLength(40)
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string;
}

export class TicketSlotDto {
  @ApiProperty({ minimum: 1 })
  @Min(1)
  @IsNumber()
  @IsNotEmpty()
  trackId: number;

  @ApiProperty()
  @IsISO8601({ strict: true })
  @Length(10, 10)
  @IsNotEmpty()
  date: string;

  @ApiProperty()
  @IsMilitaryTime()	
  @IsNotEmpty()
  startTime: string;

  @ApiProperty()
  @IsMilitaryTime()	
  @IsNotEmpty()
  endTime: string;
}

export class BookTicketSlotDto {
  @ApiProperty({ type: [TicketSlotDto] })
  @Type(() => TicketSlotDto)
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @IsArray()
  slots: TicketSlotDto[];

  @ApiProperty({ type: CustomerDetailsDto })
  @Type(() => CustomerDetailsDto)
  @ValidateNested()
  customerDetails?: CustomerDetailsDto;

  @ApiProperty({ required: false, maxLength: 250 })
  @MaxLength(250)
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: OnlinePaymentMethod })
  @IsEnum(OnlinePaymentMethod)
  paymentMethod: OnlinePaymentMethod;

  @ApiProperty()
  @IsPositive()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  price: number;
}

export class RedeemQRVoucherDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;
}