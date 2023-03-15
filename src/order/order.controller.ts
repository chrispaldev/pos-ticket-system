import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Res, UseGuards, Req } from '@nestjs/common';
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { OrderService } from './order.service';
import { CreateOrderDto, CreateBulkOrderDto, ListKitchenOrderDto, ListOrderDto, ExportOrderDto, GetProductOrderStatDto, UpdateCashProductOrderStatDto, 
  GetHourlyProductOrderStatDto, GetLocationOrderStatDto, GetUserOrderStatDto, ExportUserOrderStatDto, FreezeOrderDto, UpdateFreezeOrderDto, ListFreezeOrderDto, 
  ExportFreezeOrderDto } from './dto';
import { Roles, User } from '../shared/decorators';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Role, UserSession } from '../shared/interfaces';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('order')
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiOperation({ summary: 'Create Order' })
  @Roles(Role.User)
  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @User() user: UserSession) {
    return this.orderService.create(createOrderDto, user);
  }

  @ApiOperation({ summary: 'Create Order Using Terminal' })
  @Roles(Role.User)
  @Post('createTerminalOrder')
  createTerminalOrder(@Body() createOrderDto: CreateOrderDto, @User() user: UserSession, @Req() request: Request) {
    return this.orderService.createTerminalOrder(createOrderDto, user, request.ip);
  }

  @ApiOperation({ summary: 'Create Bulk Orders' })
  @Roles(Role.User)
  @Post('bulk')
  createBulk(@Body() createBulkOrderDto: CreateBulkOrderDto, @User() user: UserSession) {
    return this.orderService.createBulk(createBulkOrderDto, user);
  }

  @ApiOperation({ summary: 'Delete Order' })
  @Roles(Role.Admin)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.orderService.delete(id);
  }

  @ApiOperation({ summary: 'Get Order' })
  @Roles(Role.Admin)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.orderService.get(id);
  }

  @ApiOperation({ summary: 'List Kitchen Orders' })
  @Roles(Role.User)
  @Get('list/kitchenOrders')
  listKitchenOrders(@Query() listKitchenOrderDto: ListKitchenOrderDto, @User('locationId') locationId: string) {
    return this.orderService.listKitchenOrders(listKitchenOrderDto, locationId);
  }

  @ApiOperation({ summary: 'List Orders' })
  @Roles(Role.Admin)
  @Get('list/all')
  list(@Query() listOrderDto: ListOrderDto) {
    return this.orderService.list(listOrderDto);
  }

  @ApiOperation({ summary: 'Export Orders' })
  @Roles(Role.Admin)
  @Get('export/all')
  export(@Query() exportOrderDto: ExportOrderDto, @Res() response: Response) {
    return this.orderService.export(exportOrderDto, response);
  }

  @ApiOperation({ summary: 'Get Products Orders Stats' })
  @Roles(Role.Admin)
  @Get('productOrdersStats/all')
  getProductOrdersStats(@Query() getProductOrderStatDto: GetProductOrderStatDto) {
    return this.orderService.getProductOrdersStats(getProductOrderStatDto);
  }

  @ApiOperation({ summary: 'Export Products Orders Stats' })
  @Roles(Role.Admin)
  @Get('exportProductOrdersStats/all')
  exportProductOrdersStats(@Query() getProductOrderStatDto: GetProductOrderStatDto, @Res() response: Response) {
    return this.orderService.exportProductOrdersStats(getProductOrderStatDto, response);
  }

  @ApiOperation({ summary: 'Get Cash Product Orders Stats' })
  @Roles(Role.Admin)
  @Get('cashProductOrdersStats/all')
  getCashProductOrdersStats(@Query() getProductOrderStatDto: GetProductOrderStatDto) {
    return this.orderService.getCashProductOrdersStats(getProductOrderStatDto);
  }

  @ApiOperation({ summary: 'Update Cash Product Orders Stats' })
  @Roles(Role.Admin)
  @Patch('cashProductOrdersStats/all')
  updateCashProductOrdersStats(@Body() updateCashProductOrderStatDto: UpdateCashProductOrderStatDto) {
    return this.orderService.updateCashProductOrdersStats(updateCashProductOrderStatDto);
  }

  @ApiOperation({ summary: 'Get Hourly Product Orders Stats' })
  @Roles(Role.Admin)
  @Get('hourlyProductOrdersStats/all')
  getHourlyProductOrdersStats(@Query() getHourlyProductOrderStatDto: GetHourlyProductOrderStatDto) {
    return this.orderService.getHourlyProductOrdersStats(getHourlyProductOrderStatDto);
  }

  @ApiOperation({ summary: 'Get Locations Orders Stats' })
  @Roles(Role.Admin)
  @Get('locationOrdersStats/all')
  getLocationOrdersStats(@Query() getLocationOrderStatDto: GetLocationOrderStatDto) {
    return this.orderService.getLocationOrdersStats(getLocationOrderStatDto);
  }

  @ApiOperation({ summary: 'Export Locations Orders Stats' })
  @Roles(Role.Admin)
  @Get('exportLocationOrdersStats/all')
  exportLocationOrdersStats(@Query() getLocationOrderStatDto: GetLocationOrderStatDto, @Res() response: Response) {
    return this.orderService.exportLocationOrdersStats(getLocationOrderStatDto, response);
  }

  @ApiOperation({ summary: 'Get Users Orders Stats' })
  @Roles(Role.Admin)
  @Get('userOrdersStats/all')
  getUserOrdersStats(@Query() getUserOrderStatDto: GetUserOrderStatDto) {
    return this.orderService.getUserOrdersStats(getUserOrderStatDto);
  }

  @ApiOperation({ summary: 'Export Users Orders Stats' })
  @Roles(Role.Admin)
  @Get('exportUserOrdersStats/all')
  exportUserOrdersStats(@Query() exportUserOrderStatDto: ExportUserOrderStatDto, @Res() response: Response) {
    return this.orderService.exportUserOrdersStats(exportUserOrderStatDto, response);
  }

  @ApiOperation({ summary: 'Freeze Order' })
  @Roles(Role.User)
  @Post('freeze')
  freezeOrder(@Body() freezeOrderDto: FreezeOrderDto, @User() user: UserSession) {
    return this.orderService.freezeOrder(freezeOrderDto, user);
  }

  @ApiOperation({ summary: 'Update Freeze Order' })
  @Roles(Role.User)
  @Patch('freeze/:id')
  updateFreezeOrder(@Param('id') id: string, @Body() updateFreezeOrderDto: UpdateFreezeOrderDto, @User() user: UserSession) {
    return this.orderService.updateFreezeOrder(id, updateFreezeOrderDto, user);
  }

  @ApiOperation({ summary: 'Delete Freeze Order' })
  @Roles(Role.Admin)
  @Delete('freeze/:id')
  deleteFreezeOrder(@Param('id') id: string) {
    return this.orderService.deleteFreezeOrder(id);
  }

  @ApiOperation({ summary: 'List Freeze Orders' })
  @Roles(Role.All)
  @Get('list/freezeOrders')
  listFreezeOrders(@Query() listFreezeOrderDto: ListFreezeOrderDto) {
    return this.orderService.listFreezeOrders(listFreezeOrderDto);
  }

  @ApiOperation({ summary: 'Export Freeze Orders' })
  @Roles(Role.Admin)
  @Get('export/freezeOrders')
  exportFreezeOrders(@Query() exportFreezeOrderDto: ExportFreezeOrderDto, @Res() response: Response) {
    this.orderService.exportFreezeOrders(exportFreezeOrderDto, response);
  }
}
