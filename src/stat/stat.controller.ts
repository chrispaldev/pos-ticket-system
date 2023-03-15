import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StatService } from './stat.service';
import { Roles, User } from '../shared/decorators';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Role } from '../shared/interfaces';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('stat')
@Controller('stat')
export class StatController {
  constructor(private readonly statService: StatService) {}

  @ApiOperation({ summary: 'Count All Stats' })
  @Roles(Role.Admin)
  @Get('count/all')
  countAllStats(@User('role') role: Role) {
    return this.statService.countAllStats(role);
  }
}
