import { SetMetadata } from '@nestjs/common';

export enum UserRole {
  MANAGER = 'manager',
  ADMIN = 'admin',
  KARAGAR = 'karagar',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
