import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDate,
  IsBoolean,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";

export enum SubscriptionStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  CANCELLED = "cancelled",
  PAST_DUE = "past_due",
  TRIALING = "trialing",
  PENDING = "pending",
}

export class SubscriptionDto {
  @ApiProperty({
    description: "Subscription unique identifier",
    example: "sub_abcdef123456",
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: "User ID associated with the subscription",
    example: "user_abcdef123456",
  })
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({
    description: "Plan ID associated with the subscription",
    example: "plan_abcdef123456",
  })
  @IsString()
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
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  trial_start?: Date;

  @ApiPropertyOptional({ description: "Trial end date" })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  trial_end?: Date;

  @ApiPropertyOptional({ description: "Current billing period start date" })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  current_period_start?: Date;

  @ApiPropertyOptional({ description: "Current billing period end date" })
  @Type(() => Date)
  @IsDate()
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
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  cancelled_at?: Date;

  @ApiPropertyOptional({
    description: "Date when the subscription ended definitively",
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  ended_at?: Date;

  @ApiPropertyOptional({
    description: "Additional metadata for the subscription",
  })
  @IsObject()
  @IsOptional()
  metadata?: any;

  @ApiProperty({ description: "Creation timestamp" })
  @Type(() => Date)
  @IsDate()
  createdAt: Date;

  @ApiProperty({ description: "Last update timestamp" })
  @Type(() => Date)
  @IsDate()
  updatedAt: Date;
}
