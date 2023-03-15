import { Controller, Get, Post, Body, Patch, Param, Delete, Res, UseGuards, Query } from '@nestjs/common';
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { LocationService } from './location.service';
import { CreateLocationDto, UpdateLocationDto, ListLocationDto, ExportLocationDto } from './dto';
import { Roles, User } from '../shared/decorators';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Role } from '../shared/interfaces';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('location')
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @ApiOperation({ summary: 'Create Location' })
  @Roles(Role.Admin)
  @Post()
  create(@Body() createLocationDto: CreateLocationDto) {
    return this.locationService.create(createLocationDto);
  }

  @ApiOperation({ summary: 'Update Location' })
  @Roles(Role.Admin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLocationDto: UpdateLocationDto) {
    return this.locationService.update(id, updateLocationDto);
  }

  @ApiOperation({ summary: 'Delete Location' })
  @Roles(Role.Admin)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.locationService.delete(id);
  }

  @ApiOperation({ summary: 'Get Location' })
  @Roles(Role.Admin)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.locationService.get(id);
  }

  @ApiOperation({ summary: 'List Locations' })
  @Roles(Role.Admin)
  @Get('list/all')
  list(@Query() listLocationDto: ListLocationDto) {
    return this.locationService.list(listLocationDto);
  }

  @ApiOperation({ summary: 'Export Locations' })
  @Roles(Role.Admin)
  @Get('export/all')
  export(@Query() exportLocationDto: ExportLocationDto, @Res() response: Response) {
    this.locationService.export(exportLocationDto, response);
  }

  @ApiOperation({ summary: 'Get Location extras' })
  @Roles(Role.All)
  @Get('extras/all')
  getExtras() {
    return this.locationService.getExtras();
  }

  @ApiOperation({ summary: 'Get Entities Based on User Location' })
  @Roles(Role.User)
  @Get('entities/all')
  getEntitiesByUser(@User('locationId') locationId: string) {
    return this.locationService.getEntitiesByUser(locationId);
  }
}
