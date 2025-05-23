import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { SubscriptionsService } from "../subscriptions/subscriptions.service"; // Ajusta la ruta si es necesario
import { User } from "../users/entities/user.entity"; // Ajusta la ruta si es necesario

@Injectable()
export class SubscriptionStatusGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionStatusGuard.name);

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as User; // Asumimos que JwtAuthGuard ya pobló request.user

    if (!user || !user.id) {
      this.logger.warn(
        "SubscriptionStatusGuard: User not found or user ID missing in request."
      );
      // Esto no debería suceder si JwtAuthGuard se ejecuta antes y es obligatorio
      throw new ForbiddenException(
        "Access denied. User information is missing."
      );
    }

    return this.checkSubscription(user.id);
  }

  private async checkSubscription(userId: string): Promise<boolean> {
    try {
      const isActive =
        await this.subscriptionsService.isSubscriptionActive(userId);
      if (!isActive) {
        this.logger.log(
          `SubscriptionStatusGuard: Subscription is not active for user ${userId}.`
        );
        throw new ForbiddenException(
          "Access denied. Active subscription required."
        );
      }
      this.logger.log(
        `SubscriptionStatusGuard: Subscription is active for user ${userId}.`
      );
      return true;
    } catch (error) {
      // Si isSubscriptionActive lanza una excepción específica, se podría manejar aquí.
      // Por ahora, si hay un error (ej. DB) o la suscripción no está activa, se deniega el acceso.
      this.logger.error(
        `SubscriptionStatusGuard: Error checking subscription for user ${userId}: ${error.message}`,
        error.stack
      );
      if (error instanceof ForbiddenException) {
        throw error; // Re-lanzar la excepción ForbiddenException específica
      }
      // Para otros errores, lanzar una ForbiddenException genérica
      throw new ForbiddenException(
        "Access denied due to an issue verifying subscription status."
      );
    }
  }
}
