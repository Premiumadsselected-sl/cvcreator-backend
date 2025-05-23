import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsObject,
  // Consider adding IsNumberString if numbers might come as strings but should be validated as such
} from "class-validator";

export enum TefPayNotificationStatus {
  RECEIVED = "received",
  PROCESSED = "processed",
  ERROR = "error",
}

export class TefPayNotificationDto {
  @ApiProperty({
    description: "Notification unique identifier (internal)",
    example: "tpn_a0eebc99",
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  // Fields from TefPay Notification
  @ApiPropertyOptional({
    description:
      "Amount of the transaction. Last two digits are decimals. Example: 1000 means 10.00",
    example: "1000",
  })
  @IsString()
  @IsOptional()
  Ds_Amount?: string;

  @ApiPropertyOptional({
    description:
      "Merchant's order identifier. May be modified by Tefpay (last 2 digits).",
    example: "091222152933123456789",
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_MatchingData?: string; // This is the primary order identifier from docs

  @ApiPropertyOptional({
    description: "Bank authorisation code for the transaction.",
    example: "020441",
  })
  @IsString()
  @IsOptional()
  Ds_AuthorisationCode?: string;

  @ApiPropertyOptional({
    description: "Bank code that processed the transaction.",
    example: "2100",
  })
  @IsString()
  @IsOptional()
  Ds_Bank?: string;

  @ApiPropertyOptional({
    description: "Transaction type code.",
    example: "201",
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_TransactionType?: string;

  @ApiPropertyOptional({
    description: "Response message from TefPay.",
    example: "Aceptada",
  })
  @IsString()
  @IsOptional()
  Ds_Message?: string;

  @ApiPropertyOptional({
    description:
      "Response code from the entity. Example: '0190' for accepted, '208' for cancelled by user.",
    example: "0190",
  })
  @IsString()
  @IsOptional()
  Ds_Code?: string;

  @ApiPropertyOptional({
    description: "Masked card number (last four digits).",
    example: "XXXX", // Documentation example, usually like "4242"
  })
  @IsString()
  @IsOptional()
  Ds_PanMask?: string;

  @ApiPropertyOptional({
    description: "Card expiry date. Format: YYMM",
    example: "2512", // December 2025
  })
  @IsString()
  @IsOptional()
  Ds_Expiry?: string;

  @ApiPropertyOptional({
    description: "Transaction date and time. Format: YYMMDDHHMMSS",
    example: "250522173050", // 22 May 2025, 17:30:50
  })
  @IsString()
  @IsOptional()
  Ds_Date?: string; // Consolidates previous ds_Date and ds_Hour

  @ApiPropertyOptional({
    description: "Merchant code (FUC).",
    example: "MERCHANT001",
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_MerchantCode?: string;

  @ApiPropertyOptional({
    description:
      "3DSecure/SecureCode result. 100: Authenticated, 50: Not Authenticated (secure), 0: Not Authenticated.",
    example: "100",
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_Guarantees?: string;

  @ApiPropertyOptional({
    description: "Signature of the response for validation.",
    example: "e463ertg572f18873df54353b094fe2aswq147a7",
  })
  @IsString()
  @IsOptional()
  Ds_Signature?: string;

  @ApiPropertyOptional({
    description: "Transaction ID for recurrent operations (Subscriptions).",
    example: "SUB001TXN12345",
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_TransactionID?: string;

  @ApiPropertyOptional({
    description: "Terminal number.",
    example: "1",
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_Terminal?: string; // Was in old DTO, matches a request field, might be in response

  @ApiPropertyOptional({
    description: "Currency code (ISO 4217). Example: 978 for EUR.",
    example: "978",
  })
  @IsString()
  @IsOptional()
  Ds_Currency?: string; // Was in old DTO, matches a request field, might be in response

  // Optional additional data (if requested from Tefpay)
  @ApiPropertyOptional({
    description: "Card issuing country (ISO 3166-1 alpha-3). Additional data.",
    example: "ESP",
  })
  @IsString()
  @IsOptional()
  Ds_CostumerCreditCardCountry?: string; // Renamed from ds_Card_Country

  @ApiPropertyOptional({
    description: "Card brand (e.g., VISA, MASTERCARD). Additional data.",
    example: "VISA",
  })
  @IsString()
  @IsOptional()
  Ds_CostumerCreditCardBrand?: string;

  @ApiPropertyOptional({
    description:
      "Card type (e.g., C for Credit, D for Debit). Additional data.",
    example: "C",
  })
  @IsString()
  @IsOptional()
  Ds_CostumerCreditCardType?: string; // Renamed from ds_Card_Type (CR, DB in old DTO)

  @ApiPropertyOptional({
    description:
      "Card expiry date from additional data. Format might differ, ensure consistency or parse as needed.",
    example: "12/25",
  })
  @IsString()
  @IsOptional()
  Ds_CostumerCreditCardExpiryDate?: string;

  @ApiPropertyOptional({
    description: "Unique card identifier from Tefpay. Additional data.",
    example: "CARDID123456789",
  })
  @IsString()
  @IsOptional()
  Ds_CostumerCreditCardId?: string;

  @ApiPropertyOptional({
    description: "Card BIN (Bank Identification Number). Additional data.",
    example: "454881",
  })
  @IsString()
  @IsOptional()
  Ds_CostumerCreditCardBin?: string;

  @ApiPropertyOptional({
    description: "Cardholder name. Additional data.",
    example: "John Doe",
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_UserName?: string;

  // Deprecated/Replaced fields from original DTO (kept for reference during transition, might remove later)
  // ds_Order: Replaced by Ds_Merchant_MatchingData as primary
  // ds_Hour: Merged into Ds_Date
  // ds_SecurePayment: Replaced by Ds_Merchant_Guarantees

  // Internal application fields
  @ApiProperty({
    description: "Raw notification payload from TefPay (original POST body)",
  })
  @IsObject()
  @IsNotEmpty()
  raw_notification: any;

  @ApiProperty({
    description: "Processing status of the notification (internal)",
    enum: TefPayNotificationStatus,
    example: TefPayNotificationStatus.PROCESSED,
  })
  @IsEnum(TefPayNotificationStatus)
  @IsNotEmpty()
  status: TefPayNotificationStatus;

  @ApiPropertyOptional({
    description:
      "Notes regarding the processing of the notification (internal)",
  })
  @IsString()
  @IsOptional()
  processing_notes?: string;

  @ApiProperty({ description: "Timestamp of notification creation (internal)" })
  @IsDateString()
  @IsNotEmpty()
  createdAt: Date;

  @ApiProperty({
    description: "Timestamp of last notification update (internal)",
  })
  @IsDateString()
  @IsNotEmpty()
  updatedAt: Date;
}
