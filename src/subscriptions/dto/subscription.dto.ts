import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsBoolean,
  IsObject,
} from "class-validator";

export enum SubscriptionStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  CANCELLED = "cancelled",
  PAST_DUE = "past_due",
  TRIALING = "trialing",
  PENDING = "pending", // Agregado para estados iniciales o pendientes de pago
}

export class SubscriptionDto {
  @ApiProperty({
    description: "Subscription unique identifier",
    example: "sub_abcdef123456",
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: "User ID associated with the subscription",
    example: "user_abcdef123456",
  })
  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({
    description: "Plan ID associated with the subscription",
    example: "plan_abcdef123456",
  })
  @IsUUID()
  @IsNotEmpty()
  plan_id: string;

  @ApiProperty({
    description: "Subscription status",
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
  })
  @IsEnum(SubscriptionStatus)
  @IsNotEmpty()
  status: SubscriptionStatus;

  @ApiPropertyOptional({ description: "Trial start date" })
  @IsDateString()
  @IsOptional()
  trial_start?: Date;

  @ApiPropertyOptional({ description: "Trial end date" })
  @IsDateString()
  @IsOptional()
  trial_end?: Date;

  @ApiPropertyOptional({ description: "Current billing period start date" })
  @IsDateString()
  @IsOptional()
  current_period_start?: Date;

  @ApiPropertyOptional({ description: "Current billing period end date" })
  @IsDateString()
  @IsOptional()
  current_period_end?: Date;

  @ApiPropertyOptional({
    description:
      "Whether the subscription will be cancelled at the end of the current period",
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  cancel_at_period_end?: boolean;

  @ApiPropertyOptional({
    description: "Date when the subscription was cancelled",
  })
  @IsDateString()
  @IsOptional()
  cancelled_at?: Date;

  @ApiPropertyOptional({
    description: "Date when the subscription ended definitively",
  })
  @IsDateString()
  @IsOptional()
  ended_at?: Date;

  @ApiPropertyOptional({
    description: "Additional metadata for the subscription",
  })
  @IsObject()
  @IsOptional()
  metadata?: any;

  @ApiProperty({ description: "Creation timestamp" })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({ description: "Last update timestamp" })
  @IsDateString()
  updatedAt: Date;
}
