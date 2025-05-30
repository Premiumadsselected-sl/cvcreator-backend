import { OmitType, ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentDto, PaymentStatus } from "./payment.dto";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsEmail,
  IsUrl,
  IsLocale,
  ValidateNested,
  IsNumber,
  Min,
  IsNotEmpty,
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
  @IsNotEmpty()
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

export class CreatePaymentDto extends OmitType(PaymentDto, [
  "id",
  "createdAt",
  "updatedAt",
  "paid_at", // Se manejará a través de campos opcionales más abajo si es necesario para ciertos flujos
  "refunded_at",
  "status", // El estado se gestionará internamente o se pasará explícitamente si es necesario
  "processor_response", // Se manejará a través de campos opcionales más abajo
  "error_message",
  "refunded_amount",
  "refund_reason",
  // "processor", // Se maneja con el campo processor opcional de abajo
] as const) {
  @ApiPropertyOptional({
    description:
      "Payment processor to be used. Defaults to ACTIVE_PAYMENT_PROCESSOR if not provided.",
    example: "tefpay",
  })
  @IsOptional()
  @IsString()
  processor?: string;

  @ApiPropertyOptional({
    description: "ID of the plan related to this payment or to subscribe to.",
    example: "plan_monthly_premium",
  })
  @IsString()
  @IsOptional()
  plan_id?: string;

  @ApiPropertyOptional({
    description: "Email of the customer for the payment.",
    example: "user@example.com",
  })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

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
    description: "Payment matching data for tefpay",
  })
  @IsString()
  @IsOptional()
  tefpay_matching_data?: string;

  @ApiPropertyOptional({
    description: "Payment ID from the processor, if known at creation",
  })
  @IsString()
  @IsOptional()
  processor_payment_id?: string;

  @ApiPropertyOptional({
    description:
      "Raw response from the payment processor, if available at creation",
  })
  @IsObject()
  @IsOptional()
  processor_response?: any;

  @ApiPropertyOptional({
    description: "Timestamp when the payment was made, if known at creation",
  })
  @IsString()
  @IsOptional()
  paid_at?: string | Date;

  @ApiPropertyOptional({
    description: "Initial status of the payment, e.g., PENDING",
  })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus; // Se mantiene opcional aquí, el servicio puede asignar PENDING por defecto

  @ApiPropertyOptional({ description: "Additional metadata for the payment" })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
