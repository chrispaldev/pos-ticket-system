import { Controller, Post, Body, Patch, Param, Res, UseGuards, Get, Delete, Query } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, ListUserDto, ExportUserDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles, User } from '..//shared/decorators';
import { Role } from '../shared/interfaces';

@ApiBearerAuth()
@ApiTags('user')
@Controller('user')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Create User' })
  @Roles(Role.Admin)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @ApiOperation({ summary: 'Update User' })
  @Roles(Role.Admin)
  @Patch(':id')
  update(@Param('id')id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @ApiOperation({ summary: 'Delete User' })
  @Roles(Role.Admin)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.userService.delete(id);
  }

  @ApiOperation({ summary: 'Get User' })
  @Roles(Role.User)
  @Get()
  getLocation(@User('id') id: string) {
    return this.userService.get(id);
  }

  @ApiOperation({ summary: 'Get User By Admin' })
  @Roles(Role.Admin)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.userService.get(id);
  }

  @ApiOperation({ summary: 'List Users' })
  @Roles(Role.Admin)
  @Get('list/all')
  list(@Query() listUserDto: ListUserDto) {
    return this.userService.list(listUserDto);
  }

  @ApiOperation({ summary: 'Export Users' })
  @Roles(Role.Admin)
  @Get('export/all')
  export(@Query() exportUserDto: ExportUserDto, @Res() response: Response) {
    this.userService.export(exportUserDto, response);
  }
}
