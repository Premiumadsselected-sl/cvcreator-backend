import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { v4 as uuidv4 } from "uuid";
import {
  TefPayNotificationDto,
  TefPayNotificationStatus as DtoTefPayNotificationStatus,
} from "./dto/notification.dto";
import { AuditLogsService } from "../../../audit-logs/audit-logs.service";
import { TefPayNotificationStatus } from "@prisma/client"; // Added direct import

@Injectable()
export class TefpayNotificationsService {
  private readonly logger = new Logger(TefpayNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  // Helper to map Prisma Status to DTO Status
  private mapPrismaStatusToDtoStatus(
    prismaStatus: TefPayNotificationStatus // Use direct import
  ): DtoTefPayNotificationStatus {
    switch (prismaStatus) {
      case TefPayNotificationStatus.RECEIVED:
        return DtoTefPayNotificationStatus.RECEIVED;
      case TefPayNotificationStatus.PROCESSING:
        return DtoTefPayNotificationStatus.PROCESSING;
      case TefPayNotificationStatus.PROCESSED:
        return DtoTefPayNotificationStatus.PROCESSED;
      case TefPayNotificationStatus.PROCESSED_UNHANDLED:
        return DtoTefPayNotificationStatus.PROCESSED_UNHANDLED;
      case TefPayNotificationStatus.ERROR:
        return DtoTefPayNotificationStatus.ERROR;
      case TefPayNotificationStatus.SIGNATURE_FAILED:
        return DtoTefPayNotificationStatus.SIGNATURE_FAILED;
      case TefPayNotificationStatus.SIGNATURE_MISSING:
        return DtoTefPayNotificationStatus.SIGNATURE_MISSING;
      default:
        this.logger.warn(
          `Unmapped Prisma TefPayNotificationStatus: ${prismaStatus}`
        );
        return DtoTefPayNotificationStatus.ERROR;
    }
  }

  /**
   * Processes an incoming raw notification payload from Tefpay.
   * 1. (TODO) Verifies the S2S signature.
   * 2. Stores the raw notification.
   * 3. Emits a structured event for other services (like PaymentsService) to consume.
   * @param incomingPayload The raw data from Tefpay notification.
   * @returns The stored notification DTO.
   */
  async processAndStoreIncomingTefpayNotification(
    incomingPayload: Record<string, any>
  ): Promise<TefPayNotificationDto> {
    const orderIdentifier =
      incomingPayload.Ds_Merchant_MatchingData ||
      incomingPayload.Ds_Order ||
      "UNKNOWN";
    this.logger.log(
      `[TefpayNotificationsService] Processing incoming Tefpay notification for order: ${orderIdentifier}`
    );

    const notificationId = uuidv4(); // uuidv4 is now defined
    const now = new Date();

    // Create the DTO for storage, mapping all known Ds_* fields
    // and any other fields captured by [key: string]: any in TefpayIncomingNotificationDto
    const notificationToStore: Omit<
      TefPayNotificationDto,
      "payment_id" | "subscription_id" | "processing_notes"
    > = {
      id: notificationId,
      Ds_Amount: incomingPayload.Ds_Amount, // Corrected: Ds_Amount
      Ds_Merchant_MatchingData: incomingPayload.Ds_Merchant_MatchingData, // Corrected
      Ds_AuthorisationCode: incomingPayload.Ds_AuthorisationCode, // Corrected
      Ds_Bank: incomingPayload.Ds_Bank, // Corrected (assuming Ds_Bank is in DTO)
      Ds_Merchant_TransactionType: incomingPayload.Ds_Merchant_TransactionType, // Corrected
      Ds_Message: incomingPayload.Ds_Message, // Corrected
      Ds_Code: incomingPayload.Ds_Code, // Corrected
      Ds_PanMask: incomingPayload.Ds_PanMask, // Corrected (assuming Ds_PanMask is in DTO)
      Ds_Expiry: incomingPayload.Ds_Expiry, // Corrected (assuming Ds_Expiry is in DTO)
      Ds_Date: incomingPayload.Ds_Date, // Corrected
      Ds_Merchant_MerchantCode: incomingPayload.Ds_Merchant_MerchantCode, // Corrected
      Ds_Merchant_Guarantees: incomingPayload.Ds_Merchant_Guarantees, // Corrected (assuming Ds_Merchant_Guarantees is in DTO)
      Ds_Signature: incomingPayload.Ds_Signature, // Corrected
      Ds_Merchant_TransactionID: incomingPayload.Ds_Merchant_TransactionID, // Corrected (assuming Ds_Merchant_TransactionID is in DTO)
      Ds_Merchant_Subscription_Account:
        incomingPayload.Ds_Merchant_Subscription_Account, // Corrected
      Ds_Merchant_Subscription_Action:
        incomingPayload.Ds_Merchant_Subscription_Action, // Corrected
      Ds_Merchant_Terminal: incomingPayload.Ds_Merchant_Terminal, // Corrected
      Ds_Currency: incomingPayload.Ds_Currency, // Corrected
      Ds_CostumerCreditCardCountry:
        incomingPayload.Ds_CostumerCreditCardCountry, // Corrected (assuming Ds_CostumerCreditCardCountry is in DTO)
      Ds_CostumerCreditCardBrand: incomingPayload.Ds_CostumerCreditCardBrand, // Corrected (assuming Ds_CostumerCreditCardBrand is in DTO)
      Ds_CostumerCreditCardType: incomingPayload.Ds_CostumerCreditCardType, // Corrected (assuming Ds_CostumerCreditCardType is in DTO)
      Ds_CostumerCreditCardExpiryDate:
        incomingPayload.Ds_CostumerCreditCardExpiryDate, // Corrected (assuming Ds_CostumerCreditCardExpiryDate is in DTO)
      Ds_CostumerCreditCardId: incomingPayload.Ds_CostumerCreditCardId, // Corrected (assuming Ds_CostumerCreditCardId is in DTO)
      Ds_CostumerCreditCardBin: incomingPayload.Ds_CostumerCreditCardBin, // Corrected (assuming Ds_CostumerCreditCardBin is in DTO)
      Ds_Merchant_UserName: incomingPayload.Ds_Merchant_UserName, // Corrected (assuming Ds_Merchant_UserName is in DTO)
      ds_Order: incomingPayload.Ds_Order, // Corrected
      ds_TransactionDate: incomingPayload.Ds_TransactionDate, // Corrected (assuming Ds_TransactionDate is in DTO)
      ds_ClientRef: incomingPayload.Ds_ClientRef, // Corrected (assuming Ds_ClientRef is in DTO)
      ds_CodeBank: incomingPayload.Ds_CodeBank, // Corrected (assuming Ds_CodeBank is in DTO)
      ds_Merchant_Url: incomingPayload.Ds_Merchant_Url, // Corrected (assuming Ds_Merchant_Url is in DTO)
      raw_notification: incomingPayload as any, // Store the entire incoming payload
      status: DtoTefPayNotificationStatus.RECEIVED, // Initial status using DTO enum
      createdAt: now,
      updatedAt: now,
    };

    try {
      const storedNotificationPrisma =
        await this.prisma.tefPayNotification.create({
          data: {
            id: notificationId,
            ds_Order: incomingPayload.Ds_Order,
            ds_Code: incomingPayload.Ds_Code,
            ds_Message: incomingPayload.Ds_Message,
            ds_Merchant_MatchingData: incomingPayload.Ds_Merchant_MatchingData,
            ds_Date: incomingPayload.Ds_Date,
            ds_Hour: incomingPayload.Ds_Hour,
            ds_SecurePayment: incomingPayload.Ds_SecurePayment,
            ds_Card_Type: incomingPayload.Ds_Card_Type,
            ds_Card_Country: incomingPayload.Ds_Card_Country,
            ds_AuthorisationCode: incomingPayload.Ds_AuthorisationCode,
            ds_Merchant_TransactionType:
              incomingPayload.Ds_Merchant_TransactionType,
            ds_Merchant_MerchantCode: incomingPayload.Ds_Merchant_MerchantCode,
            ds_Merchant_Terminal: incomingPayload.Ds_Terminal, // Mapeo de Ds_Terminal a ds_Merchant_Terminal
            ds_Amount: incomingPayload.Ds_Amount,
            ds_Currency: incomingPayload.Ds_Currency,
            ds_Signature: incomingPayload.Ds_Signature,
            ds_Merchant_Subscription_Account:
              incomingPayload.Ds_Merchant_Subscription_Account,
            ds_Merchant_Subscription_Action:
              incomingPayload.Ds_Merchant_Subscription_Action,
            ds_Merchant_Url: incomingPayload.Ds_Merchant_Url,
            ds_CodeBank: incomingPayload.Ds_CodeBank,
            ds_TransactionDate: incomingPayload.Ds_TransactionDate, // Asumiendo que viene en el payload como Ds_TransactionDate
            ds_ClientRef: incomingPayload.Ds_ClientRef, // Asumiendo que viene en el payload como Ds_ClientRef

            raw_notification: incomingPayload as any, // Store the entire incoming payload
            status: TefPayNotificationStatus.RECEIVED, // Use direct import
            createdAt: now,
            updatedAt: now,
          } as any,
        });
      this.logger.log(
        `[TefpayNotificationsService] Stored Tefpay notification ID: ${storedNotificationPrisma.id} for order: ${orderIdentifier}`
      );

      // Emit a specific event for Tefpay notifications that are stored (and ideally verified)
      // PaymentsService or other relevant services will listen to this.
      this.eventEmitter.emit(
        "tefpay.notification.processed_by_handler",
        storedNotificationPrisma // Send the Prisma object directly
      );

      // Map Prisma entity to DTO for return, ensuring status is correctly mapped
      return {
        ...storedNotificationPrisma,
        raw_notification: storedNotificationPrisma.raw_notification as any,
        status: this.mapPrismaStatusToDtoStatus(
          storedNotificationPrisma.status
        ),
      } as TefPayNotificationDto;
    } catch (error) {
      this.logger.error(
        `[TefpayNotificationsService] Error storing Tefpay notification for order ${orderIdentifier}: ${error.message}`,
        error.stack
      );
      // TODO: Create an audit log for storage failure
      throw error; // Rethrow to be handled by the controller
    }
  }

  /**
   * Updates the processing status of a stored notification.
   */
  async updateNotificationProcessingStatus(
    notificationId: string,
    status: TefPayNotificationStatus, // Use direct import
    paymentId?: string,
    subscriptionId?: string,
    processingNotes?: string
  ): Promise<TefPayNotificationDto> {
    this.logger.log(
      `Updating notification ${notificationId} to status: ${status}, paymentId: ${paymentId}, subscriptionId: ${subscriptionId}`
    );
    try {
      const updatedNotificationPrisma =
        await this.prisma.tefPayNotification.update({
          where: { id: notificationId },
          data: {
            status: status, // Use direct import
            payment_id: paymentId,
            subscription_id: subscriptionId,
            processing_notes: processingNotes,
            processed_at: new Date(),
          },
        });
      // Convert Prisma entity to DTO
      return {
        ...updatedNotificationPrisma,
        raw_notification: updatedNotificationPrisma.raw_notification as any,
        status: this.mapPrismaStatusToDtoStatus(
          updatedNotificationPrisma.status
        ),
      } as TefPayNotificationDto;
    } catch (error) {
      this.logger.error(
        `Error updating notification ${notificationId}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  async getNotificationById(
    notificationId: string
  ): Promise<TefPayNotificationDto | null> {
    const storedNotificationPrisma =
      await this.prisma.tefPayNotification.findUnique({
        where: { id: notificationId },
      });
    if (!storedNotificationPrisma) {
      return null;
    }
    return {
      ...storedNotificationPrisma,
      raw_notification: storedNotificationPrisma.raw_notification as any,
      status: this.mapPrismaStatusToDtoStatus(storedNotificationPrisma.status),
    } as TefPayNotificationDto;
  }
}
