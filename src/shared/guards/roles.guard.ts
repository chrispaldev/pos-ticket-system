import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../interfaces';
import { MESSAGES } from '../constants';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
    ]);
    const { user } = context.switchToHttp().getRequest();
    if (!requiredRoles) throw new ForbiddenException(MESSAGES.INSUFFICIENT_PERMISSION);
    if (requiredRoles.includes(Role.All) || user.role === Role.SuperAdmin) return true;
    if (requiredRoles.includes(user.role)) return true
    throw new ForbiddenException(MESSAGES.INSUFFICIENT_PERMISSION);
  }
}