import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "../auth/enums/role.enum"; // Ajusta esta ruta si es necesario
import { ROLES_KEY } from "../auth/decorators/roles.decorator"; // Ajusta esta ruta si es necesario

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    // Asegúrate de que 'user' y 'user.roles' existan y que 'user.roles' sea un array
    if (!user || !user.roles || !Array.isArray(user.roles)) {
      return false;
    }
    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
