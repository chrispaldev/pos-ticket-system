import { Controller, Req, Get, Post, Body, Param, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { GetTerminalTransactionStatusDto, StartTopupTransactionDto, RequestRefundDto } from './dto';
import { Roles } from '../shared/decorators';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Role } from '../shared/interfaces';

@Throttle(3000, 60)
@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiOperation({ summary: 'Get Supported Terminals' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('terminals/all')
  getTerminals() {
    return this.paymentService.getTerminals();
  }
  
  @ApiOperation({ summary: 'Get Supported Payment Methods' })
  @Get('methods/all')
  getPaymentMethods() {
    return this.paymentService.getPaymentMethods();
  }

  @ApiOperation({ summary: 'Get RFID Card Balance' })
  @Get('rfid/balance/:id')
  getRFIDBalance(@Param('id') id: string) {
    return this.paymentService.getRFIDBalance(id);
  }

  @ApiOperation({ summary: 'Start Topup Transaction' })
  @Post('topupTransaction/start')
  startTopupTransaction(@Body() startTopupTransactionDto: StartTopupTransactionDto, @Req() request: Request) {
    return this.paymentService.startTopupTransactionByCustomer(startTopupTransactionDto, request.ip);
  }

  @ApiOperation({ summary: 'Get Transaction Status' })
  @Get('transaction/status/:id')
  getTransactionStatus(@Param('id') id: string) {
    return this.paymentService.getTransactionStatus(id);
  }

  @ApiOperation({ summary: 'Get Terminal Transaction Status' })
  @HttpCode(HttpStatus.OK)
  @Post('terminalTransaction/status')
  getTerminalTransactionStatus(@Body() getTerminalTransactionStatusDto: GetTerminalTransactionStatusDto) {
    return this.paymentService.getTerminalTransactionStatus(getTerminalTransactionStatusDto);
  }

  @ApiOperation({ summary: 'Update Transaction Status' })
  @Post('transaction/update')
  updateTransactionStatus(@Body() data: any) {
    return this.paymentService.updateTransactionStatus(data);
  }

  @ApiOperation({ summary: 'Request Refund' })
  @Post('refund/request')
  requestRefund(@Body() requestRefundDto: RequestRefundDto) {
    return this.paymentService.requestRefund(requestRefundDto);
  }
}
