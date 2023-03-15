import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Res, UseGuards, Req } from '@nestjs/common';
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { RFIDCardService } from './rfidcard.service';
import { PurchaseAndTopupRFIDDto, CreateRFIDCardDto, UpdateRFIDCardDto, ListRFIDCardDto, ExportRFIDCardDto } from './dto';
import { Roles, User } from '../shared/decorators';
import { Role, UserSession } from '../shared/interfaces';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('rfidcard')
@Controller('rfidcard')
export class RFIDCardController {
  constructor(private readonly rfidCardService: RFIDCardService) {}

  @ApiOperation({ summary: 'Purchase & Topup RFID Card' })
  @Roles(Role.User)
  @Post('purchaseAndTopup')
  purchaseAndTopup(@Body() purchaseAndTopupRFIDDto: PurchaseAndTopupRFIDDto, @User() user: UserSession) {
    return this.rfidCardService.purchaseAndTopup(purchaseAndTopupRFIDDto, user);
  }

  @ApiOperation({ summary: 'Purchase & Topup RFID Card Using Terminal' })
  @Roles(Role.User)
  @Post('purchaseAndTopupUsingTerminal')
  purchaseAndTopupUsingTerminal(@Body() purchaseAndTopupRFIDDto: PurchaseAndTopupRFIDDto, @User() user: UserSession, @Req() request: Request) {
    return this.rfidCardService.purchaseAndTopupUsingTerminal(purchaseAndTopupRFIDDto, user, request.ip);
  }
  
  @ApiOperation({ summary: 'Create RFID Card' })
  @Roles(Role.Admin)
  @Post()
  create(@Body() createRFIDCardDto: CreateRFIDCardDto) {
    return this.rfidCardService.create(createRFIDCardDto);
  }

  @ApiOperation({ summary: 'Update RFID Card' })
  @Roles(Role.Admin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRFIDCardDto: UpdateRFIDCardDto) {
    return this.rfidCardService.update(id, updateRFIDCardDto);
  }

  @ApiOperation({ summary: 'Delete RFID Card' })
  @Roles(Role.Admin)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.rfidCardService.delete(id);
  }

  @ApiOperation({ summary: 'Get RFID Card' })
  @Roles(Role.All)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.rfidCardService.get(id);
  }

  @ApiOperation({ summary: 'List RFID Cards' })
  @Roles(Role.Admin)
  @Get('list/all')
  list(@Query() listRFIDCardDto: ListRFIDCardDto) {
    return this.rfidCardService.list(listRFIDCardDto);
  }

  @ApiOperation({ summary: 'Export RFID Cards' })
  @Roles(Role.Admin)
  @Get('export/all')
  export(@Query() exportRFIDCardDto: ExportRFIDCardDto, @Res() response: Response) {
    this.rfidCardService.export(exportRFIDCardDto, response);
  }
}
