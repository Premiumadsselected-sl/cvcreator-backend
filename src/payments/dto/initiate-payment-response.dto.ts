import { ApiProperty } from "@nestjs/swagger";

export class InitiatePaymentResponseDto {
  @ApiProperty({
    description: "The ID of the newly created payment record",
    example: "clxkz23dc0000z0x1y2z3h4j5",
  })
  payment_id: string;

  @ApiProperty({
    description:
      "The amount to be paid, in the smallest currency unit (e.g., cents)",
    example: 1999,
  })
  amount: number; // Represented in cents or smallest unit

  @ApiProperty({
    description: "The currency of the payment (ISO 4217 code)",
    example: "EUR",
  })
  currency: string;

  @ApiProperty({
    description:
      "Order reference for the payment processor (e.g., Tefpay Ds_Order / Ds_Merchant_MatchingData)",
    example: "clxkz23dc0000z0x1y2z3h4j5",
  })
  order_reference: string;

  @ApiProperty({
    description:
      "URL to which the user should be redirected or where the payment form should be submitted.",
    example: "https://tefpay_payment_url.com/process",
    required: false,
  })
  payment_processor_url?: string; // URL de Tefpay para iniciar el pago (si aplica)

  @ApiProperty({
    description:
      "Any additional data required by the payment processor to initiate the payment on the frontend.",
    example: { merchant_code: "YOUR_MERCHANT_CODE" }, // Ejemplo
    required: false,
  })
  payment_processor_data?: Record<string, any>;
}
