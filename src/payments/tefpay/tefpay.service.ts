import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios"; // Correct import for HttpService
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import {
  IPaymentProcessor,
  PreparePaymentParams,
  PreparedPaymentResponse,
} from "../processors/payment-processor.interface";

@Injectable()
export class TefpayService implements IPaymentProcessor {
  private readonly logger = new Logger(TefpayService.name);
  private readonly tefpayMerchantCode: string;
  private readonly tefpayPrivateKey: string;
  private readonly tefpayApiBaseUrl: string; // Will be set from config, e.g., 'https://api.tefpay.com/rest'
  private readonly tefpayFormUrl: string; // URL for Tefpay's payment form/redirect
  private readonly tefpayBackofficeUrl: string; // For notifications, if different

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService // Uncommented and correctly typed
  ) {
    // Using non-null assertion operator (!) as we check for existence and throw an error if not found.
    this.tefpayMerchantCode = this.configService.get<string>(
      "TEFPAY_MERCHANT_CODE"
    )!;
    this.tefpayPrivateKey =
      this.configService.get<string>("TEFPAY_PRIVATE_KEY")!;
    this.tefpayApiBaseUrl = this.configService.get<string>(
      "TEFPAY_API_URL",
      "https://api.tefpay.com/rest" // Default value if not provided
    )!;
    // Assuming a single URL for redirection, often configured in Tefpay backoffice or a standard endpoint
    this.tefpayFormUrl = this.configService.get<string>(
      "TEFPAY_FORM_URL", // e.g., https://pgw.tefpay.com/web/pay
      "https://pgw.tefpay.com/web/pay" // Default generic URL, adjust as needed
    )!;
    this.tefpayBackofficeUrl = this.configService.get<string>(
      "TEFPAY_BACKOFFICE_URL" // Used for constructing notification URL if needed
    )!; // This might be the base for the notification URL

    if (
      !this.tefpayMerchantCode ||
      !this.tefpayPrivateKey ||
      !this.tefpayFormUrl
    ) {
      this.logger.error(
        "Tefpay merchant code, private key, or form URL is not configured."
      );
      throw new Error("Tefpay configuration is missing.");
    }
  }

  // Method to calculate signature for outgoing requests
  private calculateRequestSignature(payload: Record<string, any>): string {
    // Based on Tefpay documentation:
    // The signature is calculated over a string formed by concatenating specific fields
    // of the request message, followed by the merchant's private key.
    // The order of fields and the exact concatenation logic must match Tefpay's requirements.
    // This is a placeholder and needs to be implemented according to Tefpay's specific signature algorithm for requests.
    // Typically, it involves:
    // 1. Selecting specific fields from the payload.
    // 2. Ordering them alphabetically or in a predefined sequence.
    // 3. Concatenating their values.
    // 4. Appending the private key.
    // 5. Hashing the resulting string (e.g., SHA256).
    // 6. Base64 encoding the hash.

    // Example (highly dependent on Tefpay's actual requirements for request signatures):
    const dataToSign = JSON.stringify(payload) + this.tefpayPrivateKey; // This is a simplification
    const hash = crypto
      .createHash("sha256")
      .update(dataToSign)
      .digest("base64");
    return hash;
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
    this.logger.debug(
      `String for Tefpay form signature: ${signatureBaseString}`
    );
    this.logger.debug(
      `Calculated Tefpay form signature: ${calculatedSignature}`
    );
    return calculatedSignature;
  }

  // Changed to be synchronous as no async operations are performed inside
  preparePaymentParameters(
    params: PreparePaymentParams
  ): PreparedPaymentResponse {
    const {
      amount,
      currency,
      order,
      product_description,
      customer_email,
      merchant_data,
      success_url, // from PreparePaymentParams
      cancel_url, // from PreparePaymentParams
      notification_url, // from PreparePaymentParams
    } = params;

    const appBaseUrl = this.configService.get<string>("APP_BASE_URL", ""); // Provide a default empty string
    const defaultSuccessUrl = `${appBaseUrl}/payment/success?order_id=${order}`;
    const defaultCancelUrl = `${appBaseUrl}/payment/failure?order_id=${order}`;
    const defaultNotificationUrl = `${this.configService.get<string>(
      "DOMAIN_URL"
    )}/payments/tefpay/notify`; // Ensure DOMAIN_URL is set

    const fields: Record<string, string> = {
      Ds_Merchant_Amount: String(amount), // Amount in cents
      Ds_Merchant_Currency: currency, // ISO 4217 currency code (e.g., 978 for EUR)
      Ds_Merchant_Order: order,
      Ds_Merchant_MerchantCode: this.tefpayMerchantCode,
      Ds_Merchant_Terminal: "1", // Default terminal, usually 1
      Ds_Merchant_TransactionType: "0", // 0 for Authorization, check Tefpay docs
      Ds_Merchant_ProductDescription: product_description || `Pedido ${order}`,
      Ds_Merchant_Titular: customer_email || "", // Can be user's name or email
      Ds_Merchant_MerchantData: merchant_data || "", // Optional data
      Ds_Merchant_UrlOK: success_url || defaultSuccessUrl,
      Ds_Merchant_UrlKO: cancel_url || defaultCancelUrl,
      Ds_Merchant_UrlNotification: notification_url || defaultNotificationUrl,
      // Ds_Merchant_PayMethods: 'C', // C for Card, T for Card + Bizum, etc. Check Tefpay docs.
    };

    fields.Ds_Merchant_MerchantSignature = this.calculateFormSignature(fields);

    this.logger.debug("Tefpay form parameters prepared:", {
      url: this.tefpayFormUrl,
      fields,
    });

    return {
      url: this.tefpayFormUrl, // The URL to which the form (with these fields) should be POSTed
      fields: fields, // These fields should be submitted as a POST request to the URL
      payment_processor_name: "tefpay",
    };
  }

  // Add other methods for different Tefpay API interactions (e.g., refunds, cancellations, queries)
}
