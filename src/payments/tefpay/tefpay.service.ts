import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import * as crypto from "crypto";
import {
  IPaymentProcessor,
  PreparePaymentParams,
  PreparedPaymentResponse,
  SubscriptionCancellationResponse,
  ProcessedNotificationResponse,
} from "../processors/payment-processor.interface";

interface TefpayPaymentParams {
  Ds_Merchant_Amount: string;
  // Ds_Merchant_Order: string; // Eliminado según feedback, no se envía a Tefpay
  Ds_Merchant_MerchantCode: string;
  Ds_Merchant_Currency: string;
  Ds_Merchant_TransactionType: string;
  Ds_Merchant_Terminal: string;
  Ds_Merchant_MerchantURL: string;
  Ds_Merchant_UrlOK: string;
  Ds_Merchant_UrlKO: string;
  Ds_Merchant_MerchantSignature: string;
  Ds_Merchant_ConsumerLanguage?: string; // Usado para el idioma del TPV
  Ds_Merchant_ProductDescription?: string;
  Ds_Merchant_Titular?: string; // Nombre del titular de la tarjeta
  Ds_Merchant_MerchantData?: string; // Datos adicionales para el comercio
  // Campos de suscripción anteriores (reemplazados o ajustados por los nuevos)
  // Ds_Merchant_DateFrecuency?: string;
  // Ds_Merchant_ChargeExpiryDate?: string;
  // Ds_Merchant_SumTotal?: string;
  // Ds_Merchant_Identifier?: string; // Reemplazado por Ds_Merchant_Subscription_Account

  // Nuevos campos del formulario proporcionado
  Ds_Merchant_Subscription_ProcessingMethod?: string;
  Ds_Merchant_Subscription_Action?: string;
  Ds_Merchant_Subscription_ChargeAmount?: string;
  Ds_Merchant_Subscription_RelFirstCharge?: string;
  Ds_Merchant_Subscription_PeriodType?: string;
  Ds_Merchant_Subscription_PeriodInterval?: string;
  Ds_Merchant_TerminalAuth?: string;
  Ds_Merchant_Subscription_Iteration?: string;
  Ds_Merchant_MerchantCodeTemplate?: string;
  Ds_Merchant_TemplateNumber?: string;
  Ds_Merchant_AdditionalData?: string;
  Ds_Merchant_MatchingData?: string; // Ya estaba, pero para confirmar
  Ds_Merchant_Subscription_Account?: string;
  Ds_Merchant_Subscription_ClientName?: string;
  Ds_Merchant_Subscription_ClientEmail?: string;
  Ds_Merchant_Subscription_Description?: string;
  Ds_Merchant_Subscription_NotifyCostumerByEmail?: string;
  Ds_Merchant_Lang?: string; // Idioma para Tefpay (diferente de ConsumerLanguage)
  Ds_Merchant_Subscription_Enable?: string;
  Ds_Merchant_Description?: string; // Descripción general del pago
}

// Helper type for the specific fields used in calculateFormSignature
type TefpayFormSignatureFields = Pick<
  TefpayPaymentParams,
  "Ds_Merchant_Amount" | "Ds_Merchant_MerchantCode" | "Ds_Merchant_MerchantURL" // This corresponds to Ds_Merchant_Url in the new recipe
> & { Ds_Merchant_MatchingData: string }; // Ds_Merchant_MatchingData es crucial para la firma del FORM

@Injectable()
export class TefpayService implements IPaymentProcessor {
  private readonly logger = new Logger(TefpayService.name);
  private tefpayUrl: string;
  private tefpayBackofficeUrl: string;
  private tefpayMerchantCode: string;
  private tefpayPrivateKey: string;
  private tefpayUrlOk: string;
  private tefpayUrlKo: string;
  private appBaseUrl: string;
  private tefpayDefaultTerminal: string;
  private tefpayDefaultAmount: string | undefined;
  private tefpayNotifyUrl: string | undefined;

  // Nuevas variables de configuración para campos estáticos del formulario
  private tefpayTransactionTypeSubscription: string;
  private tefpaySubProcessingMethod: string;
  private tefpaySubAction: string;
  private tefpaySubRelFirstCharge: string;
  private tefpaySubPeriodType: string;
  private tefpaySubPeriodInterval: string;
  private tefpaySubIteration: string;
  private tefpayMerchantCodeTemplate: string | undefined;
  private tefpayTemplateNumber: string | undefined;
  private tefpayAdditionalData: string | undefined;
  private tefpaySubNotifyCustomerEmail: string;
  private tefpaySubEnable: string;
  private tefpayTerminalAuth: string | undefined; // Puede ser dinámico o de config

  constructor(private configService: ConfigService) {
    // Helper function to get config values and throw if not found
    const getConfigOrThrow = (key: string, defaultValue?: string): string => {
      const value = this.configService.get<string>(key);
      if (value === undefined) {
        if (defaultValue !== undefined) {
          this.logger.warn(
            `Configuration key ${key} is missing, using default value: ${defaultValue}`
          );
          return defaultValue;
        }
        this.logger.error(`Configuration key ${key} is missing.`);
        throw new Error(`Configuration key ${key} is missing.`);
      }
      return value;
    };

    this.tefpayUrl = getConfigOrThrow("TEFPAY_FORM_URL");
    this.tefpayBackofficeUrl = getConfigOrThrow("TEFPAY_BACKOFFICE_URL");
    this.tefpayMerchantCode = getConfigOrThrow("TEFPAY_MERCHANT_CODE");
    this.tefpayDefaultTerminal = getConfigOrThrow("TEFPAY_TERMINAL", "1");
    this.tefpayPrivateKey = getConfigOrThrow("TEFPAY_PRIVATE_KEY");
    this.tefpayUrlOk = getConfigOrThrow("TEFPAY_DEFAULT_SUCCESS_URL");
    this.tefpayUrlKo = getConfigOrThrow("TEFPAY_DEFAULT_CANCEL_URL");
    this.appBaseUrl = getConfigOrThrow("APP_BASE_URL");
    this.tefpayDefaultAmount =
      this.configService.get<string>("TEFPAY_DS_AMOUNT");
    this.tefpayNotifyUrl = this.configService.get<string>("TEFPAY_NOTIFY_URL");

    // Cargar nuevas configuraciones estáticas
    this.tefpayTransactionTypeSubscription = getConfigOrThrow(
      "TEFPAY_TRANSACTION_TYPE_SUBSCRIPTION",
      "6"
    );
    this.tefpaySubProcessingMethod = getConfigOrThrow(
      "TEFPAY_SUB_PROCESSING_METHOD",
      "201"
    );
    this.tefpaySubAction = getConfigOrThrow("TEFPAY_SUB_ACTION", "C"); // ADVERTENCIA: "C" es inusual para creación. Verificar con Tefpay.
    this.tefpaySubRelFirstCharge = getConfigOrThrow(
      "TEFPAY_SUB_REL_FIRST_CHARGE",
      "02D"
    );
    this.tefpaySubPeriodType = getConfigOrThrow("TEFPAY_SUB_PERIOD_TYPE", "M");
    this.tefpaySubPeriodInterval = getConfigOrThrow(
      "TEFPAY_SUB_PERIOD_INTERVAL",
      "1"
    );
    this.tefpaySubIteration = getConfigOrThrow("TEFPAY_SUB_ITERATION", "0");
    this.tefpayMerchantCodeTemplate = this.configService.get<string>(
      "TEFPAY_MERCHANT_CODE_TEMPLATE"
    );
    this.tefpayTemplateNumber = this.configService.get<string>(
      "TEFPAY_TEMPLATE_NUMBER"
    ); // Ej: "07"
    this.tefpayAdditionalData = this.configService.get<string>(
      "TEFPAY_ADDITIONAL_DATA"
    ); // Ej: "1"
    this.tefpaySubNotifyCustomerEmail = getConfigOrThrow(
      "TEFPAY_SUB_NOTIFY_CUSTOMER_EMAIL",
      "0"
    );
    this.tefpaySubEnable = getConfigOrThrow("TEFPAY_SUB_ENABLE", "1");
    this.tefpayTerminalAuth = this.configService.get<string>(
      "TEFPAY_TERMINAL_AUTH"
    );

    if (
      this.tefpayPrivateKey === "TEST_PRIVATE_KEY" ||
      this.tefpayPrivateKey === "TEST_PRIVATE_KEY_ABCDEFG123456XYZ"
    ) {
      this.logger.warn(
        "TefpayService is using a test private key. Ensure this is intentional for development/testing."
      );
    }
    // The warning for TEFPAY_SUB_ACTION === 'C' has been removed as the user confirmed
    // that 'C' is the correct value for subscription creation in their specific Tefpay integration.
    // Original warning logic:
    // if (this.tefpaySubAction === "C") {
    //   this.logger.warn(
    //     "TEFPAY_SUB_ACTION is configured as 'C'. This is unusual for subscription creation and typically means 'Charge' or 'Cancel'. Please verify this value with Tefpay documentation for your specific template."
    //   );
    // }
  }

  // FORM SIGNATURE (SHA1 - for payment redirection form)
  private calculateFormSignature(fields: TefpayFormSignatureFields): string {
    // New recipe: Ds_Amount + Ds_Merchant_MerchantCode + Ds_Merchant_MatchingData + Ds_Merchant_Url + TEFPAY_PRIVATE_KEY
    // Ds_Merchant_Url in the recipe corresponds to fields.Ds_Merchant_MerchantURL here.
    const signatureBaseString = `${fields.Ds_Merchant_Amount}${fields.Ds_Merchant_MerchantCode}${fields.Ds_Merchant_MatchingData}${fields.Ds_Merchant_MerchantURL}${this.tefpayPrivateKey}`;
    const calculatedSignature = crypto
      .createHash("sha1")
      .update(signatureBaseString)
      .digest("hex");
    this.logger.debug(
      `Calculating FORM signature (SHA1). Base: ${signatureBaseString.replace(this.tefpayPrivateKey, "[SECRET_KEY]")}, Signature: ${calculatedSignature}`
    );
    return calculatedSignature;
  }

  // S2S NOTIFICATION SIGNATURE (SHA1 - for incoming webhooks)
  verifySignature(payload: Record<string, string>): boolean {
    const receivedSignature = payload.Ds_Signature;

    if (!receivedSignature) {
      this.logger.warn(
        "Tefpay S2S Notification: Ds_Signature missing in payload."
      );
      return false;
    }
    this.logger.debug(
      `Tefpay S2S Notification: Received Ds_Signature for verification: ${receivedSignature}`
    );

    // Componentes para la firma SHA1 S2S según la fórmula:
    // Ds_Amount + Ds_Merchant_MerchantCode + Ds_Merchant_MatchingData + Ds_Merchant_Url + TEFPAY_PRIVATE_KEY

    const amount = payload.Ds_Amount || this.tefpayDefaultAmount;
    const merchantCode =
      payload.Ds_Merchant_MerchantCode || this.tefpayMerchantCode;

    // Fallback para Ds_Merchant_MatchingData: payload.Ds_Merchant_MatchingData || payload.Ds_Merchant_Subscription_Account
    let matchingData = payload.Ds_Merchant_MatchingData;
    if (!matchingData) {
      this.logger.debug(
        "Tefpay S2S Notification: Ds_Merchant_MatchingData not found in payload, attempting fallback to Ds_Merchant_Subscription_Account for signature verification."
      );
      matchingData = payload.Ds_Merchant_Subscription_Account;
    }

    const callbackUrl = payload.Ds_Merchant_Url || this.tefpayNotifyUrl;
    const merchantSharedKey = this.tefpayPrivateKey;

    // Log de los componentes que se usarán para la firma
    this.logger.debug(
      `Tefpay S2S SHA1 Signature Components:
        Ds_Amount (used): ${amount || "MISSING_OR_EMPTY"} (from payload: ${payload.Ds_Amount}, fallback from env: ${this.tefpayDefaultAmount})
        Ds_Merchant_MerchantCode (used): ${merchantCode || "MISSING_OR_EMPTY"} (from payload: ${payload.Ds_Merchant_MerchantCode}, fallback from env: ${this.tefpayMerchantCode})
        Ds_Merchant_MatchingData (used): ${matchingData || "MISSING_OR_EMPTY"} (from payload.Ds_Merchant_MatchingData: ${payload.Ds_Merchant_MatchingData}, fallback from payload.Ds_Merchant_Subscription_Account: ${payload.Ds_Merchant_Subscription_Account})
        Ds_Merchant_Url (used): ${callbackUrl || "MISSING_OR_EMPTY"} (from payload: ${payload.Ds_Merchant_Url}, fallback from env: ${this.tefpayNotifyUrl})
        TEFPAY_PRIVATE_KEY: [SECRET_KEY]`
    );

    if (!amount) {
      this.logger.warn(
        "Tefpay S2S Notification: Amount (Ds_Amount from payload or TEFPAY_DS_AMOUNT from .env) is missing. Cannot calculate SHA1 signature."
      );
      return false;
    }
    if (!merchantCode) {
      this.logger.warn(
        "Tefpay S2S Notification: MerchantCode (Ds_Merchant_MerchantCode from payload or TEFPAY_MERCHANT_CODE from .env) is missing. Cannot calculate SHA1 signature."
      );
      return false;
    }
    if (!matchingData) {
      this.logger.warn(
        "Tefpay S2S Notification: MatchingData (Ds_Merchant_MatchingData or Ds_Merchant_Subscription_Account from payload) is MISSING. Cannot calculate SHA1 signature."
      );
      return false;
    }
    if (!callbackUrl) {
      this.logger.warn(
        "Tefpay S2S Notification: CallbackUrl (Ds_Merchant_Url from payload or TEFPAY_NOTIFY_URL from .env) is missing. Cannot calculate SHA1 signature."
      );
      return false;
    }
    // La presencia de la clave privada se verifica implícitamente en el constructor mediante getConfigOrThrow

    const signatureBaseString =
      amount + merchantCode + matchingData + callbackUrl + merchantSharedKey;

    this.logger.debug(
      `Tefpay S2S Notification: SHA1 Signature Base String (raw): ${signatureBaseString.replace(merchantSharedKey, "[SECRET_KEY]")}`
    );
    this.logger.debug(
      `Tefpay S2S Notification: SHA1 Signature Base (concatenated values): ${amount}+${merchantCode}+${matchingData}+${callbackUrl}+[SECRET_KEY]`
    );

    const calculatedSignature = crypto
      .createHash("sha1")
      .update(signatureBaseString)
      .digest("hex");

    this.logger.debug(
      `Tefpay S2S Notification: Calculated SHA1 Signature: ${calculatedSignature}, Received Ds_Signature: ${receivedSignature}`
    );

    if (calculatedSignature.toLowerCase() === receivedSignature.toLowerCase()) {
      this.logger.log(
        `Tefpay S2S SHA1 Signature VERIFIED for MatchingData: ${matchingData}.`
      );
      return true;
    } else {
      this.logger.warn(
        `Tefpay S2S SHA1 Signature FAILED for MatchingData: ${matchingData}. Expected (SHA1): ${calculatedSignature}, Got: ${receivedSignature}`
      );
      return false;
    }
  }

  preparePaymentParameters(
    params: PreparePaymentParams
  ): PreparedPaymentResponse {
    const {
      amount, // Este es el Ds_Merchant_Amount (trial_amount del frontend)
      currency,
      order, // Este es el payment_code de nuestro sistema, NO se envía como Ds_Merchant_Order
      product_description, // Usado para Ds_Merchant_Description y/o Ds_Merchant_Subscription_Description
      success_url,
      cancel_url,
      notification_url, // Esta es la URL para Ds_Merchant_Url (notificación S2S de nuestro sistema)
      locale, // Usado para Ds_Merchant_Lang y Ds_Merchant_ConsumerLanguage
      tefpayTerminal: requestedTerminal, // Para Ds_Merchant_Terminal
      customer_email, // Para Ds_Merchant_Subscription_ClientEmail
      metadata, // Para otros campos dinámicos (customerName, subscriptionChargeAmount, etc.)
    } = params;

    // Convertir el importe a céntimos para Tefpay
    // Ej: si amount es 49.99 (EUR), se convierte a 4999
    const amountInCents = Math.round(amount * 100);
    const amountString = amountInCents.toString();
    const system_payment_code = order; // Para logging, MerchantData y URLs OK/KO

    const formMatchingData = String(
      new Date().toISOString().replace(/[^0-9]/g, "")
    ).padEnd(21, "0");
    this.logger.debug(
      `Generated Ds_Merchant_MatchingData for FORM: ${formMatchingData}`
    );

    let terminalToUse = this.tefpayDefaultTerminal;
    if (requestedTerminal) {
      terminalToUse = requestedTerminal;
    } else if (locale) {
      // Lógica simple para derivar terminal de locale, ajustar según necesidad
      if (locale.startsWith("es")) {
        terminalToUse =
          this.configService.get<string>("TEFPAY_TERMINAL_ES") ||
          this.tefpayDefaultTerminal;
      } else if (locale.startsWith("en")) {
        terminalToUse =
          this.configService.get<string>("TEFPAY_TERMINAL_EN") ||
          this.tefpayDefaultTerminal;
      }
    }
    this.logger.debug(
      `Using Tefpay Terminal: ${terminalToUse} for locale: ${locale}`
    );

    const finalSuccessUrl = success_url || this.tefpayUrlOk;
    const finalCancelUrl = cancel_url || this.tefpayUrlKo;
    const urlOkWithPaymentCode = new URL(finalSuccessUrl);
    urlOkWithPaymentCode.searchParams.append(
      "payment_code",
      system_payment_code
    );
    const urlKoWithError = new URL(finalCancelUrl);
    urlKoWithError.searchParams.append("payment_code", system_payment_code);
    urlKoWithError.searchParams.append(
      "error_identifier",
      "TEFPAY_FORM_CANCEL"
    );

    // Determinar el idioma para Ds_Merchant_Lang y Ds_Merchant_ConsumerLanguage
    const tefpayLang = locale ? locale.substring(0, 2) : "es"; // Ej: "es", "en"
    const consumerLanguage = tefpayLang; // Asumimos que son el mismo por ahora

    // Extraer detalles de suscripción de metadata si existen
    // Es importante que la estructura de metadata sea consistente con lo que se espera aquí.
    const subscriptionChargeAmount =
      metadata?.subscriptionChargeAmount?.toString(); // ej. metadata: { subscriptionChargeAmount: 1000 }
    const customerName = metadata?.customerName as string | undefined; // ej. metadata: { customerName: "John Doe" }
    const subscriptionDescription =
      (metadata?.subscriptionDescription as string) || product_description; // ej. metadata: { subscriptionDescription: "Plan Premium Mensual" }
    const tefpayTerminalAuthValue =
      (metadata?.tefpayTerminalAuth as string) || this.tefpayTerminalAuth;

    const tefpayFieldsBase: Partial<TefpayPaymentParams> = {
      // Campos obligatorios y comunes
      Ds_Merchant_Amount: amountString, // Ya está en céntimos
      Ds_Merchant_MerchantCode: this.tefpayMerchantCode,
      Ds_Merchant_Currency:
        currency === "EUR" ? "978" : currency === "USD" ? "840" : "978", // Ajustar si se soportan más monedas
      Ds_Merchant_Terminal: terminalToUse,
      Ds_Merchant_MerchantURL:
        notification_url ||
        this.tefpayNotifyUrl ||
        `${this.appBaseUrl}/api/v1/payments/tefpay/webhook`,
      Ds_Merchant_UrlOK: urlOkWithPaymentCode.toString(),
      Ds_Merchant_UrlKO: urlKoWithError.toString(),
      Ds_Merchant_MatchingData: formMatchingData, // Crucial para la firma y seguimiento

      // Campos de idioma
      Ds_Merchant_Lang: tefpayLang,
      Ds_Merchant_ConsumerLanguage: consumerLanguage,

      // Descripción general del pago (puede ser la misma que la de suscripción o más genérica)
      Ds_Merchant_Description: product_description?.substring(0, 125), // Tefpay suele tener un límite

      // Campos específicos de la nueva configuración de formulario (muchos son para suscripciones)
      Ds_Merchant_TransactionType: this.tefpayTransactionTypeSubscription, // Ej: "6" para suscripción con autorización
      Ds_Merchant_Subscription_ProcessingMethod: this.tefpaySubProcessingMethod, // Ej: "201"
      Ds_Merchant_Subscription_Action: this.tefpaySubAction, // Ej: "C" (VERIFICAR ESTE VALOR)

      Ds_Merchant_Subscription_Enable: this.tefpaySubEnable, // Ej: "1"
      Ds_Merchant_Subscription_Account: formMatchingData, // Usar el mismo valor que Ds_Merchant_MatchingData para la creación

      // Importe recurrente de la suscripción (trial es Ds_Merchant_Amount)
      // Asegurarse que subscriptionChargeAmount también se pase en céntimos si viene de nuestro sistema en Euros
      Ds_Merchant_Subscription_ChargeAmount: subscriptionChargeAmount
        ? Math.round(parseFloat(subscriptionChargeAmount) * 100).toString()
        : undefined,

      Ds_Merchant_Subscription_RelFirstCharge: this.tefpaySubRelFirstCharge, // Ej: "02D"
      Ds_Merchant_Subscription_PeriodType: this.tefpaySubPeriodType, // Ej: "M"
      Ds_Merchant_Subscription_PeriodInterval: this.tefpaySubPeriodInterval, // Ej: "1"
      Ds_Merchant_Subscription_Iteration: this.tefpaySubIteration, // Ej: "0" para inicio

      Ds_Merchant_Subscription_ClientName: customerName,
      Ds_Merchant_Subscription_ClientEmail: customer_email
        ? customer_email.toLowerCase()
        : undefined,
      Ds_Merchant_Subscription_Description: subscriptionDescription?.substring(
        0,
        255
      ), // Límite típico
      Ds_Merchant_Subscription_NotifyCostumerByEmail:
        this.tefpaySubNotifyCustomerEmail, // Ej: "0"

      // Campos de Terminal y Plantilla (si se usan)
      Ds_Merchant_TerminalAuth: tefpayTerminalAuthValue, // Puede venir de metadata o config
      Ds_Merchant_MerchantCodeTemplate: this.tefpayMerchantCodeTemplate,
      Ds_Merchant_TemplateNumber: this.tefpayTemplateNumber,
      Ds_Merchant_AdditionalData: this.tefpayAdditionalData,

      // Titular (opcional, pero bueno tenerlo si se dispone)
      Ds_Merchant_Titular:
        customerName ||
        (customer_email ? customer_email.split("@")[0] : undefined),
    };

    // Eliminar campos opcionales si no tienen valor para no enviar "undefined"
    Object.keys(tefpayFieldsBase).forEach((key) => {
      if (tefpayFieldsBase[key] === undefined) {
        delete tefpayFieldsBase[key];
      }
    });

    const merchantDataToEmbed = { ...metadata };
    delete merchantDataToEmbed.isSubscription; // Ya manejado por TransactionType y campos SUB_*
    delete merchantDataToEmbed.subscriptionDetails; // Campos específicos de SUB_* son preferidos
    delete merchantDataToEmbed.customerName; // Ya usado en Ds_Merchant_Subscription_ClientName / Ds_Merchant_Titular
    delete merchantDataToEmbed.subscriptionChargeAmount; // Ya usado
    delete merchantDataToEmbed.subscriptionDescription; // Ya usado
    delete merchantDataToEmbed.tefpayTerminalAuth; // Ya usado
    merchantDataToEmbed.payment_code = system_payment_code;
    merchantDataToEmbed.form_matching_data = formMatchingData; // Guardar referencia al matching data del form

    if (Object.keys(merchantDataToEmbed).length > 0) {
      try {
        tefpayFieldsBase.Ds_Merchant_MerchantData =
          JSON.stringify(merchantDataToEmbed);
        if (tefpayFieldsBase.Ds_Merchant_MerchantData.length > 1024) {
          this.logger.warn(
            "Ds_Merchant_MerchantData for FORM exceeds 1024 characters. Tefpay might truncate it."
          );
          // Considerar una estrategia de truncado o serialización más compacta si es un problema recurrente
        }
      } catch (stringifyError: any) {
        // Renombrado para evitar conflicto y usado en log
        this.logger.error(
          "Failed to stringify metadata for Ds_Merchant_MerchantData (FORM)",
          stringifyError.message
        );
      }
    }

    // Campos para la firma del FORMULARIO (SHA1)
    const formSignatureFields: TefpayFormSignatureFields = {
      Ds_Merchant_Amount: tefpayFieldsBase.Ds_Merchant_Amount!,
      Ds_Merchant_MerchantCode: tefpayFieldsBase.Ds_Merchant_MerchantCode!,
      Ds_Merchant_MatchingData: formMatchingData, // Siempre usar el formMatchingData generado
      Ds_Merchant_MerchantURL: tefpayFieldsBase.Ds_Merchant_MerchantURL!,
    };
    const calculatedFormSignature =
      this.calculateFormSignature(formSignatureFields);

    const responseFields: Record<string, string> = {
      ...(tefpayFieldsBase as Record<string, string>),
      Ds_Signature: calculatedFormSignature, // El frontend mapeará esto a Ds_Merchant_MerchantSignature
    };

    this.logger.log(
      `Preparing Tefpay FORM payment (Subscription Flow) for internal order ${system_payment_code}. Locale: ${locale}, Tefpay Lang: ${tefpayLang}`
    );
    this.logger.debug(
      `Tefpay FORM payment fields for response: ${JSON.stringify(responseFields).replace(this.tefpayPrivateKey, "[SECRET_KEY]")}`
    );

    return {
      url: this.tefpayUrl,
      fields: responseFields,
      payment_processor_name: "tefpay",
    };
  }

  handleWebhookNotification(
    payload: Record<string, string>
    // signatureFromHeader?: string | string[] | Buffer // No se usa, firma en payload.Ds_Signature
  ): Promise<ProcessedNotificationResponse> {
    const tefpayMatchingData = payload.Ds_Merchant_MatchingData; // Este es el ID de pedido para Tefpay en notificaciones
    const tefpayTransactionId = payload.Ds_TransactionId;

    this.logger.log(
      `Tefpay S2S Notification Received: Processing for Ds_Merchant_MatchingData: ${tefpayMatchingData || "N/A"}, Ds_TransactionId: ${tefpayTransactionId || "N/A"}`
    );
    this.logger.debug(
      `Tefpay S2S Notification Payload: ${JSON.stringify(payload)}`
    );

    // La firma (Ds_Signature) está en el payload y se verifica con verifySignature
    const signatureValid = this.verifySignature(payload);

    if (!signatureValid) {
      // verifySignature ya loguea el error y la causa
      return Promise.resolve({
        paymentId: tefpayMatchingData || "unknown_matching_data",
        status: "error",
        eventType: "payment.failed_verification",
        transactionId: tefpayTransactionId,
        rawData: payload,
        message: "Invalid signature for S2S notification.",
        error: "SignatureMismatch",
      });
    }

    const tefpayResponseCode = payload.Ds_Code;
    const tefpayResponseMessage = payload.Ds_Message;
    const isSuccess = tefpayResponseCode === "100";

    let eventType = "payment.unknown";
    let paymentStatus: "completed" | "failed" | "pending" | "error" = "pending";

    if (isSuccess) {
      eventType = "payment.succeeded";
      paymentStatus = "completed";
      this.logger.log(
        `Tefpay S2S Notification: Payment SUCCEEDED for Ds_Merchant_MatchingData: ${tefpayMatchingData}. Ds_Code: ${tefpayResponseCode} (${tefpayResponseMessage})`
      );

      // const tefpayTransactionType = payload.Ds_Merchant_TransactionType; // Variable no utilizada, comentada o eliminada
      const tefpaySubscriptionAccount =
        payload.Ds_Merchant_Subscription_Account;

      if (tefpaySubscriptionAccount) {
        // Asumir que cualquier notificación con Ds_Merchant_Subscription_Account y éxito es un pago de suscripción
        eventType = "subscription.payment.succeeded";
        // Podrías necesitar lógica más fina para distinguir entre creación, renovación, etc.
        // basado en Ds_Merchant_TransactionType o el estado previo de la suscripción en tu DB.
      } else if (
        paymentStatus === "completed" &&
        metadataIndicatesSubscriptionInitial(payload.Ds_MerchantData)
      ) {
        eventType = "payment.succeeded.subscription_initial";
      }
    } else {
      eventType = "payment.failed";
      paymentStatus = "failed";
      this.logger.error(
        `Tefpay S2S Notification: Payment FAILED for Ds_Merchant_MatchingData: ${tefpayMatchingData}. Ds_Code: ${tefpayResponseCode} (${tefpayResponseMessage || "No message"})`
      );
    }

    let parsedMetadata: Record<string, any> | undefined = undefined;
    if (payload.Ds_MerchantData) {
      try {
        parsedMetadata = JSON.parse(payload.Ds_MerchantData);
      } catch (error: any) {
        this.logger.warn(
          `Tefpay S2S Notification: Ds_MerchantData for ${tefpayMatchingData} is not valid JSON: ${payload.Ds_MerchantData}. Error: ${error.message}`
        );
      }
    }

    return Promise.resolve({
      paymentId: tefpayMatchingData || "unknown_matching_data", // Usar el MatchingData de la notificación como paymentId
      status: paymentStatus,
      eventType: eventType,
      transactionId: tefpayTransactionId, // ID de transacción de Tefpay
      processorTransactionId: tefpayTransactionId, // Alias
      // Ds_Amount de Tefpay viene en céntimos. Lo devolvemos tal cual (como número).
      // El servicio que consuma esto (PaymentsService) decidirá si lo convierte/divide.
      amount: payload.Ds_Amount ? parseInt(payload.Ds_Amount, 10) : undefined,
      currency: payload.Ds_Currency,
      timestamp: parseTefpayDateTime(payload.Ds_Date, payload.Ds_Hour),
      customerIdentifier: undefined, // Podría extraerse de metadata si es necesario
      subscriptionIdentifier: payload.Ds_Merchant_Subscription_Account, // ID de suscripción de Tefpay
      cardDetails: {
        last4: payload.Ds_PanMask,
        expiryMonth: payload.Ds_Expiry
          ? payload.Ds_Expiry.substring(2, 4)
          : undefined,
        expiryYear: payload.Ds_Expiry
          ? payload.Ds_Expiry.substring(0, 2)
          : undefined,
      },
      metadata: parsedMetadata,
      rawData: payload,
      message: `Tefpay S2S: ${tefpayResponseMessage || "Status code " + tefpayResponseCode}. (MatchingData: ${tefpayMatchingData})`,
      error: isSuccess ? undefined : tefpayResponseCode,
    });
  }

  // S2S signature for CANCELLATION/OPERATIONS (SHA256 - for backoffice operations)
  // Esta firma es diferente a la de notificación S2S y a la del formulario.
  private calculateBackofficeS2SSignature(
    merchantCode: string,
    order: string, // ID de la suscripción o transacción a operar
    terminal: string,
    amount: string, // Para algunas operaciones puede ser 0
    currency: string,
    transactionType: string, // Tipo de operación S2S (ej. \'C\' para cancelación)
    privateKey: string
  ): string {
    // La base de la firma para operaciones S2S suele ser: Code+Order+Terminal+Amount+Currency+TransactionType+Key
    // O una variación. Es CRUCIAL confirmar esto con la documentación de Tefpay para S2S.
    // El método anterior `calculateS2SSignature` usaba: merchantCode+order+terminal+amount+currency+originalMerchantCode+privateKey
    // Vamos a asumir una estructura común si no hay una específica para cancelación:
    const stringToSign = `${merchantCode}${order}${terminal}${amount}${currency}${transactionType}${privateKey}`;
    this.logger.debug(
      `S2S Backoffice Signature (SHA256) string for operation ${transactionType} on order ${order}: ${stringToSign.replace(privateKey, "[SECRET_KEY]")}`
    );
    return crypto.createHash("sha256").update(stringToSign).digest("hex");
  }

  async requestSubscriptionCancellation(params: {
    processorSubscriptionId: string; // Este es el Ds_Merchant_Subscription_Account o el ID que Tefpay usa para la suscripción
    cancellationReason?: string;
  }): Promise<SubscriptionCancellationResponse> {
    this.logger.log(
      `Requesting Tefpay subscription cancellation for processorSubscriptionId: ${params.processorSubscriptionId}`
    );

    const payload = new URLSearchParams();
    payload.append("Ds_Merchant_MerchantCode", this.tefpayMerchantCode);
    payload.append("Ds_Merchant_Terminal", this.tefpayDefaultTerminal); // Usar terminal por defecto o uno específico si es necesario
    // Para cancelar una suscripción, el "order" suele ser el ID de la suscripción de Tefpay.
    // Este ID podría ser Ds_Merchant_Subscription_Account o Ds_Merchant_Identifier si se usó para crearla.
    payload.append("Ds_Merchant_Order", params.processorSubscriptionId);
    payload.append("Ds_TransactionType", "C"); // \'C\' para Anulación/Cancelación de suscripción (confirmar este código con Tefpay)
    payload.append("Ds_Amount", "0"); // Cancelaciones suelen ser con importe 0
    payload.append("Ds_Currency", "978"); // Moneda (EUR por defecto, confirmar si es necesario)

    const s2sSignature = this.calculateBackofficeS2SSignature(
      this.tefpayMerchantCode,
      params.processorSubscriptionId,
      this.tefpayDefaultTerminal,
      "0",
      "978",
      "C", // TransactionType para la firma
      this.tefpayPrivateKey
    );
    payload.append("Ds_Signature", s2sSignature);

    try {
      this.logger.debug(
        `Sending Tefpay S2S subscription cancellation: ${this.tefpayBackofficeUrl}, Payload: ${payload.toString()}`
      );
      const response = await axios.post(this.tefpayBackofficeUrl, payload, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      this.logger.debug(
        `Tefpay S2S Cancellation Response (raw) for ${params.processorSubscriptionId}: ${typeof response.data === "string" ? response.data.substring(0, 500) : JSON.stringify(response.data)}`
      );

      // Parsear la respuesta de Tefpay (puede ser JSON o un string de query params)
      let tefpayResponseData: Record<string, string> = {};
      if (typeof response.data === "string") {
        try {
          tefpayResponseData = JSON.parse(response.data);
        } catch (parseError) {
          this.logger.warn(
            `Failed to parse Tefpay JSON response for cancellation ${params.processorSubscriptionId}. Trying as query string. Error: ${(parseError as Error).message}`
          );
          try {
            new URLSearchParams(response.data).forEach((value, key) => {
              tefpayResponseData[key] = value;
            });
          } catch (qsError) {
            this.logger.error(
              `Failed to parse Tefpay query string response for cancellation ${params.processorSubscriptionId}. Error: ${(qsError as Error).message}. Response: ${response.data.substring(0, 200)}`
            );
            return {
              success: false,
              message: `Failed to parse Tefpay response: ${response.data.substring(0, 100)}`,
              error: "InvalidResponseFormat",
            };
          }
        }
      } else if (typeof response.data === "object" && response.data !== null) {
        // Si ya es un objeto, convertir sus valores a string si es necesario
        Object.keys(response.data).forEach((key) => {
          tefpayResponseData[key] = String(response.data[key]);
        });
      } else {
        this.logger.error(
          `Unexpected Tefpay response type for cancellation ${params.processorSubscriptionId}: ${typeof response.data}`
        );
        return {
          success: false,
          message: "Unexpected response format from Tefpay.",
          error: "InvalidResponseFormat",
        };
      }

      this.logger.debug(
        `Parsed Tefpay S2S Cancellation Response for ${params.processorSubscriptionId}: ${JSON.stringify(tefpayResponseData)}`
      );

      // Interpretar la respuesta de Tefpay para la cancelación
      // Esto es un EJEMPLO. Necesitas saber qué campos y valores indica Tefpay para éxito/fallo en cancelaciones S2S.
      // Podría ser un campo Ds_ResponseCode, Ds_ErrorCode, Ds_Status, etc.
      const opResultCode =
        tefpayResponseData.Ds_Response ||
        tefpayResponseData.Ds_ErrorCode ||
        tefpayResponseData.Ds_Status;
      const opSuccess =
        opResultCode === "0" ||
        opResultCode === "00" ||
        opResultCode === "0000"; // Ejemplo de códigos de éxito

      if (opSuccess) {
        this.logger.log(
          `Tefpay subscription ${params.processorSubscriptionId} CANCELLATION successful. Response code: ${opResultCode}`
        );
        return {
          success: true,
          message: `Subscription cancellation processed successfully by Tefpay. Response: ${opResultCode}`,
          // effectiveCancellationDate: ..., // Si Tefpay lo devuelve
          // newStatus: ..., // Si Tefpay lo devuelve
        };
      } else {
        this.logger.error(
          `Tefpay subscription ${params.processorSubscriptionId} CANCELLATION FAILED. Response code: ${opResultCode}, Full Response: ${JSON.stringify(tefpayResponseData)}`
        );
        return {
          success: false,
          message: `Tefpay failed to process subscription cancellation. Response: ${opResultCode || "Unknown error"}`,
          error: opResultCode || "TefpayCancellationError",
        };
      }
    } catch (error: any) {
      this.logger.error(
        `Error during Tefpay S2S subscription cancellation request for ${params.processorSubscriptionId}: ${error.message}`,
        error.stack
      );
      return {
        success: false,
        message: `Network or communication error during Tefpay cancellation: ${error.message}`,
        error: "NetworkError",
      };
    }
  }
}

// Helper function para parsear la fecha y hora de Tefpay
function parseTefpayDateTime(dsDate?: string, dsHour?: string): Date {
  if (!dsDate) return new Date(); // Fallback si no hay fecha
  try {
    // Formato: Ds_Date: "250508074303" (YYMMDDHHMMSS)
    if (dsDate.length === 12 && !dsHour) {
      const year = 2000 + parseInt(dsDate.substring(0, 2), 10);
      const month = parseInt(dsDate.substring(2, 4), 10) - 1;
      const day = parseInt(dsDate.substring(4, 6), 10);
      const hour = parseInt(dsDate.substring(6, 8), 10);
      const minute = parseInt(dsDate.substring(8, 10), 10);
      const second = parseInt(dsDate.substring(10, 12), 10);
      const parsed = new Date(Date.UTC(year, month, day, hour, minute, second));
      if (isNaN(parsed.getTime()))
        throw new Error("Invalid date components after parsing YYMMDDHHMMSS");
      return parsed;
    }
    // Formato: Ds_Date: "DD/MM/YYYY" y Ds_Hour: "HH:MM"
    else if (dsDate.includes("/") && dsHour && dsHour.includes(":")) {
      const dateParts = dsDate.split("/");
      const timeParts = dsHour.split(":");
      if (dateParts.length === 3 && timeParts.length >= 2) {
        // HH:MM o HH:MM:SS
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);
        const hour = parseInt(timeParts[0], 10);
        const minute = parseInt(timeParts[1], 10);
        const second = timeParts.length > 2 ? parseInt(timeParts[2], 10) : 0;
        const parsed = new Date(
          Date.UTC(year, month, day, hour, minute, second)
        );
        if (isNaN(parsed.getTime()))
          throw new Error(
            "Invalid date components after parsing DD/MM/YYYY HH:MM:SS"
          );
        return parsed;
      }
    }
    // He cambiado console.warn a this.logger.warn pero como esta función está fuera de la clase, no tiene acceso a this.logger
    // Dejándolo como console.warn o considerar pasar el logger como argumento si se refactoriza.
    console.warn(
      "Could not parse Tefpay DateTime with known formats:",
      dsDate,
      dsHour
    );
  } catch (error: any) {
    console.error(
      "Failed to parse Tefpay DateTime:",
      dsDate,
      dsHour,
      error.message
    );
  }
  return new Date(); // Fallback a la fecha actual si el parseo falla
}

function metadataIndicatesSubscriptionInitial(merchantData?: string): boolean {
  if (!merchantData) return false;
  try {
    const metadata = JSON.parse(merchantData);
    // Esta función se usaba para inferir si una notificación era de una suscripción inicial.
    // Con los campos de suscripción más explícitos, su utilidad podría cambiar o necesitar ajustes.
    // Por ahora, la mantenemos, pero revisa si sigue siendo relevante para tu lógica de `handleWebhookNotification`.
    return (
      metadata.isSubscription === true &&
      !metadata.processorSubscriptionId &&
      metadata.payment_code &&
      metadata.form_matching_data &&
      metadata.payment_code === metadata.form_matching_data
    );
  } catch (parseError: any) {
    // Renombrado para evitar conflicto y usado en log
    // console.debug("Metadata parsing error or field missing for subscription check:", parseError.message);
    this.logger.debug(
      `Metadata parsing error or field missing for subscription check: ${parseError.message}`
    );
    return false;
  }
}
