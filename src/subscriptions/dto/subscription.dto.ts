import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDate,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";

export enum SubscriptionStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  PENDING = "pending",
  CANCELED = "canceled", // Estandarizado a CANCELED
  PAST_DUE = "past_due",
  TRIALING = "trialing",
  UNPAID = "unpaid",
}

export class SubscriptionDto {
  @ApiProperty({ description: "Subscription ID", example: "sub_123" })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: "User ID", example: "user_abc" })
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({ description: "Plan ID", example: "plan_xyz" })
  @IsString()
  @IsNotEmpty()
  plan_id: string;

  @ApiProperty({
    enum: SubscriptionStatus,
    description: "Status of the subscription",
    example: SubscriptionStatus.ACTIVE,
  })
  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus;

  @ApiPropertyOptional({ type: Date, description: "Start date of the trial" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  trial_start?: Date;

  @ApiPropertyOptional({ type: Date, description: "End date of the trial" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  trial_end?: Date;

  @ApiPropertyOptional({
    type: Date,
    description: "Start date of the current billing period",
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  current_period_start?: Date;

  @ApiPropertyOptional({
    type: Date,
    description: "End date of the current billing period",
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  current_period_end?: Date;

  @ApiPropertyOptional({
    type: Boolean,
    description: "Whether the subscription will be cancelled at period end",
  })
  @IsOptional()
  cancel_at_period_end?: boolean;

  @ApiPropertyOptional({
    type: Date,
    description: "Timestamp when the subscription was cancelled",
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  canceled_at?: Date; // Prisma usa 'canceled_at', mantenemos consistencia aquí

  @ApiPropertyOptional({
    type: Date,
    description: "Timestamp when the subscription ended",
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  ended_at?: Date;

  @ApiProperty({ type: Date, description: "Creation timestamp" })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ type: Date, description: "Last update timestamp" })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  @ApiPropertyOptional({ description: "Additional metadata" })
  @IsOptional()
  @IsObject()
  metadata?: any; // O un tipo más específico si se define
}
