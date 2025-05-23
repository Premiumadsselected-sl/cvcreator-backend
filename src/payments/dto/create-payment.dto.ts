import { OmitType, ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentDto, PaymentStatus } from "./payment.dto";
import { IsString, IsOptional, IsEnum, IsObject } from "class-validator";

export class CreatePaymentDto extends OmitType(PaymentDto, [
  "id",
  "createdAt",
  "updatedAt",
  "paid_at",
  "refunded_at",
  "status",
  "processor_response",
  "error_message",
  "refunded_amount",
  "refund_reason",
  "processor",
] as const) {
  @ApiProperty({
    description:
      "Payment processor to be used. Defaults to ACTIVE_PAYMENT_PROCESSOR if not provided.",
    example: "tefpay",
    required: false,
  })
  @IsOptional()
  @IsString()
  processor?: string;

  @ApiPropertyOptional({
    description: "ID of the plan related to this payment",
  })
  @IsString()
  @IsOptional()
  plan_id?: string;

  @ApiPropertyOptional({ description: "Order ID for the payment" })
  @IsString()
  @IsOptional()
  order_id?: string;

  @ApiPropertyOptional({
    description: "Payment ID from the processor, if known",
  })
  @IsString()
  @IsOptional()
  processor_payment_id?: string;

  @ApiPropertyOptional({
    description: "Raw response from the payment processor",
  })
  @IsObject()
  @IsOptional()
  processor_response?: any;

  @ApiPropertyOptional({ description: "Timestamp when the payment was made" })
  @IsString()
  @IsOptional()
  paid_at?: string | Date;

  @ApiPropertyOptional({ description: "Current status of the payment" })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: "Additional metadata for the payment" })
  @IsObject()
  @IsOptional()
  metadata?: any;
}
