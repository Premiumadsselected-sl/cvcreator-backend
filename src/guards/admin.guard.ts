import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service"; // Ajusta esta ruta si es necesario
import { Request } from "express";

// Asume que el payload del JWT (request.user) tiene una propiedad 'sub' (ID de usuario)
// y opcionalmente 'role'. Ajusta según la estructura real de tu payload JWT.
interface AuthenticatedRequestUser {
  sub: string; // ID del usuario
  role?: string; // Rol del usuario, si está en el token
  [key: string]: any;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedRequestUser;
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userPayload = request.user;

    if (!userPayload || !userPayload.sub) {
      // Esto no debería ocurrir si AuthGuard se ejecuta primero y es exitoso.
      throw new UnauthorizedException(
        "User not authenticated or user ID missing in token payload."
      );
    }

    // Optimización: si el rol 'admin' ya está en el token y confías en él:
    // if (userPayload.role === 'admin') {
    //   return true;
    // }

    try {
      const userFromDb = await this.prisma.user.findUnique({
        where: { id: userPayload.sub },
      });

      if (!userFromDb) {
        // El usuario del token no existe en la DB.
        throw new UnauthorizedException("User not found.");
      }

      if (userFromDb.role !== "admin") {
        throw new ForbiddenException("User does not have admin privileges.");
      }
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      // Loguear errores inesperados
      console.error("Error in AdminGuard:", error);
      throw new ForbiddenException(
        "An error occurred while verifying admin privileges."
      );
    }
    return true;
  }
}
