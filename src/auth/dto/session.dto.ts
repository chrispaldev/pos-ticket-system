import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, Max, IsEnum, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { SessionStatus } from '../../shared/interfaces';

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class DeleteSessionsDto {
  @ApiProperty({ required: false, enum: SessionStatus })
  @IsEnum(SessionStatus)
  @IsOptional()
  status?: SessionStatus;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  userId?: string;
}

export class ListSessionsDto {
  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  userId?: string;

  @ApiProperty({ required: false, enum: SessionStatus })
  @IsEnum(SessionStatus)
  @IsOptional()
  status?: SessionStatus;

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