import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsObject,
} from "class-validator";

export enum TefPayNotificationStatus {
  RECEIVED = "received",
  PROCESSING = "processing", // Added
  PROCESSED = "processed",
  PROCESSED_UNHANDLED = "processed_unhandled", // Added
  ERROR = "error",
  SIGNATURE_FAILED = "signature_failed",
  SIGNATURE_MISSING = "signature_missing", // Added
}

// This DTO now represents the structure of the TefPayNotification entity in the database
// and is used internally, not directly for validating incoming Tefpay POST requests.
export class TefPayNotificationDto {
  @ApiProperty({
    description: "Notification unique identifier (internal)",
    example: "tpn_a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  // Fields from TefPay Notification (all optional as they might not be present in all notifications)
  @ApiPropertyOptional({ description: "Amount of the transaction." })
  @IsString()
  @IsOptional()
  Ds_Amount?: string;

  @ApiPropertyOptional({ description: "Merchant's order identifier." })
  @IsString()
  @IsOptional()
  Ds_Merchant_MatchingData?: string;

  @ApiPropertyOptional({ description: "Bank authorisation code." })
  @IsString()
  @IsOptional()
  Ds_AuthorisationCode?: string;

  @ApiPropertyOptional({ description: "Bank code." })
  @IsString()
  @IsOptional()
  Ds_Bank?: string;

  @ApiPropertyOptional({ description: "Transaction type code." })
  @IsString()
  @IsOptional()
  Ds_Merchant_TransactionType?: string;

  @ApiPropertyOptional({ description: "Response message from TefPay." })
  @IsString()
  @IsOptional()
  Ds_Message?: string;

  @ApiPropertyOptional({ description: "Response code from the entity." })
  @IsString()
  @IsOptional()
  Ds_Code?: string;

  @ApiPropertyOptional({ description: "Masked card number." })
  @IsString()
  @IsOptional()
  Ds_PanMask?: string;

  @ApiPropertyOptional({ description: "Card expiry date. Format: YYMM" })
  @IsString()
  @IsOptional()
  Ds_Expiry?: string;

  @ApiPropertyOptional({
    description: "Transaction date and time. Format: YYMMDDHHMMSS",
  })
  @IsString()
  @IsOptional()
  Ds_Date?: string;

  @ApiPropertyOptional({ description: "Merchant code (FUC)." })
  @IsString()
  @IsOptional()
  Ds_Merchant_MerchantCode?: string;

  @ApiPropertyOptional({ description: "3DSecure/SecureCode result." })
  @IsString()
  @IsOptional()
  Ds_Merchant_Guarantees?: string;

  @ApiPropertyOptional({ description: "Signature of the response." })
  @IsString()
  @IsOptional()
  Ds_Signature?: string;

  @ApiPropertyOptional({
    description: "Transaction ID for recurrent operations.",
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_TransactionID?: string;

  @ApiPropertyOptional({ description: "Subscription account identifier." })
  @IsString()
  @IsOptional()
  Ds_Merchant_Subscription_Account?: string;

  @ApiPropertyOptional({ description: "Action performed on the subscription." })
  @IsString()
  @IsOptional()
  Ds_Merchant_Subscription_Action?: string;

  @ApiPropertyOptional({ description: "Terminal number." })
  @IsString()
  @IsOptional()
  Ds_Merchant_Terminal?: string;

  @ApiPropertyOptional({ description: "Currency code (ISO 4217)." })
  @IsString()
  @IsOptional()
  Ds_Currency?: string;

  @ApiPropertyOptional({ description: "Card issuing country." })
  @IsString()
  @IsOptional()
  Ds_CostumerCreditCardCountry?: string;

  @ApiPropertyOptional({ description: "Card brand." })
  @IsString()
  @IsOptional()
  Ds_CostumerCreditCardBrand?: string;

  @ApiPropertyOptional({ description: "Card type." })
  @IsString()
  @IsOptional()
  Ds_CostumerCreditCardType?: string;

  @ApiPropertyOptional({ description: "Card expiry date (additional data)." })
  @IsString()
  @IsOptional()
  Ds_CostumerCreditCardExpiryDate?: string;

  @ApiPropertyOptional({ description: "Unique card identifier from Tefpay." })
  @IsString()
  @IsOptional()
  Ds_CostumerCreditCardId?: string;

  @ApiPropertyOptional({ description: "Card BIN." })
  @IsString()
  @IsOptional()
  Ds_CostumerCreditCardBin?: string;

  @ApiPropertyOptional({ description: "Cardholder name." })
  @IsString()
  @IsOptional()
  Ds_Merchant_UserName?: string;

  // Internal application fields
  @ApiProperty({
    description: "Raw notification payload from TefPay (original POST body)",
  })
  @IsObject() // Should still be an object
  @IsNotEmpty() // This will be populated by the service
  raw_notification: any; // Or consider a more specific type if the structure is known

  @ApiProperty({
    description: "Processing status of the notification (internal)",
    enum: TefPayNotificationStatus,
  })
  @IsEnum(TefPayNotificationStatus)
  @IsNotEmpty() // This will be set by the service
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
  @IsNotEmpty() // This will be set by the service
  createdAt: Date;

  @ApiProperty({
    description: "Timestamp of last notification update (internal)",
  })
  @IsDateString()
  @IsNotEmpty() // This will be set by the service
  updatedAt: Date;

  // Fields from Prisma schema that might not be directly from Tefpay but are part of the entity
  @ApiPropertyOptional({ description: "ID of the associated payment record." })
  @IsUUID()
  @IsOptional()
  payment_id?: string;

  @ApiPropertyOptional({
    description: "ID of the associated subscription record.",
  })
  @IsUUID()
  @IsOptional()
  subscription_id?: string;

  // Optional: Add other fields from your Prisma model TefPayNotification if they are used in DTO contexts
  // For example, ds_Order, ds_SecurePayment etc. if they are distinct and needed beyond raw_notification
  // However, for the purpose of this DTO representing the entity, having them in raw_notification
  // and explicitly listed if they are frequently accessed or validated is a design choice.
  // For now, keeping it aligned with the previous structure plus Prisma fields.

  @ApiPropertyOptional({ description: "Original order number from merchant." })
  @IsString()
  @IsOptional()
  ds_Order?: string;

  @ApiPropertyOptional({ description: "Date of the transaction from Tefpay." })
  @IsString()
  @IsOptional()
  ds_TransactionDate?: string;

  @ApiPropertyOptional({ description: "Client reference if sent." })
  @IsString()
  @IsOptional()
  ds_ClientRef?: string;

  @ApiPropertyOptional({ description: "Detailed bank error code." })
  @IsString()
  @IsOptional()
  ds_CodeBank?: string;

  @ApiPropertyOptional({
    description: "URL to which Tefpay sent the notification.",
  })
  @IsString()
  @IsOptional()
  ds_Merchant_Url?: string;
}
