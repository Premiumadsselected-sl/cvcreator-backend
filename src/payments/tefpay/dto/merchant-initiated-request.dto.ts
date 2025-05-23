import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsEnum } from "class-validator";
import { BaseTefpayRequestDto } from "./base-tefpay-request.dto";
import { TefpayBooleanLike } from "../common/tefpay.enums";

export class MerchantInitiatedRequestDto extends BaseTefpayRequestDto {
  @ApiProperty({
    description: "Date of the original transaction. Format: YYMMDDHHMMSS",
    example: "240522103000", // Example: 22 May 2024, 10:30:00
  })
  @IsString()
  @IsNotEmpty()
  Ds_Date: string; // This is Ds_Date from the *original* transaction response (token part)

  @ApiProperty({
    description: "Masked PAN of the original transaction.",
    example: "4242", // Example last four digits
  })
  @IsString()
  @IsNotEmpty()
  Ds_Merchant_PanMask: string; // This is Ds_PanMask from the *original* transaction response (token part)

  @ApiPropertyOptional({
    description:
      "Indicates if the transaction is recurrent. 'S' for Yes, 'N' for No.",
    enum: TefpayBooleanLike,
    example: "S", // Corrected: Use string literal 'S' for example
  })
  @IsEnum(TefpayBooleanLike)
  @IsOptional()
  Ds_Merchant_Recurrency?: TefpayBooleanLike;

  @ApiPropertyOptional({
    description:
      "System Transaction Reference (Referencia de Transacción de Sistema). Required for T207 (Confirm Preauth) or T218 (Cancel Preauth). This is the Ds_Merchant_MatchingData of the preauthorization to confirm/cancel.",
    example: "240521103000123456789",
  })
  @IsString()
  @IsOptional()
  Ds_Merchant_Preauth_RTS?: string;
}
