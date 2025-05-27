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
  Ds_Merchant_MatchingData?: string;
  Ds_Merchant_Subscription_Account?: string;
  Ds_Merchant_Subscription_ClientName?: string;
  Ds_Merchant_Subscription_ClientEmail?: string;
  Ds_Merchant_Subscription_Description?: string;
  Ds_Merchant_Subscription_NotifyCostumerByEmail?: string;
  Ds_Merchant_Lang?: string; // Idioma para Tefpay (diferente de ConsumerLanguage)
  Ds_Merchant_Subscription_Enable?: string;
  Ds_Merchant_Description?: string; // Descripción general del pago
}

@Injectable()
export class TefpayService implements IPaymentProcessor {
  private readonly logger = new Logger(TefpayService.name);
  private readonly privateKey: string;
  private readonly merchantCode: string;
  private readonly terminal: string;
  private readonly formUrl: string;
  private readonly notifyUrl: string;
  private readonly defaultSuccessUrl: string;
  private readonly defaultCancelUrl: string;
  private readonly appBaseUrl: string;
  private readonly backofficeUrl: string;

  // Variables de configuración específicas de Tefpay que se usarán directamente
  private readonly tefpayTransactionTypeSubscription: string;
  private readonly tefpaySubProcessingMethod: string;
  private readonly tefpaySubAction: string;
  private readonly tefpaySubEnable: string;
  private readonly tefpaySubRelFirstCharge: string;
  private readonly tefpaySubPeriodType: string;
  private readonly tefpaySubPeriodInterval: string;
  private readonly tefpaySubIteration: string;
  private readonly tefpaySubNotifyCustomerEmail: string;
  private readonly tefpayTerminalAuth?: string; // Puede ser opcional o tener un valor por defecto
  private readonly tefpayMerchantCodeTemplate?: string;
  private readonly tefpayTemplateNumber?: string;
  private readonly tefpayAdditionalData?: string;

  constructor(private readonly configService: ConfigService) {
    this.privateKey = this.configService.get<string>("TEFPAY_PRIVATE_KEY")!;
    this.merchantCode = this.configService.get<string>("TEFPAY_MERCHANT_CODE")!;
    this.terminal = this.configService.get<string>("TEFPAY_TERMINAL")!;
    this.formUrl = this.configService.get<string>("TEFPAY_FORM_URL")!;
    this.notifyUrl = this.configService.get<string>("TEFPAY_NOTIFY_URL")!;
    this.defaultSuccessUrl = this.configService.get<string>(
      "TEFPAY_DEFAULT_SUCCESS_URL"
    )!;
    this.defaultCancelUrl = this.configService.get<string>(
      "TEFPAY_DEFAULT_CANCEL_URL"
    )!;
    this.appBaseUrl = this.configService.get<string>("APP_BASE_URL")!;
    this.backofficeUrl = this.configService.get<string>(
      "TEFPAY_BACKOFFICE_URL"
    )!;

    this.tefpayTransactionTypeSubscription = this.configService.get<string>(
      "TEFPAY_TRANSACTION_TYPE_SUBSCRIPTION"
    )!;
    this.tefpaySubProcessingMethod = this.configService.get<string>(
      "TEFPAY_SUB_PROCESSING_METHOD"
    )!;
    this.tefpaySubAction = this.configService.get<string>("TEFPAY_SUB_ACTION")!;
    this.tefpaySubEnable = this.configService.get<string>("TEFPAY_SUB_ENABLE")!;
    this.tefpaySubRelFirstCharge = this.configService.get<string>(
      "TEFPAY_SUB_REL_FIRST_CHARGE"
    )!;
    this.tefpaySubPeriodType = this.configService.get<string>(
      "TEFPAY_SUB_PERIOD_TYPE"
    )!;
    this.tefpaySubPeriodInterval = this.configService.get<string>(
      "TEFPAY_SUB_PERIOD_INTERVAL"
    )!;
    this.tefpaySubIteration = this.configService.get<string>(
      "TEFPAY_SUB_ITERATION"
    )!;
    this.tefpaySubNotifyCustomerEmail = this.configService.get<string>(
      "TEFPAY_SUB_NOTIFY_CUSTOMER_EMAIL"
    )!;

    // Opcionales, pueden no estar definidos
    this.tefpayTerminalAuth = this.configService.get<string>(
      "TEFPAY_TERMINAL_AUTH"
    );
    this.tefpayMerchantCodeTemplate = this.configService.get<string>(
      "TEFPAY_MERCHANT_CODE_TEMPLATE"
    );
    this.tefpayTemplateNumber = this.configService.get<string>(
      "TEFPAY_TEMPLATE_NUMBER"
    );
    this.tefpayAdditionalData = this.configService.get<string>(
      "TEFPAY_ADDITIONAL_DATA"
    );

    if (
      !this.privateKey ||
      !this.merchantCode ||
      !this.terminal ||
      !this.formUrl ||
      !this.notifyUrl ||
      !this.defaultSuccessUrl ||
      !this.defaultCancelUrl ||
      !this.appBaseUrl ||
      !this.backofficeUrl ||
      !this.tefpayTransactionTypeSubscription ||
      !this.tefpaySubProcessingMethod ||
      !this.tefpaySubAction ||
      !this.tefpaySubEnable ||
      !this.tefpaySubRelFirstCharge ||
      !this.tefpaySubPeriodType ||
      !this.tefpaySubPeriodInterval ||
      !this.tefpaySubIteration ||
      !this.tefpaySubNotifyCustomerEmail
    ) {
      this.logger.error(
        "Tefpay configuration is incomplete. Please check all required TEFPAY_* and APP_BASE_URL environment variables."
      );
      throw new Error("Tefpay configuration is incomplete.");
    }
  }

  private generateSignature(
    fields: Record<string, any>,
    recipe: "form" | "s2s_common" | "s2s_subscription"
  ): string {
    let stringToSign = "";
    let generatedSignature = "";

    if (recipe === "form") {
      // Receta para la firma del formulario de pago (SHA1)
      // Ds_Amount + Ds_Merchant_MerchantCode + Ds_Merchant_MatchingData + Ds_Merchant_Url + CLAVE_PRIVADA
      const dsAmount = String(fields.Ds_Amount);
      const dsMerchantCode = String(fields.Ds_Merchant_MerchantCode);
      const dsMatchingData = String(fields.Ds_Merchant_MatchingData);
      const dsMerchantUrl = String(fields.Ds_Merchant_Url); // Esta es la Ds_Merchant_MerchantURL del formulario

      this.logger.debug(
        `[FORM SIGNATURE] Raw values for signature: Ds_Amount='${dsAmount}', Ds_Merchant_MerchantCode='${dsMerchantCode}', Ds_Merchant_MatchingData='${dsMatchingData}', Ds_Merchant_Url='${dsMerchantUrl}'`
      );

      stringToSign =
        dsAmount +
        dsMerchantCode +
        dsMatchingData +
        dsMerchantUrl +
        this.privateKey;
      this.logger.debug(
        `[FORM SIGNATURE] String to sign (SHA1): ${stringToSign.replace(this.privateKey, "[PRIVATE_KEY]")}`
      );
      generatedSignature = crypto
        .createHash("sha1") // Cambiado a SHA1
        .update(stringToSign)
        .digest("hex");
      this.logger.debug(
        `[FORM SIGNATURE] Generated SHA1 Signature: ${generatedSignature}`
      );
    } else if (recipe === "s2s_common") {
      // Receta común para notificaciones S2S (SHA1)
      // Ds_Amount + Ds_Merchant_MerchantCode + Ds_Merchant_MatchingData + Ds_Merchant_Url + CLAVE_SECRETA
      // Ds_Amount aquí es el que viene en la notificación S2S, usualmente sin multiplicar por 100.
      const dsAmountForS2S = String(fields.Ds_Amount); // Asegurar que es string
      const dsMerchantCode = String(fields.Ds_Merchant_MerchantCode);
      const dsMatchingData = String(fields.Ds_Merchant_MatchingData);
      const dsMerchantUrl = String(fields.Ds_Merchant_Url);

      this.logger.debug(
        `[S2S SIGNATURE - COMMON] Raw values for signature: Ds_Amount='${dsAmountForS2S}', Ds_Merchant_MerchantCode='${dsMerchantCode}', Ds_Merchant_MatchingData='${dsMatchingData}', Ds_Merchant_Url='${dsMerchantUrl}'`
      );

      stringToSign =
        dsAmountForS2S +
        dsMerchantCode +
        dsMatchingData +
        dsMerchantUrl +
        this.privateKey;
      this.logger.debug(
        `[S2S SIGNATURE - COMMON] String to sign (SHA1): ${stringToSign.replace(this.privateKey, "[PRIVATE_KEY]")}`
      );
      generatedSignature = crypto
        .createHash("sha1")
        .update(stringToSign)
        .digest("hex");
      this.logger.debug(
        `[S2S SIGNATURE - COMMON] Generated SHA1 Signature: ${generatedSignature}`
      );
    } else if (recipe === "s2s_subscription") {
      // Receta para notificaciones S2S de suscripciones (SHA1)
      // Ds_Subscription_Action + Ds_Subscription_Status + Ds_Subscription_Account + Ds_Subscription_Id + CLAVE_SECRETA
      const dsSubAction = String(fields.Ds_Subscription_Action);
      const dsSubStatus = String(fields.Ds_Subscription_Status);
      const dsSubAccount = String(fields.Ds_Subscription_Account);
      const dsSubId = String(fields.Ds_Subscription_Id);

      this.logger.debug(
        `[S2S SIGNATURE - SUBSCRIPTION] Raw values for signature: Ds_Subscription_Action='${dsSubAction}', Ds_Subscription_Status='${dsSubStatus}', Ds_Subscription_Account='${dsSubAccount}', Ds_Subscription_Id='${dsSubId}'`
      );

      stringToSign =
        dsSubAction + dsSubStatus + dsSubAccount + dsSubId + this.privateKey;
      this.logger.debug(
        `[S2S SIGNATURE - SUBSCRIPTION] String to sign (SHA1): ${stringToSign.replace(this.privateKey, "[PRIVATE_KEY]")}`
      );
      generatedSignature = crypto
        .createHash("sha1")
        .update(stringToSign)
        .digest("hex");
      this.logger.debug(
        `[S2S SIGNATURE - SUBSCRIPTION] Generated SHA1 Signature: ${generatedSignature}`
      );
    }
    return generatedSignature;
  }

  // FORM SIGNATURE (SHA1 - for payment redirection form)
  // private calculateFormSignature(fields: TefpayFormSignatureFields): string {
  //   // New recipe: Ds_Amount + Ds_Merchant_MerchantCode + Ds_Merchant_MatchingData + Ds_Merchant_Url + TEFPAY_PRIVATE_KEY
  //   // Ds_Merchant_Url in the recipe corresponds to fields.Ds_Merchant_MerchantURL here.
  //   const signatureBaseString = `${fields.Ds_Merchant_Amount}${fields.Ds_Merchant_MerchantCode}${fields.Ds_Merchant_MatchingData}${fields.Ds_Merchant_MerchantURL}${this.privateKey}`;
  //   const calculatedSignature = crypto
  //     .createHash("sha1")
  //     .update(signatureBaseString)
  //     .digest("hex");
  //   this.logger.debug(
  //     `Calculating FORM signature (SHA1). Base: ${signatureBaseString.replace(this.privateKey, "[SECRET_KEY]")}, Signature: ${calculatedSignature}`
  //   );
  //   return calculatedSignature;
  // }

  // S2S NOTIFICATION SIGNATURE (SHA1 - for incoming webhooks)
  verifySignature(payload: Record<string, any>): boolean {
    this.logger.debug(
      `[VERIFY SIGNATURE] Received payload for verification: ${JSON.stringify(payload)}`
    );
    const receivedSignature = payload.Ds_Signature as string;

    if (!receivedSignature) {
      this.logger.warn(
        "[VERIFY SIGNATURE] Ds_Signature missing in S2S notification payload."
      );
      return false;
    }

    let calculatedSignature: string;
    let signatureRecipeUsed: "s2s_common" | "s2s_subscription" | "unknown" =
      "unknown";

    // Determine which S2S signature recipe to use based on available fields
    if (
      payload.Ds_Subscription_Action &&
      payload.Ds_Subscription_Status &&
      payload.Ds_Subscription_Account &&
      payload.Ds_Subscription_Id
    ) {
      this.logger.debug(
        "[VERIFY SIGNATURE] Attempting S2S Subscription signature recipe."
      );
      calculatedSignature = this.generateSignature(payload, "s2s_subscription");
      signatureRecipeUsed = "s2s_subscription";
    } else if (
      payload.Ds_Amount &&
      payload.Ds_Merchant_MerchantCode &&
      payload.Ds_Merchant_MatchingData &&
      payload.Ds_Merchant_Url
    ) {
      this.logger.debug(
        "[VERIFY SIGNATURE] Attempting S2S Common signature recipe."
      );
      calculatedSignature = this.generateSignature(payload, "s2s_common");
      signatureRecipeUsed = "s2s_common";
    } else {
      this.logger.warn(
        "[VERIFY SIGNATURE] Could not determine S2S signature recipe based on payload fields. Cannot verify."
      );
      this.logger.debug(
        `[VERIFY SIGNATURE] Payload fields for recipe check: Ds_Subscription_Action=${payload.Ds_Subscription_Action}, Ds_Subscription_Status=${payload.Ds_Subscription_Status}, Ds_Subscription_Account=${payload.Ds_Subscription_Account}, Ds_Subscription_Id=${payload.Ds_Subscription_Id}, Ds_Amount=${payload.Ds_Amount}, Ds_Merchant_MatchingData=${payload.Ds_Merchant_MatchingData}, Ds_Merchant_Url=${payload.Ds_Merchant_Url}`
      );
      return false;
    }

    this.logger.log(
      `[VERIFY SIGNATURE] Tefpay S2S Notification (Recipe: ${signatureRecipeUsed}): Calculated Signature: ${calculatedSignature}, Received Ds_Signature: ${receivedSignature}`
    );

    if (calculatedSignature.toLowerCase() !== receivedSignature.toLowerCase()) {
      this.logger.warn(
        `[VERIFY SIGNATURE] Tefpay S2S Signature (Recipe: ${signatureRecipeUsed}) FAILED for MatchingData/SubscriptionAccount: '${payload.Ds_Merchant_MatchingData || payload.Ds_Subscription_Account}'. Expected: ${calculatedSignature}, Got: ${receivedSignature}`
      );
      return false;
    }

    this.logger.log(
      `[VERIFY SIGNATURE] Tefpay S2S Signature (Recipe: ${signatureRecipeUsed}) VERIFIED for MatchingData/SubscriptionAccount: '${payload.Ds_Merchant_MatchingData || payload.Ds_Subscription_Account}'.`
    );
    return true;
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
    // const amountInCents = Math.round(amount * 100); // amount ya viene en céntimos.
    const amountString = amount.toString();
    const system_payment_code = order; // Para logging, MerchantData y URLs OK/KO

    const formMatchingData = String(
      new Date().toISOString().replace(/[^0-9]/g, "")
    ).padEnd(21, "0");
    this.logger.debug(
      `Generated Ds_Merchant_MatchingData for FORM: ${formMatchingData}`
    );

    let terminalToUse = this.terminal;
    if (requestedTerminal) {
      terminalToUse = requestedTerminal;
    } else if (locale) {
      // Lógica simple para derivar terminal de locale, ajustar según necesidad
      if (locale.startsWith("es")) {
        terminalToUse =
          this.configService.get<string>("TEFPAY_TERMINAL_ES") || this.terminal;
      } else if (locale.startsWith("en")) {
        terminalToUse =
          this.configService.get<string>("TEFPAY_TERMINAL_EN") || this.terminal;
      }
    }
    this.logger.debug(
      `Using Tefpay Terminal: ${terminalToUse} for locale: ${locale}`
    );

    const finalSuccessUrl = success_url || this.defaultSuccessUrl;
    const finalCancelUrl = cancel_url || this.defaultCancelUrl;
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
      Ds_Merchant_Amount: amountString,
      Ds_Merchant_MerchantCode: this.merchantCode,
      Ds_Merchant_Currency:
        currency === "EUR" ? "978" : currency === "USD" ? "840" : "978",
      Ds_Merchant_Terminal: terminalToUse,
      Ds_Merchant_MerchantURL: notification_url || this.notifyUrl,
      Ds_Merchant_UrlOK: urlOkWithPaymentCode.toString(),
      Ds_Merchant_UrlKO: urlKoWithError.toString(),
      Ds_Merchant_MatchingData: formMatchingData,

      // Campos de idioma
      Ds_Merchant_Lang: tefpayLang,
      Ds_Merchant_ConsumerLanguage: consumerLanguage,

      // Descripción general del pago (puede ser la misma que la de suscripción o más genérica)
      Ds_Merchant_Description: product_description?.substring(0, 125),

      // Campos específicos de la nueva configuración de formulario (muchos son para suscripciones)
      Ds_Merchant_TransactionType: this.tefpayTransactionTypeSubscription,
      Ds_Merchant_Subscription_ProcessingMethod: this.tefpaySubProcessingMethod,
      Ds_Merchant_Subscription_Action: this.tefpaySubAction,

      Ds_Merchant_Subscription_Enable: this.tefpaySubEnable,
      Ds_Merchant_Subscription_Account: formMatchingData,

      // Importe recurrente de la suscripción (trial es Ds_Merchant_Amount)
      // Asegurarse que subscriptionChargeAmount también se pase en céntimos si viene de nuestro sistema en Euros
      Ds_Merchant_Subscription_ChargeAmount: subscriptionChargeAmount
        ? Math.round(parseFloat(subscriptionChargeAmount) * 100).toString()
        : undefined,

      Ds_Merchant_Subscription_RelFirstCharge: this.tefpaySubRelFirstCharge,
      Ds_Merchant_Subscription_PeriodType: this.tefpaySubPeriodType,
      Ds_Merchant_Subscription_PeriodInterval: this.tefpaySubPeriodInterval,
      Ds_Merchant_Subscription_Iteration: this.tefpaySubIteration,

      Ds_Merchant_Subscription_ClientName: customerName,
      Ds_Merchant_Subscription_ClientEmail: customer_email
        ? customer_email.toLowerCase()
        : undefined,
      Ds_Merchant_Subscription_Description: subscriptionDescription?.substring(
        0,
        255
      ),
      Ds_Merchant_Subscription_NotifyCostumerByEmail:
        this.tefpaySubNotifyCustomerEmail,

      // Campos de Terminal y Plantilla (si se usan)
      Ds_Merchant_TerminalAuth: tefpayTerminalAuthValue,
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
    // La receta es: Ds_Amount + Ds_Merchant_MerchantCode + Ds_Merchant_MatchingData + Ds_Merchant_Url + CLAVE_PRIVADA
    // Donde Ds_Merchant_Url es la URL de notificación S2S (Ds_Merchant_MerchantURL en tefpayFieldsBase)
    const formSignatureRecipeFields = {
      Ds_Amount: tefpayFieldsBase.Ds_Merchant_Amount!, // Importe en céntimos
      Ds_Merchant_MerchantCode: tefpayFieldsBase.Ds_Merchant_MerchantCode!,
      Ds_Merchant_MatchingData: formMatchingData, // El MatchingData generado para el formulario
      Ds_Merchant_Url: tefpayFieldsBase.Ds_Merchant_MerchantURL!, // La URL de notificación S2S
    };

    const calculatedFormSignature = this.generateSignature(
      formSignatureRecipeFields,
      "form"
    );

    const responseFields: Record<string, string> = {
      ...(tefpayFieldsBase as Record<string, string>),
      Ds_Merchant_Order: system_payment_code,
      Ds_Signature: calculatedFormSignature,
    };

    this.logger.log(
      `Preparing Tefpay FORM payment (Subscription Flow) for internal order ${system_payment_code}. Locale: ${locale}, Tefpay Lang: ${tefpayLang}`
    );
    this.logger.debug(
      `Tefpay FORM payment fields for response: ${JSON.stringify(responseFields).replace(this.privateKey, "[SECRET_KEY]")}`
    );

    return {
      url: this.formUrl,
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

      // const tefpayTransactionType = payload.Ds_Merchant_TransactionType;
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
    processorSubscriptionId: string;
    cancellationReason?: string;
  }): Promise<SubscriptionCancellationResponse> {
    this.logger.log(
      `Requesting Tefpay subscription cancellation for processorSubscriptionId: ${params.processorSubscriptionId}`
    );

    const payload = new URLSearchParams();
    payload.append("Ds_Merchant_MerchantCode", this.merchantCode);
    payload.append("Ds_Merchant_Terminal", this.terminal);
    // Para cancelar una suscripción, el "order" suele ser el ID de la suscripción de Tefpay.
    // Este ID podría ser Ds_Merchant_Subscription_Account o Ds_Merchant_Identifier si se usó para crearla.
    payload.append("Ds_Merchant_Order", params.processorSubscriptionId);
    payload.append("Ds_TransactionType", "C"); // \'C\' para Anulación/Cancelación de suscripción (confirmar este código con Tefpay)
    payload.append("Ds_Amount", "0"); // Cancelaciones suelen ser con importe 0
    payload.append("Ds_Currency", "978"); // Moneda (EUR por defecto, confirmar si es necesario)

    const s2sSignature = this.calculateBackofficeS2SSignature(
      this.merchantCode,
      params.processorSubscriptionId,
      this.terminal,
      "0",
      "978",
      "C",
      this.privateKey
    );
    payload.append("Ds_Signature", s2sSignature);

    try {
      this.logger.debug(
        `Sending Tefpay S2S subscription cancellation: ${this.backofficeUrl}, Payload: ${payload.toString()}`
      );
      const response = await axios.post(this.backofficeUrl, payload, {
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
  } catch {
    // El error de parseo se ignora intencionalmente, la función devuelve false.
    return false;
  }
}
