import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsUrl,
  IsLocale,
  ValidateNested,
  IsNumber,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class SubscriptionDetailsDto {
  @ApiProperty({
    description: "Frequency of the subscription in days.",
    example: 30,
  })
  @IsNumber()
  @Min(1)
  frequencyInDays: number;

  @ApiProperty({
    description: "End date of the subscription (YYYY-MM-DD).",
    example: "2025-12-31",
  })
  @IsString()
  @IsNotEmpty() // Podría ser opcional si la suscripción es indefinida hasta cancelación
  endDate: string;

  @ApiPropertyOptional({
    description:
      "Total amount for the entire subscription period, if applicable (e.g., for fixed-term subscriptions). In cents.",
    example: 10000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional({
    description: "Internal subscription ID, if pre-generated.",
  })
  @IsOptional()
  @IsString()
  subscription_id?: string;
}

export class CreatePaymentFlowDto {
  @ApiProperty({
    description: "ID of the plan to purchase or subscribe to.",
    example: "plan_monthly_premium",
  })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiPropertyOptional({
    description: "Email of the customer for the payment.",
    example: "user@example.com",
  })
  @IsOptional()
  @IsEmail()
  customerEmail?: string; // Será obligatorio si el usuario no está autenticado

  @ApiPropertyOptional({
    description: "Custom success URL to redirect after successful payment.",
    example: "https://customapp.com/payment-success",
  })
  @IsOptional()
  @IsUrl()
  successUrl?: string;

  @ApiPropertyOptional({
    description: "Custom cancel URL to redirect if payment is cancelled.",
    example: "https://customapp.com/payment-cancelled",
  })
  @IsOptional()
  @IsUrl()
  cancelUrl?: string;

  @ApiPropertyOptional({
    description: "Custom notification URL (webhook) for this specific payment.",
    example: "https://customapp.com/webhook/payment-update",
  })
  @IsOptional()
  @IsUrl()
  notificationUrl?: string;

  @ApiProperty({
    description:
      "Locale for the transaction (e.g., es-ES, en-US). Determines language and potentially country for the TPV.",
    example: "es-ES",
  })
  @IsLocale()
  @IsNotEmpty()
  locale: string;

  @ApiPropertyOptional({
    description:
      "Specific merchant terminal to use for Tefpay. If not provided, the default or locale-derived terminal will be used.",
    example: "002",
  })
  @IsOptional()
  @IsString()
  tefpayTerminal?: string;

  @ApiPropertyOptional({
    description: "Indicates if this payment flow is for a subscription.",
    example: true,
  })
  @IsOptional()
  isSubscription?: boolean;

  @ApiPropertyOptional({
    description: "Details for the subscription if isSubscription is true.",
    type: () => SubscriptionDetailsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SubscriptionDetailsDto)
  subscriptionDetails?: SubscriptionDetailsDto;

  @ApiPropertyOptional({
    description: "Additional metadata to associate with the payment.",
    example: { order_ref: "MY_CUSTOM_REF_123", customer_id: "CUST_XYZ" },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
