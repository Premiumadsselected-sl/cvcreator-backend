import { OmitType } from "@nestjs/swagger";
import {
  SubscriptionDto,
  // SubscriptionStatus
} from "./subscription.dto";

export class CreateSubscriptionDto extends OmitType(SubscriptionDto, [
  "id",
  "createdAt",
  "updatedAt",
  "status", // El estado inicial se manejará en el servicio
  "trial_start",
  "trial_end",
  "current_period_start",
  "current_period_end",
  "cancel_at_period_end",
  "cancelled_at",
  "ended_at",
] as const) {
  // Puedes añadir validaciones específicas para la creación si es necesario
  // Por ejemplo, asegurar que user_id y plan_id siempre estén presentes
}
