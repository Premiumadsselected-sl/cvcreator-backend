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

  // Corrected method to align with IPaymentProcessor interface
  preparePaymentParameters(
    params: PreparePaymentParams
  ): PreparedPaymentResponse {
    const {
      amount,
      currency,
      order,
      success_url,
      cancel_url,
      metadata,
      customer_email,
      product_description,
    } = params;

    // Tefpay expects amount in cents (integer)
    const amountInCents = Math.round(amount * 100).toString();

    const notificationUrl = `${this.configService.get<string>(
      "APP_URL"
    )}/payments/tefpay/notifications`;

    // Construct merchantParameters carefully, ensuring all parts are defined
    const merchantParamsObject: Record<string, any> = {
      order_id: order, // Use 'order' from params
    };
    if (metadata?.userId) {
      merchantParamsObject.user_id = metadata.userId;
    }
    if (metadata?.paymentId) {
      merchantParamsObject.payment_id = metadata.paymentId;
    }

    const merchantParameters = JSON.stringify(merchantParamsObject);

    const fields: Record<string, string> = {
      Ds_Merchant_Amount: amountInCents,
      Ds_Merchant_Currency: currency === "EUR" ? "978" : "840", // 978 for EUR, 840 for USD (ensure this mapping is correct)
      Ds_Merchant_Order: order.substring(0, 12), // Tefpay order ID max 12 chars
      Ds_Merchant_MerchantCode: this.tefpayMerchantCode,
      Ds_Merchant_Terminal: "1", // Default terminal
      Ds_Merchant_TransactionType: "0", // Authorization
      Ds_Merchant_MerchantURL: notificationUrl, // URL for Tefpay to send notifications
      Ds_Merchant_UrlOK: success_url || "", // Use success_url from params, provide default if undefined
      Ds_Merchant_UrlKO: cancel_url || "", // Use cancel_url from params, provide default if undefined
      Ds_Merchant_MerchantData:
        Buffer.from(merchantParameters).toString("base64"), // Optional, for custom data
    };

    // Add optional fields if they are provided
    if (customer_email) {
      fields.Ds_Merchant_Customer_Mail = customer_email;
    }
    if (product_description) {
      fields.Ds_Merchant_ProductDescription = product_description;
    }

    const signature = this.calculateFormSignature(fields);

    const formInputs = {
      ...fields,
      Ds_SignatureVersion: "HMAC_SHA256_V1", // Or whatever version Tefpay uses
      Ds_Signature: signature,
    };

    this.logger.log(
      `Preparing Tefpay payment for order ${order} with amount ${amount} ${currency}`
    );
    this.logger.debug(`Tefpay form inputs: ${JSON.stringify(formInputs)}`);

    return {
      url: this.tefpayFormUrl, // URL of the Tefpay payment page
      fields: formInputs, // Data to be POSTed to the redirectUrl
      payment_processor_name: "tefpay",
    };
  }

  // Add other methods for different Tefpay API interactions (e.g., refunds, cancellations, queries)
}
