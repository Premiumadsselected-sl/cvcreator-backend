import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsObject } from "class-validator";

// DTO for the actual data received from Tefpay
export class TefpayIncomingNotificationDto {
  @ApiPropertyOptional({
    description: "Amount of the transaction. Last two digits are decimals.",
  })
  @IsString()
  @IsOptional()
  Ds_Amount?: string;

  @ApiPropertyOptional({ description: "Merchant's order identifier." })
  @IsString()
  @IsOptional()
  Ds_Merchant_MatchingData?: string;

  @ApiPropertyOptional({
    description: "Bank authorisation code for the transaction.",
  })
  @IsString()
  @IsOptional()
  Ds_AuthorisationCode?: string;

  @ApiPropertyOptional({
    description: "Bank code that processed the transaction.",
  })
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

  @ApiPropertyOptional({
    description: "Signature of the response for validation.",
  })
  @IsString()
  @IsOptional()
  Ds_Signature?: string;

  @ApiPropertyOptional({
    description: "Transaction ID for recurrent operations (Subscriptions).",
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_TransactionID?: string;

  @ApiPropertyOptional({
    description: "Subscription account identifier for recurrent operations.",
  })
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

  // Optional additional data
  @ApiPropertyOptional({
    description: "Card issuing country (ISO 3166-1 alpha-3).",
  })
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

  @ApiPropertyOptional({
    description: "Card expiry date from additional data.",
  })
  @IsString()
  @IsOptional()
  Ds_CostumerCreditCardExpiryDate?: string;

  @ApiPropertyOptional({ description: "Unique card identifier from Tefpay." })
  @IsString()
  @IsOptional()
  Ds_CostumerCreditCardId?: string;

  @ApiPropertyOptional({
    description: "Card BIN (Bank Identification Number).",
  })
  @IsString()
  @IsOptional()
  Ds_CostumerCreditCardBin?: string;

  @ApiPropertyOptional({ description: "Cardholder name." })
  @IsString()
  @IsOptional()
  Ds_Merchant_UserName?: string;

  // It's good practice to capture any other fields Tefpay might send, even if not explicitly defined.
  // This allows for flexibility and logging of unexpected data.
  [key: string]: any;
}
