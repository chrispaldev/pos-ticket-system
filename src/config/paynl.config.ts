import * as Paynl from 'paynl-sdk';
import { ConfigService } from '@nestjs/config';

const configService = new ConfigService();

Paynl.Config.setApiToken(configService.get<string>('PAYNL_API_KEY'));
Paynl.Config.setServiceId(configService.get<string>('PAYNL_SERVICE_ID'));

export const paynl = Paynl
