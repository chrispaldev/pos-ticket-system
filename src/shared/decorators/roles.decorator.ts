import { SetMetadata } from '@nestjs/common';
import { Role } from '../interfaces';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);