import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class LoginDto {
  @ApiProperty()
  @Type(() => String)
  @Transform(({ value }) => value.toLowerCase())
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password!: string;
}
