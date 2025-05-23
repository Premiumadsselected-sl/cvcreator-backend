import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../auth/decorators/roles.decorator";

/**
 * Guardia de autenticación JWT. Extiende AuthGuard('jwt').
 * Utiliza la JwtStrategy para validar el token JWT de las peticiones.
 * Incluye lógica de autorización basada en roles.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAuthenticated = (await super.canActivate(context)) as boolean;
    if (!isAuthenticated) {
      return false;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.roles || !Array.isArray(user.roles)) {
      throw new UnauthorizedException(
        "Información de roles de usuario no disponible o en formato incorrecto."
      );
    }

    const hasRequiredRole = requiredRoles.some((role) =>
      (user.roles as string[]).includes(role)
    );

    if (!hasRequiredRole) {
      throw new UnauthorizedException(
        "No tienes los roles necesarios para acceder a este recurso."
      );
    }

    return true;
  }
}
