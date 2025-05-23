import { OmitType, ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentDto, PaymentStatus } from "./payment.dto";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsInt, // Asegurarse que IsInt se usa
} from "class-validator";

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
  "processor", // Se omite para redefinirlo como opcional
] as const) {
  @ApiProperty({
    description:
      "Payment processor to be used. Defaults to ACTIVE_PAYMENT_PROCESSOR if not provided.",
    example: "tefpay",
    required: false, // Cambiado a false
  })
  @IsOptional() // Añadido
  @IsString()
  processor?: string; // Cambiado a opcional

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
  @IsString() // O IsDateString si se prefiere validar como fecha ISO8601
  @IsOptional()
  paid_at?: string | Date; // Prisma espera Date, pero DTO puede recibir string

  @ApiPropertyOptional({ description: "Current status of the payment" })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: "Additional metadata for the payment" })
  @IsObject()
  @IsOptional()
  metadata?: any;
}
