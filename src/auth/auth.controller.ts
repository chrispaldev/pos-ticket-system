import { Controller, Post, HttpCode, HttpStatus, Body, UseGuards, Get, Query, Delete, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request } from 'express';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto } from '../shared/dto';
import { RefreshTokenDto, DeleteSessionsDto, ListSessionsDto } from './dto';
import { Roles, User } from '../shared/decorators';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Role } from '../shared/interfaces';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Admin Login' })
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  loginAdmin(@Body() loginDto: LoginDto, @Req() request: Request) {
    const browserInfo = this.authService.getBrowserInfo(request);
    return this.authService.loginAdmin(loginDto, browserInfo);
  }

  @ApiOperation({ summary: 'User Login' })
  @Post('user/login')
  @HttpCode(HttpStatus.OK)
  loginUser(@Body() loginDto: LoginDto, @Req() request: Request) {
    const browserInfo = this.authService.getBrowserInfo(request);
    return this.authService.loginUser(loginDto, browserInfo);
  }

  @ApiOperation({ summary: 'Refresh Token' })
  @Post('refreshToken')
  @HttpCode(HttpStatus.OK)
  refreshToken(@Body() { refreshToken }: RefreshTokenDto, @Req() request: Request) {
    const browserInfo = this.authService.getBrowserInfo(request);
    return this.authService.refreshToken(refreshToken, browserInfo);
  }

  @ApiOperation({ summary: 'Logout' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.All)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.logout(refreshTokenDto);
  }

  @ApiOperation({ summary: 'Logout from all sessions' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.All)
  @Post('logoutAll')
  @HttpCode(HttpStatus.OK)
  logoutAll(@User('id') id: string) {
    return this.authService.logoutAll(id);
  }

  @ApiOperation({ summary: 'Delete user sessions' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Delete('sessions')
  deleteSessions(@Query() deleteSessionsDto: DeleteSessionsDto) {
    return this.authService.delete(deleteSessionsDto);
  }

  @ApiOperation({ summary: 'Get all user sessions' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('sessions/all')
  listSessions(@Query() listSessionsDto: ListSessionsDto) {
    return this.authService.list(listSessionsDto);
  }
}
