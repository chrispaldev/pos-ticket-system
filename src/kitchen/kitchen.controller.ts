import { Controller, Get, Post, Body, Patch, Param, Delete, Res, UseGuards, Query } from '@nestjs/common';
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { KitchenService } from './kitchen.service';
import { CreateKitchenDto, UpdateKitchenDto, ListKitchenDto, ExportKitchenDto } from './dto';
import { Roles } from '../shared/decorators';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Role } from '../shared/interfaces';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('kitchen')
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @ApiOperation({ summary: 'Create Kitchen' })
  @Roles(Role.Admin)
  @Post()
  create(@Body() createKitchenDto: CreateKitchenDto) {
    return this.kitchenService.create(createKitchenDto);
  }

  @ApiOperation({ summary: 'Update Kitchen' })
  @Roles(Role.Admin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateKitchenDto: UpdateKitchenDto) {
    return this.kitchenService.update(id, updateKitchenDto);
  }

  @ApiOperation({ summary: 'Delete Kitchen' })
  @Roles(Role.Admin)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.kitchenService.delete(id);
  }

  @ApiOperation({ summary: 'Get Kitchen' })
  @Roles(Role.Admin)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.kitchenService.get(id);
  }

  @ApiOperation({ summary: 'List Kitchens' })
  @Roles(Role.All)
  @Get('list/all')
  list(@Query() listKitchenDto: ListKitchenDto) {
    return this.kitchenService.list(listKitchenDto);
  }

  @ApiOperation({ summary: 'Export Kitchens' })
  @Roles(Role.Admin)
  @Get('export/all')
  export(@Query() exportKitchenDto: ExportKitchenDto, @Res() response: Response) {
    this.kitchenService.export(exportKitchenDto, response);
  }
}
