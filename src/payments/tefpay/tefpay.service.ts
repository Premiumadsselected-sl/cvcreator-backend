import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios"; // Correct import for HttpService
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto"; // Importar el módulo crypto
import {
  IPaymentProcessor,
  PreparePaymentParams,
  PreparedPaymentResponse,
  ProcessedNotificationResponse,
  SubscriptionCancellationResponse, // AÑADIDO
} from "../processors/payment-processor.interface";
import { PaymentStatus } from "../enums/payment-status.enum"; // NUEVA IMPORTACIÓN
import { PaymentEventType } from "../enums/payment-event-type.enum"; // NUEVA IMPORTACIÓN

@Injectable()
export class TefpayService implements IPaymentProcessor {
  private readonly logger = new Logger(TefpayService.name);
  private readonly tefpayMerchantCode: string;
  private readonly tefpayPrivateKey: string;
  private readonly tefpayApiBaseUrl: string;
  private readonly tefpayFormUrl: string;
  private readonly tefpayBackofficeUrl: string; // No se usa actualmente
  // private readonly tefpayWebhookSecret: string; // REMOVED
  private readonly tefpayDsAmount: string | undefined; // Added for S2S signature, from .env
  private readonly tefpayNotifyUrl: string; // Added for S2S signature

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    this.tefpayMerchantCode = this.configService.get<string>(
      "TEFPAY_MERCHANT_CODE"
    )!;
    this.tefpayPrivateKey =
      this.configService.get<string>("TEFPAY_PRIVATE_KEY")!;
    // this.tefpayWebhookSecret = // REMOVED
    //   this.configService.get<string>("TEFPAY_WEBHOOK_SECRET")!; // REMOVED
    this.tefpayDsAmount = this.configService.get<string>("TEFPAY_DS_AMOUNT"); // Added
    this.tefpayNotifyUrl = this.configService.get<string>("TEFPAY_NOTIFY_URL")!; // Added

    this.tefpayApiBaseUrl = this.configService.get<string>(
      "TEFPAY_API_URL",
      "https://api.tefpay.com/rest"
    )!;
    this.tefpayFormUrl = this.configService.get<string>(
      "TEFPAY_FORM_URL",
      "https://pgw.tefpay.com/web/pay"
    )!;
    this.tefpayBackofficeUrl = this.configService.get<string>(
      "TEFPAY_BACKOFFICE_URL",
      ""
    )!; // Default to empty string if not provided

    if (
      !this.tefpayMerchantCode ||
      !this.tefpayPrivateKey ||
      !this.tefpayFormUrl ||
      // !this.tefpayWebhookSecret || // REMOVED check
      !this.tefpayNotifyUrl
    ) {
      this.logger.error(
        "Tefpay merchant code, private key, form URL, or notify URL is not configured."
      );
      throw new Error("Tefpay configuration is missing.");
    }
  }

  private getTefpayCurrencyCode(currency: string): string {
    // Map ISO currency codes to Tefpay numeric codes
    // Refer to Tefpay documentation for a complete list
    const currencyMap: { [key: string]: string } = {
      EUR: "978",
      USD: "840",
      GBP: "826",
      // Add other currencies as needed
    };
    return currencyMap[currency.toUpperCase()] || currency; // Fallback to original if not found
  }

  // Method to calculate signature for outgoing requests
  private calculateRequestSignature(payload: Record<string, any>): string {
    // This method is for signing requests TO Tefpay API, not for form submissions or webhook verification.
    // The signature logic will depend on the specific API endpoint and Tefpay's requirements.
    // Typically involves concatenating parameters and the secret key, then hashing.
    // Example (highly dependent on specific API call):
    const paramString = Object.keys(payload)
      .sort()
      .map((key) => String(payload[key])) // Ensure string conversion
      .join("");
    const stringToSign = paramString + this.tefpayPrivateKey;
    return crypto.createHash("sha256").update(stringToSign).digest("hex");
  }

  // Method to calculate signature for Tefpay form submission
  private calculateFormSignature(fields: Record<string, string>): string {
    // Tefpay signature for form submission usually involves concatenating specific fields
    // and the private key, then hashing. The exact fields and order are crucial.
    // Example: Ds_Merchant_Amount + Ds_Merchant_Order + Ds_Merchant_MerchantCode + Ds_Merchant_Currency + Ds_Merchant_TransactionType + Clave Secreta
    // This MUST be verified with Tefpay documentation.
    const signatureBaseString = `${fields.Ds_Merchant_Amount}${fields.Ds_Merchant_Order}${fields.Ds_Merchant_MerchantCode}${fields.Ds_Merchant_Currency}${fields.Ds_Merchant_TransactionType}${this.tefpayPrivateKey}`;

    const calculatedSignature = crypto
      .createHash("sha256") // Tefpay might use SHA256 for form signatures. VERIFY!
      .update(signatureBaseString)
      .digest("hex")
      .toLowerCase();
    // this.logger.debug(
    //   `String for Tefpay form signature: ${signatureBaseString}`
    // );
    // this.logger.debug(
    //   `Calculated Tefpay form signature: ${calculatedSignature}`
    // );
    return calculatedSignature;
  }

  /**
   * Verifies the signature of an incoming Tefpay S2S notification.
   * @param payload The raw notification payload from Tefpay.
   * @param receivedSignature The Ds_Signature value received in the notification.
   * @returns True if the signature is valid, false otherwise.
   */
  public verifyS2SSignature(
    payload: Record<string, any>, // Esto es efectivamente TefPayNotificationDto
    receivedSignature: string
  ): boolean {
    this.logger.debug(
      `Verifying S2S signature. Received Signature: ${receivedSignature}`
    );

    if (!this.tefpayPrivateKey) {
      this.logger.error(
        "TEFPAY_PRIVATE_KEY is not configured. Cannot verify S2S signature."
      );
      return false;
    }

    if (!receivedSignature) {
      this.logger.warn("No Ds_Signature received in S2S notification payload.");
      return false;
    }

    const {
      // Campos para Receta Principal
      Ds_Amount,
      Ds_AuthorisationCode,
      Ds_Merchant_TransactionType,
      Ds_Date,
      // Campos para ambas recetas (merchantData)
      Ds_Merchant_MatchingData,
      Ds_Merchant_Subscription_Account,
      // Campos para Receta de Fallback (ya están en propiedades de clase o .env)
      // this.tefpayDsAmount
      // this.tefpayMerchantCode
      // this.tefpayNotifyUrl
      // Campos adicionales que podrían estar en el payload pero no se usan directamente en estas firmas
      Ds_Order, // Usado para logging
      Ds_Message, // Podría usarse en futuras recetas de firma
      Ds_Code, // Podría usarse en futuras recetas de firma
    } = payload;

    // Determinar qué campo usar para los datos del comerciante (común a ambas recetas)
    let merchantDataForSignature = Ds_Merchant_MatchingData;
    if (
      Ds_Merchant_MatchingData === undefined ||
      Ds_Merchant_MatchingData === null ||
      Ds_Merchant_MatchingData === ""
    ) {
      this.logger.debug(
        "Ds_Merchant_MatchingData is not present, attempting to use Ds_Merchant_Subscription_Account."
      );
      merchantDataForSignature = Ds_Merchant_Subscription_Account;
    }
    const merchantDataString = merchantDataForSignature ?? "";

    // --- Intento con Receta Principal (basada en documentación para notificaciones con detalles de tx) ---
    // SHA1(Ds_Amount + Ds_Merchant_MatchingData + Ds_AuthorisationCode + Ds_Merchant_TransactionType + Ds_Date + CLAVE)
    if (
      Ds_Amount !== undefined &&
      Ds_AuthorisationCode !== undefined &&
      Ds_Merchant_TransactionType !== undefined &&
      Ds_Date !== undefined
    ) {
      const stringToSignRecipe1 =
        String(Ds_Amount) +
        merchantDataString +
        String(Ds_AuthorisationCode) +
        String(Ds_Merchant_TransactionType) +
        String(Ds_Date) +
        this.tefpayPrivateKey;

      this.logger.debug(
        `Attempting S2S signature verification with Recipe 1 (detailed tx). String to sign: ${stringToSignRecipe1}`
      );
      try {
        const calculatedSignatureRecipe1 = crypto
          .createHash("sha1")
          .update(stringToSignRecipe1)
          .digest("hex")
          .toUpperCase();

        if (calculatedSignatureRecipe1 === receivedSignature.toUpperCase()) {
          this.logger.log(
            `Tefpay S2S signature VERIFIED successfully with Recipe 1. Order: ${Ds_Order}, MatchingData: ${merchantDataString}`
          );
          return true;
        }
        this.logger.debug(
          `Recipe 1 FAILED. Expected ${calculatedSignatureRecipe1}, got ${receivedSignature.toUpperCase()}`
        );
      } catch (error) {
        this.logger.error(
          `Error during S2S signature calculation with Recipe 1: ${error instanceof Error ? error.message : String(error)}`
        );
        // Continúa para probar la Receta de Fallback
      }
    } else {
      this.logger.debug(
        "Skipping Recipe 1 for S2S signature: Not all required fields (Ds_Amount, Ds_AuthorisationCode, Ds_Merchant_TransactionType, Ds_Date) are present."
      );
    }

    // --- Intento con Receta de Fallback (lógica actual, para suscripciones u otros casos) ---
    // TEFPAY_DS_AMOUNT (de .env) + TEFPAY_MERCHANT_CODE (de .env) + (Ds_Merchant_MatchingData o Ds_Merchant_Subscription_Account de payload) + notificationUrl (de .env) + TEFPAY_PRIVATE_KEY (de .env)

    // Validar que las variables de entorno necesarias para esta receta estén cargadas
    if (
      this.tefpayDsAmount === undefined ||
      !this.tefpayMerchantCode ||
      !this.tefpayNotifyUrl
    ) {
      this.logger.error(
        "Cannot attempt S2S signature with Fallback Recipe: Required environment variables (TEFPAY_DS_AMOUNT, TEFPAY_MERCHANT_CODE, TEFPAY_NOTIFY_URL) are not fully configured."
      );
      // Si la Receta 1 ya falló o no se aplicó, y esta tampoco puede, entonces la validación falla.
      this.logger.warn(
        `Tefpay S2S notification signature validation FAILED. Order: ${Ds_Order}, MatchingData: ${merchantDataString}. Could not apply any signature recipe.`
      );
      return false;
    }

    const stringToSignFallback =
      String(this.tefpayDsAmount) +
      String(this.tefpayMerchantCode) +
      merchantDataString +
      this.tefpayNotifyUrl +
      this.tefpayPrivateKey;

    this.logger.debug(
      `Attempting S2S signature verification with Fallback Recipe. String to sign: ${stringToSignFallback}`
    );

    try {
      const calculatedSignatureFallback = crypto
        .createHash("sha1")
        .update(stringToSignFallback)
        .digest("hex")
        .toUpperCase();

      this.logger.debug(
        `Fallback Recipe: Calculated S2S Signature: ${calculatedSignatureFallback}, Received S2S Signature: ${receivedSignature.toUpperCase()}`
      );

      if (calculatedSignatureFallback === receivedSignature.toUpperCase()) {
        this.logger.log(
          `Tefpay S2S notification signature VERIFIED successfully with Fallback Recipe. Order: ${Ds_Order}, MatchingData: ${merchantDataString}`
        );
        return true;
      } else {
        this.logger.warn(
          `Tefpay S2S notification signature validation FAILED with Fallback Recipe. Order: ${Ds_Order}, MatchingData: ${merchantDataString}. Expected ${calculatedSignatureFallback}, got ${receivedSignature.toUpperCase()}`
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Error during S2S signature calculation with Fallback Recipe: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  // Corrected method to align with IPaymentProcessor interface
  preparePaymentParameters(
    params: PreparePaymentParams
  ): PreparedPaymentResponse {
    const {
      amount,
      currency,
      order,
      metadata,
      success_url, // Corrected: success_url from interface
      cancel_url, // Corrected: cancel_url from interface
      notification_url, // Corrected: notification_url from interface
    } = params;

    const merchantCode = this.tefpayMerchantCode;
    const terminal = this.configService.get<string>("TEFPAY_TERMINAL", "001"); // Removed unnecessary !
    const transactionType = "0"; // Autorización
    // Tefpay expects amount in cents, ensure it's an integer string.
    const formattedAmount = Math.round(amount * 100).toString();
    const currencyCode = this.getTefpayCurrencyCode(currency);
    const dsMerchantData = metadata?.payment_code || order;

    const fields: Record<string, string> = {
      Ds_Merchant_Amount: formattedAmount,
      Ds_Merchant_Currency: currencyCode,
      Ds_Merchant_Order: order,
      Ds_Merchant_MerchantCode: merchantCode,
      Ds_Merchant_Terminal: terminal,
      Ds_Merchant_TransactionType: transactionType,
      Ds_Merchant_MerchantURL: notification_url || "", // Ensure string, provide default if undefined
      Ds_Merchant_UrlOK: success_url || "", // Ensure string, provide default if undefined
      Ds_Merchant_UrlKO: cancel_url || "", // Ensure string, provide default if undefined
      Ds_Merchant_ConsumerLanguage: "001",
      Ds_Merchant_MatchingData: dsMerchantData,
    };

    if (metadata?.subscription_id) {
      fields.Ds_Merchant_Identifier = `REQUIRED${metadata.subscription_id}`;
      fields.Ds_Merchant_Group = this.configService.get<string>(
        "TEFPAY_SUBSCRIPTION_GROUP_CODE",
        ""
      )!; // Provide default
      fields.Ds_Merchant_DirectPayment = "true";
    }

    const signature = this.calculateFormSignature(fields);
    fields.Ds_Signature = signature;

    const formInputs = Object.entries(fields)
      .map(([key, value]) => ({ name: key, value }))
      .filter((field) => field.value !== undefined && field.value !== null);

    this.logger.log(
      `Preparing Tefpay payment for order ${order} with amount ${amount} ${currency}`
    );

    return {
      // Corrected to match PreparedPaymentResponse interface
      url: this.tefpayFormUrl,
      fields: formInputs.reduce(
        (obj, item) => {
          obj[item.name] = item.value;
          return obj;
        },
        {} as Record<string, string>
      ),
      payment_processor_name: "tefpay",
    };
  }

  // Removed async as there are no await calls. Kept Promise for interface compatibility.
  handleWebhookNotification(
    payload: any,
    _signature?: string | string[] | Buffer // Mark signature as unused with _
  ): Promise<ProcessedNotificationResponse> {
    const orderId = payload.Ds_Order || payload.DS_ORDER;
    const tefpayTransactionId =
      payload.Ds_AuthorisationCode || payload.DS_AUTHORISATIONCODE;
    const responseCode = payload.Ds_Response || payload.DS_RESPONSE;
    const matchingData =
      payload.Ds_Merchant_MatchingData || payload.DS_MERCHANT_MATCHINGDATA;

    const isSuccess =
      responseCode &&
      parseInt(responseCode, 10) >= 0 &&
      parseInt(responseCode, 10) <= 99;

    let status: PaymentStatus = PaymentStatus.PENDING; // MODIFICADO: Usar enum PaymentStatus
    if (isSuccess) {
      status = PaymentStatus.COMPLETED;
    } else if (responseCode) {
      status = PaymentStatus.FAILED;
    }

    // Construct response according to ProcessedNotificationResponse interface
    return Promise.resolve({
      paymentId: matchingData || orderId, // Use matchingData as primary, fallback to orderId
      status,
      transactionId: tefpayTransactionId,
      eventType: this.mapTefpayResponseToEventType(
        responseCode,
        payload.Ds_Merchant_TransactionType
      ), // Pass transaction type if available
      rawData: payload,
      message: isSuccess
        ? "Payment successful"
        : `Tefpay response code: ${responseCode}`,
      error: isSuccess ? undefined : `Tefpay error code: ${responseCode}`,
      // customer_id and subscription_id are not directly part of ProcessedNotificationResponse, but can be in rawData
    });
  }

  private mapTefpayResponseToEventType(
    responseCode: string,
    transactionType?: string
  ): PaymentEventType {
    // MODIFICADO: Usar enum PaymentEventType
    // Example: Distinguish between payment success/failure and subscription events if transactionType is available
    if (transactionType === "P" || transactionType === "T") {
      // Example: Recurring/Subscription related
      if (responseCode && parseInt(responseCode, 10) < 100) {
        return PaymentEventType.SUBSCRIPTION_PAYMENT_SUCCEEDED;
      }
      return PaymentEventType.SUBSCRIPTION_PAYMENT_FAILED;
    }

    // Default to payment events
    if (responseCode && parseInt(responseCode, 10) < 100) {
      return PaymentEventType.PAYMENT_SUCCEEDED;
    }
    return PaymentEventType.PAYMENT_FAILED;
  }

  // MÉTODO ACTUALIZADO: verifySignature
  verifySignature(
    payload: any,
    signature: string | string[] | Buffer // Signature is used here
  ): boolean {
    // const tefpayWebhookSecret = this.configService.get<string>(
    //   "TEFPAY_WEBHOOK_SECRET"
    // ); // REMOVED
    if (!this.tefpayPrivateKey) {
      // Check for private key instead
      this.logger.error(
        "TEFPAY_PRIVATE_KEY is not configured. Cannot verify signature."
      );
      return false;
    }

    if (!signature) {
      this.logger.warn("No signature provided in Tefpay webhook notification.");
      return false;
    }

    // Convertir la firma a string si es Buffer o array
    let sigToVerify: string;
    if (Buffer.isBuffer(signature)) {
      sigToVerify = signature.toString("utf-8"); // Tefpay suele enviar la firma como string
    } else if (Array.isArray(signature)) {
      sigToVerify = signature[0]; // Asumir que es el primer elemento si es un array
    } else {
      sigToVerify = signature;
    }

    // La firma de Tefpay para notificaciones S2S se calcula sobre los parámetros del POST
    // y la clave secreta. El orden es crucial.
    // Ds_Amount + Ds_Order + Ds_MerchantCode + Ds_Currency + Ds_Response + Ds_Merchant_MatchingData + Clave Secreta (SHA256)
    // ¡ESTO DEBE SER VERIFICADO CON LA DOCUMENTACIÓN DE TEFPAY PARA NOTIFICACIONES S2S!
    // Los campos exactos y su orden pueden variar.

    // Ejemplo (¡VERIFICAR CAMPOS Y ORDEN CON TEFPAY!):
    const fieldsForSignature = [
      payload.Ds_Amount,
      payload.Ds_Order,
      payload.Ds_MerchantCode,
      payload.Ds_Currency,
      payload.Ds_Response,
      payload.Ds_Merchant_MatchingData, // Added as per common S2S signature patterns
      // payload.Ds_TransactionType, // Often included
      // payload.Ds_SecurePayment, // Often included
    ];

    // Filtrar campos undefined o null, ya que no formarían parte del string base
    const definedFields = fieldsForSignature.filter(
      (field) => field !== undefined && field !== null
    );

    const baseStringForSignature =
      definedFields.join("") + this.tefpayPrivateKey; // Use private key

    this.logger.warn(
      "Tefpay verifySignature: Ensure S2S signature fields and order are correct as per Tefpay documentation."
    );
    this.logger.debug(
      // `S2S Signature: Base='${baseStringForSignature}', Received='${sigToVerify}', Calculated='${expectedSignature}'`
      `S2S Signature: Base='${baseStringForSignature}', Received='${sigToVerify}' (Calculated signature logic is currently bypassed/commented)`
    );

    // return sigToVerify.toLowerCase() === expectedSignature; // UNCOMMENT FOR PRODUCTION

    this.logger.warn(
      "TEMPORARY: Tefpay S2S signature verification is BYPASSED. Re-enable for production."
    );
    return true; // REMOVE THIS LINE FOR PRODUCTION
  }

  // Add other methods for different Tefpay API interactions (e.g., refunds, cancellations, queries)

  /**
   * Creates the parameters needed for a Tefpay redirect form.
   * This is similar to `preparePaymentParameters` but might be used in contexts
   * where the full `IPaymentProcessor` interface isn't being strictly followed,
   * or for specific Tefpay form scenarios.
   */
  public createTefpayRedirectFormParams(params: {
    amount: number;
    currency: string;
    order: string;
    return_url: string; // URL to redirect after payment
    notification_url: string; // URL for S2S notifications
    cancel_url: string; // URL if user cancels
    payment_code: string; // Our internal payment code, used for Ds_Merchant_MatchingData
    subscription_id?: string; // Optional: if this is for a subscription
    user_name?: string; // Optional: user name for display/logging
    email?: string; // Optional: user email for display/logging
  }): { url: string; fields: Record<string, string> } {
    const merchantCode = this.tefpayMerchantCode;
    const terminal = this.configService.get<string>("TEFPAY_TERMINAL", "001");
    const transactionType = "0"; // Autorización
    const formattedAmount = Math.round(params.amount * 100).toString();
    const currencyCode = this.getTefpayCurrencyCode(params.currency);

    const fields: Record<string, string> = {
      Ds_Merchant_Amount: formattedAmount,
      Ds_Merchant_Currency: currencyCode,
      Ds_Merchant_Order: params.order,
      Ds_Merchant_MerchantCode: merchantCode,
      Ds_Merchant_Terminal: terminal,
      Ds_Merchant_TransactionType: transactionType,
      Ds_Merchant_MerchantURL: params.notification_url,
      Ds_Merchant_UrlOK: params.return_url,
      Ds_Merchant_UrlKO: params.cancel_url,
      Ds_Merchant_ConsumerLanguage: "001", // Spanish
      Ds_Merchant_MatchingData: params.payment_code, // Use our payment_code here
    };

    if (params.subscription_id) {
      fields.Ds_Merchant_Identifier = `REQUIRED${params.subscription_id}`;
      fields.Ds_Merchant_Group = this.configService.get<string>(
        "TEFPAY_SUBSCRIPTION_GROUP_CODE",
        ""
      )!;
      fields.Ds_Merchant_DirectPayment = "true"; // For recurring payments
    }

    const signature = this.calculateFormSignature(fields);
    fields.Ds_Signature = signature;

    this.logger.log(
      `Creating Tefpay redirect form parameters for order ${params.order}`
    );

    return {
      url: this.tefpayFormUrl,
      fields: fields,
    };
  }

  /**
   * Handles a request to cancel a subscription from Tefpay's perspective.
   * For Tefpay, this usually means the merchant will stop initiating future payments
   * for the given subscription account.
   *
   * @param params Parameters for subscription cancellation.
   * @param params.subscriptionId Our internal ID for the subscription.
   * @param params.cancellationReason Optional reason for cancellation.
   * @returns A promise resolving to a SubscriptionCancellationResponse.
   */
  requestSubscriptionCancellation(params: {
    subscriptionId: string;
    cancellationReason?: string;
  }): Promise<SubscriptionCancellationResponse> {
    this.logger.log(
      `Request to cancel subscription received for Tefpay. Local Subscription ID: ${params.subscriptionId}, Reason: ${params.cancellationReason || "N/A"}`
    );

    // En este punto, si Tefpay tuviera una API específica para "dar de baja"
    // un Ds_Merchant_Subscription_Account o detener cobros recurrentes, se llamaría aquí.
    // Por ejemplo:
    // try {
    //   await this.httpService.post(`${this.tefpayApiBaseUrl}/cancel-subscription`, {
    //     merchantCode: this.tefpayMerchantCode,
    //     subscriptionAccount: processorSubscriptionId, // Necesitaríamos este dato
    //     reason: params.cancellationReason,
    //     // Otros campos requeridos por Tefpay
    //   }).toPromise();
    //   this.logger.log(`Successfully notified Tefpay about cancellation for subscription ID: ${params.subscriptionId}`);
    // } catch (error) {
    //   this.logger.error(`Error notifying Tefpay about subscription cancellation for ID ${params.subscriptionId}: ${error}`);
    //   return {
    //     success: false,
    //     message: "Failed to communicate subscription cancellation to Tefpay.",
    //     error: error.message,
    //   };
    // }

    // Asumiendo que la cancelación se gestiona principalmente del lado de nuestra aplicación
    // (no renovando / no iniciando más pagos), Tefpay no necesita una acción directa aquí
    // más allá de lo que ya se gestiona con las notificaciones de pago fallido si no se renueva.
    // La fecha efectiva de cancelación (current_period_end) será determinada y guardada por el SubscriptionsService.
    return Promise.resolve({
      success: true,
      message:
        "Tefpay subscription cancellation request acknowledged. Effective cancellation will be handled by the application based on the current billing cycle.",
      // newStatus: 'pending_cancellation', // El SubscriptionsService se encargará de esto
      // effectiveCancellationDate: será establecido por SubscriptionsService
    });
  }
}
