import { Controller, Get, Post, Body, Patch, Delete, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { EventService } from './event.service';
import { CreateEventDto, UpdateEventDto, ListEventDto, ExportEventDto } from './dto';
import { Roles } from '../shared/decorators';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Role } from '../shared/interfaces';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('event')
@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @ApiOperation({ summary: 'Create Event' })
  @Roles(Role.Admin)
  @Post()
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventService.create(createEventDto);
  }

  @ApiOperation({ summary: 'Update Event' })
  @Roles(Role.Admin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventService.update(id, updateEventDto);
  }

  @ApiOperation({ summary: 'Delete Event' })
  @Roles(Role.Admin)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.eventService.delete(id);
  }

  @ApiOperation({ summary: 'Get Event' })
  @Roles(Role.Admin)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.eventService.get(id);
  }

  @ApiOperation({ summary: 'List Events' })
  @Roles(Role.Admin)
  @Get('list/all')
  list(@Query() listEventDto: ListEventDto) {
    return this.eventService.list(listEventDto);
  }

  @ApiOperation({ summary: 'Export Events' })
  @Roles(Role.Admin)
  @Get('export/all')
  export(@Query() exportEventDto: ExportEventDto, @Res() response: Response) {
    this.eventService.export(exportEventDto, response);
  }
}
