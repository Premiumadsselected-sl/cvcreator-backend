import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsObject,
} from "class-validator";

export enum PaymentStatus {
  PENDING = "pending",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export class PaymentDto {
  @ApiProperty({
    description: "Payment unique identifier",
    example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: "User ID associated with the payment",
    example: "user-123",
  })
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @ApiPropertyOptional({
    description: "Subscription ID if payment is for a subscription",
    example: "sub-123",
  })
  @IsString()
  @IsOptional()
  subscription_id?: string;

  @ApiProperty({ description: "Payment amount", example: 19.99 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: "Payment currency", example: "EUR" })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    description: "Payment status",
    enum: PaymentStatus,
    example: PaymentStatus.SUCCEEDED,
  })
  @IsEnum(PaymentStatus)
  @IsNotEmpty()
  status: PaymentStatus;

  @ApiPropertyOptional({ description: "Payment method used", example: "card" })
  @IsString()
  @IsOptional()
  method?: string;

  @ApiPropertyOptional({
    description: "Payment processor used",
    example: "tefpay",
  })
  @IsString()
  @IsOptional()
  processor?: string;

  @ApiPropertyOptional({
    description: "Payment ID from the processor",
    example: "pi_123456789",
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

  @ApiPropertyOptional({ description: "Error message if payment failed" })
  @IsString()
  @IsOptional()
  error_message?: string;

  @ApiPropertyOptional({ description: "Amount refunded", example: 0 })
  @IsNumber()
  @IsOptional()
  refunded_amount?: number;

  @ApiPropertyOptional({ description: "Reason for refund" })
  @IsString()
  @IsOptional()
  refund_reason?: string;

  @ApiPropertyOptional({ description: "Timestamp when payment was made" })
  @IsDateString()
  @IsOptional()
  paid_at?: Date;

  @ApiPropertyOptional({ description: "Timestamp when payment was refunded" })
  @IsDateString()
  @IsOptional()
  refunded_at?: Date;

  @ApiProperty({ description: "Timestamp of payment creation" })
  @IsDateString()
  @IsNotEmpty()
  createdAt: Date;

  @ApiProperty({ description: "Timestamp of last payment update" })
  @IsDateString()
  @IsNotEmpty()
  updatedAt: Date;
}
