import { IsEmail, IsEnum, IsIBAN, IsISO31661Alpha2, IsNotEmpty, IsNotEmptyObject, IsNumber, IsObject, IsPhoneNumber, IsString, IsUrl, Max, 
  MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OnlinePaymentMethod } from '../../shared/interfaces';

export class GetTerminalTransactionStatusDto {
  @ApiProperty()
  @IsUrl()
  @IsNotEmpty()
  terminalStatusUrl: string;
}

export class CustomerBasicDetailsDto {
  @ApiProperty({ maxLength: 40 })
  @MaxLength(40)
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ maxLength: 40 })
  @MaxLength(40)
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsISO31661Alpha2()
  @IsNotEmpty()
  countryCode: string;
}

export class StartTopupTransactionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cardId: string;

  @ApiProperty({ enum: OnlinePaymentMethod })
  @IsEnum(OnlinePaymentMethod)
  paymentMethod: OnlinePaymentMethod;

  @ApiProperty({ minimum: 1 })
  @Min(1)
  @Max(1000)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  topupPrice: number;

  @ApiProperty({ type: CustomerBasicDetailsDto })
  @Type(() => CustomerBasicDetailsDto)
  @ValidateNested()
  @IsObject()
  @IsNotEmptyObject()
  @ValidateIf(o => {
    return o.paymentMethod === OnlinePaymentMethod.VisaMastercard;
  })
  customerDetails: CustomerBasicDetailsDto
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

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty()
  @IsIBAN()
  @IsNotEmpty()
  iban: string;
}

export class RequestRefundDto {
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

  @ApiProperty({ type: CustomerDetailsDto })
  @Type(() => CustomerDetailsDto)
  @ValidateNested()
  @IsObject()
  @IsNotEmptyObject()
  customerDetails: CustomerDetailsDto;
}