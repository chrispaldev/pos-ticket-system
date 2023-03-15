import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateAdminDto, UpdateAdminDto, UpdateAdminProfileDto, UpdatePasswordDto, ListAdminDto } from './dto';
import { AdminService } from './admin.service';
import { Roles, User } from '../shared/decorators';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Role } from '../shared/interfaces';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}
  
  @ApiOperation({ summary: 'Create Admin' })
  @Roles(Role.SuperAdmin)
  @Post()
  create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }

  @ApiOperation({ summary: 'Update Admin' })
  @Roles(Role.SuperAdmin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
    return this.adminService.update(id, updateAdminDto);
  }

  @ApiOperation({ summary: 'Update Admin Profile' })
  @Roles(Role.Admin)
  @Patch()
  updateProfile(@User('id') id: string, @Body() updateAdminProfileDto: UpdateAdminProfileDto) {
    return this.adminService.updateProfile(id, updateAdminProfileDto);
  }

  @ApiOperation({ summary: 'Update Password' })
  @Roles(Role.Admin)
  @Patch('password/update')
  updatePassword(@User('id') id: string, @Body() updatePasswordDto: UpdatePasswordDto) {
    return this.adminService.updatePassword(id, updatePasswordDto);
  }

  @ApiOperation({ summary: 'Delete Admin' })
  @Roles(Role.SuperAdmin)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.adminService.delete(id);
  }

  @ApiOperation({ summary: 'Get Admin' })
  @Roles(Role.SuperAdmin)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.adminService.get(id);
  }

  @ApiOperation({ summary: 'Get Admin Profile' })
  @Roles(Role.Admin)
  @Get()
  getProfile(@User('id') id: string) {
    return this.adminService.get(id);
  }

  @ApiOperation({ summary: 'List Admins' })
  @Roles(Role.Admin)
  @Get('list/all')
  list(@Query() listAdminDto: ListAdminDto) {
    return this.adminService.list(listAdminDto);
  }
}
