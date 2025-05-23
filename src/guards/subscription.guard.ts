import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { SubscriptionsService } from "../subscriptions/subscriptions.service"; // Ajusta esta ruta si es necesario
import { Request } from "express";

// Asume que el payload del JWT (request.user) tiene una propiedad 'sub' (ID de usuario).
// Ajusta según la estructura real de tu payload JWT.
interface AuthenticatedRequestUser {
  sub: string; // ID del usuario
  email?: string; // Email del usuario, si está en el token y es necesario
  [key: string]: any;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedRequestUser;
}

// Considera mover este enum a un archivo de tipos compartido si se usa en otros lugares.
// ej: src/subscriptions/enums/subscription-status.enum.ts
export enum SubscriptionStatus {
  DOWN = "down",
  CANCELED = "canceled",
  ACTIVE = "active",
  TRIAL = "trial",
  PENDING = "pending", // Evalúa si 'pending' debe permitir el acceso.
}

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userPayload = request.user;

    if (!userPayload || !userPayload.sub) {
      // Esto no debería ocurrir si AuthGuard se ejecuta primero y es exitoso.
      throw new UnauthorizedException(
        "User not authenticated or user ID missing in token payload."
      );
    }

    try {
      // El servicio de suscripciones debería poder validar usando solo el user_id.
      const subscription = await this.subscriptionsService.validateSubscription(
        {
          user_id: userPayload.sub,
          // email: userPayload.email, // Descomenta si tu servicio lo requiere y el email está en el token.
        }
      );

      if (!subscription) {
        throw new ForbiddenException(
          "No active or valid subscription found for the user."
        );
      }

      const validStatuses = [
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.TRIAL,
        // SubscriptionStatus.PENDING, // Descomentado por defecto, evalúa si 'pending' debe dar acceso.
      ];

      if (!validStatuses.includes(subscription.status as SubscriptionStatus)) {
        throw new ForbiddenException(
          `Your subscription status ('${subscription.status}') does not grant access to this resource.`
        );
      }
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      // Loguear errores inesperados
      console.error("Error in SubscriptionGuard:", error);
      throw new ForbiddenException(
        "An error occurred while verifying subscription status."
      );
    }
    return true;
  }
}
