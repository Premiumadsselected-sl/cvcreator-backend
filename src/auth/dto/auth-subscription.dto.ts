import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUUID,
} from "class-validator";

export enum SubscriptionPlanType {
  FREE = "free",
  BASIC = "basic",
  PREMIUM = "premium",
}

export class AuthSubscriptionDto {
  @ApiProperty({
    description: "ID de usuario para la suscripción. Debe ser un UUID válido.",
    example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: "Tipo de plan de suscripción.",
    enum: SubscriptionPlanType,
    example: SubscriptionPlanType.PREMIUM,
  })
  @IsEnum(SubscriptionPlanType)
  @IsNotEmpty()
  plan: SubscriptionPlanType;

  @ApiPropertyOptional({
    description:
      "Estado de la suscripción (p. ej., active, inactive, cancelled).",
    example: "active",
  })
  @IsString()
  @IsOptional()
  status?: string;
}
