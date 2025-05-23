import { PartialType, OmitType } from "@nestjs/swagger";
import { SubscriptionDto } from "./subscription.dto";

export class UpdateSubscriptionDto extends PartialType(
  OmitType(SubscriptionDto, [
    "id",
    "user_id", // Generalmente no se cambia el user_id de una suscripción
    "plan_id", // Cambiar el plan podría tener lógica de negocio compleja (pro-rata, etc.)
    "createdAt",
    "updatedAt",
  ] as const)
) {
  // Aquí se pueden actualizar campos como status, trial_end, cancel_at_period_end, etc.
  // Puedes añadir validaciones específicas para la actualización si es necesario
}
