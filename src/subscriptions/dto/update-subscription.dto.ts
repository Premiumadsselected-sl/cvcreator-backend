import { PartialType, OmitType } from "@nestjs/swagger";
import { SubscriptionDto } from "./subscription.dto";
import { IsOptional, IsDate } from "class-validator";
import { Type } from "class-transformer";

export class UpdateSubscriptionDto extends PartialType(
  OmitType(SubscriptionDto, [
    "id",
    "user_id", // Generalmente no se cambia el user_id de una suscripción
    "plan_id", // Cambiar el plan podría tener lógica de negocio compleja (pro-rata, etc.)
    "createdAt",
    "updatedAt",
    // Los siguientes campos se manejarán explícitamente o no deberían ser parte de una actualización parcial estándar
    "trial_start",
    "trial_end",
    // "current_period_start", // Se gestionará en lógica de servicio o se añade explícitamente abajo
    // "current_period_end", // Se gestionará en lógica de servicio o se añade explícitamente abajo
    "cancel_at_period_end",
    "canceled_at",
    "ended_at",
  ] as const)
) {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  next_billing_date?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  current_period_start?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  current_period_end?: Date;
}
