import { Controller, Get, Param, Body, Query, Patch, UseGuards, Res } from '@nestjs/common';
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { TransactionService } from './transaction.service';
import { ListTransactionDto, ExportTransactionDto, GetCashRFIDOrderStatDto, UpdateCashRFIDOrderStatDto } from './dto';
import { Roles } from '../shared/decorators';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Role } from '../shared/interfaces';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('transaction')
@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @ApiOperation({ summary: 'Get Transaction' })
  @Roles(Role.Admin)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.transactionService.get(id);
  }

  @ApiOperation({ summary: 'List Transactions' })
  @Roles(Role.Admin)
  @Get('list/all')
  list(@Query() listTransactionDto: ListTransactionDto) {
    return this.transactionService.list(listTransactionDto);
  }

  @ApiOperation({ summary: 'Export Transactions' })
  @Roles(Role.Admin)
  @Get('export/all')
  export(@Query() exportTransactionDto: ExportTransactionDto, @Res() response: Response) {
    return this.transactionService.export(exportTransactionDto, response);
  }

  @ApiOperation({ summary: 'Export Refund Requests' })
  @Roles(Role.Admin)
  @Get('exportRefundRequests/all')
  exportRefundRequests(@Res() response: Response) {
    return this.transactionService.exportRefundRequests(response);
  }

  @ApiOperation({ summary: 'Get Cash RFID Orders Stats' })
  @Roles(Role.Admin)
  @Get('cashRFIDOrdersStats/all')
  getCashRFIDOrdersStats(@Query() getCashRFIDOrderStatDto: GetCashRFIDOrderStatDto) {
    return this.transactionService.getCashRFIDOrdersStats(getCashRFIDOrderStatDto);
  }

  @ApiOperation({ summary: 'Get Cash RFID Orders Stats' })
  @Roles(Role.Admin)
  @Patch('cashRFIDOrdersStats/all')
  updateCashRFIDOrdersStats(@Body() updateCashRFIDOrderStatDto: UpdateCashRFIDOrderStatDto) {
    return this.transactionService.updateCashRFIDOrdersStats(updateCashRFIDOrderStatDto);
  }
}
