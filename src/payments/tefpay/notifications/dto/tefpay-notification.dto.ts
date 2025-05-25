import { IsString, IsOptional, IsNotEmpty } from "class-validator";

export class TefPayNotificationDto {
  @IsString()
  @IsOptional() // Ds_SignatureVersion ahora es opcional y no necesita ser no vacío por defecto.
  Ds_SignatureVersion?: string;

  @IsString()
  @IsOptional()
  Ds_MerchantParameters?: string;

  @IsString()
  @IsNotEmpty() // La firma siempre debe estar presente
  Ds_Signature: string;

  // Campos adicionales de Tefpay esperados directamente en el payload
  @IsString()
  @IsOptional()
  Ds_Merchant_MatchingData?: string;

  @IsString()
  @IsOptional()
  Ds_Order?: string;

  @IsString()
  @IsOptional()
  Ds_Response?: string; // Código de respuesta de la transacción (ej. "0000")

  @IsString()
  @IsOptional()
  Ds_Code?: string; // Código de resultado alternativo (similar a Ds_Response)

  @IsString()
  @IsOptional()
  Ds_Merchant_Subscription_Account?: string;

  @IsString()
  @IsOptional()
  Ds_Merchant_Subscription_Action?: string; // NUEVO CAMPO: Acción de suscripción (ej. C, S, O)

  @IsString()
  @IsOptional()
  Ds_Merchant_TransactionID?: string;

  // --- Campos añadidos/corregidos según el informe técnico ---
  @IsString()
  @IsOptional()
  Ds_Amount?: string; // Añadido

  @IsString()
  @IsOptional()
  Ds_Message?: string; // Añadido

  @IsString()
  @IsOptional()
  Ds_Merchant_Url?: string; // Añadido
  // --- Fin campos añadidos/corregidos ---

  // Otros campos comunes que Tefpay podría enviar
  @IsString()
  @IsOptional()
  Ds_Date?: string;

  @IsString()
  @IsOptional()
  Ds_Hour?: string;

  @IsString()
  @IsOptional()
  Ds_Currency?: string;

  @IsString()
  @IsOptional()
  Ds_Merchant_Terminal?: string; // Corregido (antes Ds_Terminal)

  @IsString()
  @IsOptional()
  Ds_Card_Country?: string;

  @IsString()
  @IsOptional()
  Ds_Merchant_MerchantCode?: string; // Corregido (antes Ds_MerchantCode)

  @IsString()
  @IsOptional()
  Ds_SecurePayment?: string;

  @IsString()
  @IsOptional()
  Ds_Merchant_TransactionType?: string; // Corregido (antes Ds_TransactionType)

  @IsString()
  @IsOptional()
  Ds_AuthorisationCode?: string;

  @IsString()
  @IsOptional()
  Ds_ProcessedPayMethod?: string;

  // Otros campos que Tefpay podría enviar (ejemplos, verificar con documentación de Tefpay)
  @IsString()
  @IsOptional()
  Ds_Card_Type?: string; // CR, DB

  @IsString()
  @IsOptional()
  Ds_Merchant_Data?: string; // Campo genérico de datos del comercio

  @IsString()
  @IsOptional()
  Ds_Error?: string; // Código de error específico si Ds_Response/Ds_Code indica fallo

  // Permite cualquier otra propiedad que Tefpay pueda enviar.
  // Es preferible definir explícitamente todas las propiedades conocidas.
  [key: string]: any;
}
