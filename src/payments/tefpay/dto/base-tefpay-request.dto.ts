import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  Length,
} from "class-validator";
import {
  TefpayTransactionType,
  TefpayLanguage,
  TefpayCurrency,
  //TefpayTemplateNumber,
  TefpayBooleanLike,
} from "../common/tefpay.enums";

export class BaseTefpayRequestDto {
  @ApiProperty({
    description: "Merchant code provided by the bank.",
    example: "V99008980",
  })
  @IsString()
  @IsNotEmpty()
  Ds_Merchant_MerchantCode: string;

  @ApiProperty({
    description: "Transaction type code.",
    enum: TefpayTransactionType,
  })
  @IsEnum(TefpayTransactionType)
  @IsNotEmpty()
  Ds_Merchant_TransactionType: TefpayTransactionType;

  @ApiProperty({
    description:
      "Transaction amount. Last two digits are decimals. Example: 1000 means 10.00",
    example: "1000",
  })
  @IsString() // Tefpay expects this as a string
  @IsNotEmpty()
  Ds_Merchant_Amount: string;

  @ApiProperty({
    description: "Unique order identifier. 21 numeric characters.",
    example: "240522103000123456789",
    maxLength: 21,
  })
  @IsString()
  @IsNotEmpty()
  @Length(21, 21) // Assuming it must be exactly 21. Documentation says "compuesto de 21 caracteres numéricos"
  Ds_Merchant_MatchingData: string;

  @ApiProperty({
    description: "SHA-1 verification algorithm.",
    example: "f194a86020dacda6d2f26a8611dd23119cc30ad9",
  })
  @IsString()
  @IsNotEmpty()
  Ds_Merchant_MerchantSignature: string;

  @ApiPropertyOptional({
    description: "URL where Tefpay will send the callback notification.",
    example: "https://www.example.com/tefpay/notification",
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_Url?: string;

  @ApiPropertyOptional({
    description: "Terminal number assigned by your bank. 8 numeric characters.",
    example: "00000001",
    maxLength: 8,
  })
  @IsString()
  @IsOptional()
  @Length(8, 8)
  Ds_Merchant_Terminal?: string;

  @ApiPropertyOptional({
    description: "Currency for the transaction.",
    enum: TefpayCurrency,
    example: TefpayCurrency.EUR,
  })
  @IsEnum(TefpayCurrency)
  @IsOptional()
  Ds_Merchant_Currency?: TefpayCurrency;

  // Optional fields from documentation that might be common
  @ApiPropertyOptional({
    description: "Product description to be shown on the hosted page.",
    example: "Subscription to Premium Plan",
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_Description?: string;

  @ApiPropertyOptional({
    description: "Cardholder name.",
    example: "Alfonso Gonzalo",
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_UserName?: string;

  @ApiPropertyOptional({
    description: "Language for the hosted page.",
    enum: TefpayLanguage,
    example: TefpayLanguage.SPANISH,
  })
  @IsEnum(TefpayLanguage)
  @IsOptional()
  Ds_Merchant_Lang?: TefpayLanguage;

  @ApiPropertyOptional({
    description:
      "Indicates if operations can be performed as COF (Card On File) for EMV3DS authentication. 'S' for Yes, 'N' for No.",
    enum: TefpayBooleanLike,
    example: "S", // Corrected: Use string literal 'S' for example
  })
  @IsEnum(TefpayBooleanLike)
  @IsOptional() // Mandatory if recurring operations are intended later, optional otherwise.
  Ds_Merchant_Subscription_Enable?: TefpayBooleanLike;
}
