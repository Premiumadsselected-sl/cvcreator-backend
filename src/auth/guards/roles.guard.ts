import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { UserRole } from "../../users/dto/user.dto"; // Ajustaremos esta ruta si es necesario

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (!requiredRoles) {
      return true; // No roles are required, access granted
    }
    const { user } = context.switchToHttp().getRequest();
    // Ensure user and user.roles exist. Adjust 'user.roles' if your user object stores roles differently.
    // This example assumes user.roles is an array of UserRole enums.
    // If roles are stored directly (e.g., user.role = UserRole.ADMIN), adjust accordingly.
    if (!user || !user.roles) {
      return false; // User or user.roles not found, access denied
    }
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
