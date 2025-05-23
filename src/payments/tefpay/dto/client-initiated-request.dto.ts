import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsEnum, ValidateIf } from "class-validator";
import { BaseTefpayRequestDto } from "./base-tefpay-request.dto";
import {
  TefpayTemplateNumber,
  TefpayTransactionType,
} from "../common/tefpay.enums";

export class ClientInitiatedRequestDto extends BaseTefpayRequestDto {
  @ApiPropertyOptional({
    description:
      "URL where the user will be redirected for successful transactions.",
    example: "https://www.example.com/payment/success",
  })
  @IsString()
  @IsOptional()
  // Required for client-present transactions, but making it optional here as base might be used by merchant-initiated too.
  // Specific DTOs can enforce it.
  Ds_Merchant_UrlOK?: string;

  @ApiPropertyOptional({
    description:
      "URL where the user will be redirected for failed or incorrect transactions.",
    example: "https://www.example.com/payment/failure",
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_UrlKO?: string;

  @ApiPropertyOptional({
    description:
      "Merchant name to be displayed during 3DSecure authentication.",
    example: "YourCompanyName",
    maxLength: 25,
  })
  @IsString()
  @IsOptional()
  @ValidateIf(
    (o) =>
      o.Ds_Merchant_TransactionType ===
        TefpayTransactionType.PAYMENT_STANDARD ||
      o.Ds_Merchant_TransactionType ===
        TefpayTransactionType.PREAUTHORIZATION ||
      o.Ds_Merchant_TransactionType === TefpayTransactionType.AUTHENTICATION
  )
  Ds_Merchant_Name?: string;

  @ApiPropertyOptional({
    description: "Template number for the hosted payment page.",
    enum: TefpayTemplateNumber,
    example: TefpayTemplateNumber.CREDIT_DEBIT_DEFAULT,
  })
  @IsEnum(TefpayTemplateNumber)
  @IsOptional()
  Ds_Merchant_TemplateNumber?: TefpayTemplateNumber;

  @ApiPropertyOptional({
    description:
      "URL of the merchant logo to display on the hosted page (HTTPS recommended).",
    example: "https://www.example.com/logo.png",
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_Logo?: string;

  @ApiPropertyOptional({
    description:
      "Order reference for bank reconciliation. 8 alphanumeric characters.",
    example: "A1234567",
    maxLength: 8,
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_OrderReference?: string;

  @ApiPropertyOptional({
    description: "Customer identifier. 6 numeric characters.",
    example: "123456",
    maxLength: 6,
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_CustomerNumber?: string;

  @ApiPropertyOptional({
    description:
      "Merchant's internal client reference. 12 alphanumeric characters.",
    example: "CLIENTREF001",
    maxLength: 12,
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_ClientRef?: string;

  @ApiPropertyOptional({
    description: "Application number. 6 numeric characters.",
    example: "APP001",
    maxLength: 6,
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_Application?: string;

  @ApiPropertyOptional({
    description: "Optional merchant data field 1.",
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_Op1?: string;
  // Add Op2 to Op10 if needed

  @ApiPropertyOptional({
    description:
      "Authentication terminal number, if different from Ds_Merchant_Terminal.",
    example: "00000002",
    maxLength: 8,
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_TerminalAuth?: string;
}
