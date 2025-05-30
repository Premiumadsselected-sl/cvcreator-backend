import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class InitiatePaymentDto {
  @ApiProperty({
    description: "ID of the plan to subscribe to",
    example: "clxkz23dc0000z0x1y2z3h4j5",
    // format: "uuid", // No longer strictly UUID, can be CUID
  })
  @IsString() // Changed from IsUUID to IsString to support CUIDs
  @IsNotEmpty()
  plan_id: string;

  @ApiProperty({
    description: "Payment code for the transaction",
    example: "PAYMENT_CODE_12345",
  })
  @IsString()
  @IsNotEmpty()
  payment_code: string;

  @ApiProperty({
    description: "Email of the user initiating the payment",
    example: "user@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "URL to redirect the user to after payment completion",
    example: "https://example.com/payment/success",
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Optional URL to redirect the user after payment completion",
    example: "https://example.com/payment/success",
  })
  return_url?: string;

  @ApiPropertyOptional({
    description: "Username of the user, if available",
    example: "john_doe",
  })
  @IsString()
  @IsOptional()
  user_name?: string;
}
