import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { User } from "../users/entities/user.entity";

@Injectable()
export class SubscriptionStatusGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionStatusGuard.name);

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as User;

    if (!user || !user.id) {
      this.logger.warn(
        "SubscriptionStatusGuard: User not found or user ID missing in request."
      );
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
      this.logger.error(
        `SubscriptionStatusGuard: Error checking subscription for user ${userId}: ${error.message}`,
        error.stack
      );
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException(
        "Access denied due to an issue verifying subscription status."
      );
    }
  }
}
