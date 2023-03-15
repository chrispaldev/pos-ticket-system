import { Controller, Req, Get, Post, Body, Patch, Delete, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { DealService } from './deal.service';
import { CreateTicketDto, UpdateTicketDto, ListTicketDto, GetTicketSlotDto, BookTicketSlotDto, RedeemQRVoucherDto } from './dto';
import { Roles, User } from '../shared/decorators';
import { Role, UserSession } from '../shared/interfaces';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';

@ApiTags('deal')
@Controller('deal')
export class DealController {
  constructor(private readonly dealService: DealService) {}

  @ApiOperation({ summary: 'Create Ticket' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Post('ticket')
  create(@Body() createTicketDto: CreateTicketDto) {
    return this.dealService.create(createTicketDto);
  }

  @ApiOperation({ summary: 'Update Ticket' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch('ticket/:id')
  update(@Param('id') id: string, @Body() updateTicketDto: UpdateTicketDto) {
    return this.dealService.update(id, updateTicketDto);
  }

  @ApiOperation({ summary: 'Delete Ticket' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Delete('ticket/:id')
  delete(@Param('id') id: string) {
    return this.dealService.delete(id);
  }

  @ApiOperation({ summary: 'Get Ticket' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('ticket/:id')
  get(@Param('id') id: string) {
    return this.dealService.get(id);
  }

  @ApiOperation({ summary: 'List Tickets' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.All)
  @Get('list/tickets')
  list(@Query() listTicketDto: ListTicketDto) {
    return this.dealService.list(listTicketDto);
  }

  @ApiOperation({ summary: 'Get Ticket Slots' })
  @Get('slots/ticket')
  getTicketSlots(@Query() getTicketSlotDto: GetTicketSlotDto) {
    return this.dealService.getTicketSlots(getTicketSlotDto);
  }

  @ApiOperation({ summary: 'Book Ticket Slots' })
  @Post('slots/ticket')
  bookTicketSlots(@Body() bookTicketSlotDto: BookTicketSlotDto, @Req() request: Request) {
    return this.dealService.bookTicketSlots(bookTicketSlotDto, request.ip);
  }
  
  @ApiOperation({ summary: 'Get QR Voucher Info' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.All)
  @Get(':code')
  getQRVoucherInfo(@Param('code') code: string) {
    return this.dealService.getQRVoucherInfo(code);
  }

  @ApiOperation({ summary: 'Redeem QR Voucher' })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User)
  @Post('redeem')
  redeemQRVoucher(@Body() redeemQRVoucherDto: RedeemQRVoucherDto, @User() user: UserSession) {
    return this.dealService.redeemQRVoucher(redeemQRVoucherDto, user);
  }

  @ApiOperation({ summary: 'Quick Redeem QR Voucher' })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User)
  @Post('quickredeem')
  quickRedeemQRVoucher(@Body() redeemQRVoucherDto: RedeemQRVoucherDto, @User() user: UserSession) {
    return this.dealService.quickRedeemQRVoucher(redeemQRVoucherDto, user);
  }
}
