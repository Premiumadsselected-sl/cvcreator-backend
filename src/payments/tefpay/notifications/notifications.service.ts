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
      // Campos del DTO - deben coincidir con la definición de TefPayNotificationDto
      ds_Order: incomingPayload.Ds_Order,
      Ds_Amount: incomingPayload.Ds_Amount,
      Ds_Merchant_MatchingData: incomingPayload.Ds_Merchant_MatchingData,
      Ds_AuthorisationCode: incomingPayload.Ds_AuthorisationCode,
      Ds_Bank: incomingPayload.Ds_Bank,
      Ds_Merchant_TransactionType: incomingPayload.Ds_Merchant_TransactionType,
      Ds_Message: incomingPayload.Ds_Message,
      Ds_Code: incomingPayload.Ds_Code,
      Ds_PanMask: incomingPayload.Ds_PanMask,
      Ds_Expiry: incomingPayload.Ds_Expiry,
      Ds_Date: incomingPayload.Ds_Date,
      // Ds_Hour, Ds_SecurePayment, Ds_Card_Type, Ds_Card_Country NO están en el DTO, se guardarán en raw_notification y directamente en Prisma
      Ds_Merchant_MerchantCode: incomingPayload.Ds_Merchant_MerchantCode,
      Ds_Merchant_Guarantees: incomingPayload.Ds_Merchant_Guarantees,
      Ds_Signature: incomingPayload.Ds_Signature,
      Ds_Merchant_TransactionID: incomingPayload.Ds_Merchant_TransactionID,
      Ds_Merchant_Subscription_Account:
        incomingPayload.Ds_Merchant_Subscription_Account,
      Ds_Merchant_Subscription_Action:
        incomingPayload.Ds_Merchant_Subscription_Action,
      Ds_Merchant_Terminal: incomingPayload.Ds_Merchant_Terminal,
      Ds_Currency: incomingPayload.Ds_Currency,
      Ds_CostumerCreditCardCountry:
        incomingPayload.Ds_CostumerCreditCardCountry,
      Ds_CostumerCreditCardBrand: incomingPayload.Ds_CostumerCreditCardBrand,
      Ds_CostumerCreditCardType: incomingPayload.Ds_CostumerCreditCardType,
      Ds_CostumerCreditCardExpiryDate:
        incomingPayload.Ds_CostumerCreditCardExpiryDate,
      Ds_CostumerCreditCardId: incomingPayload.Ds_CostumerCreditCardId,
      Ds_CostumerCreditCardBin: incomingPayload.Ds_CostumerCreditCardBin,
      Ds_Merchant_UserName: incomingPayload.Ds_Merchant_UserName,
      ds_TransactionDate: incomingPayload.Ds_TransactionDate,
      ds_ClientRef: incomingPayload.Ds_ClientRef,
      ds_CodeBank: incomingPayload.Ds_CodeBank,
      ds_Merchant_Url: incomingPayload.Ds_Merchant_Url,
      raw_notification: incomingPayload as any,
      status: DtoTefPayNotificationStatus.RECEIVED,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const storedNotificationPrisma =
        await this.prisma.tefPayNotification.create({
          data: {
            id: notificationId,
            // Campos de Prisma - asegurar que coinciden con el esquema y el payload
            // Todos los campos Ds_* del payload deben mapearse a los campos ds_* en Prisma
            ds_Order: incomingPayload.Ds_Order,
            ds_Code: incomingPayload.Ds_Code,
            ds_Message: incomingPayload.Ds_Message,
            ds_Merchant_MatchingData: incomingPayload.Ds_Merchant_MatchingData,
            ds_Date: incomingPayload.Ds_Date,
            ds_Hour: incomingPayload.Ds_Hour,
            ds_SecurePayment:
              incomingPayload.Ds_SecurePayment || incomingPayload.Ds_Secure, // Fallback para Ds_Secure si Ds_SecurePayment no está
            ds_Card_Type: incomingPayload.Ds_Card_Type,
            ds_Card_Country: incomingPayload.Ds_Card_Country,
            ds_AuthorisationCode: incomingPayload.Ds_AuthorisationCode,
            ds_Merchant_TransactionType:
              incomingPayload.Ds_Merchant_TransactionType,
            ds_Merchant_MerchantCode: incomingPayload.Ds_Merchant_MerchantCode,
            ds_Merchant_Terminal: incomingPayload.Ds_Merchant_Terminal,
            ds_Amount: incomingPayload.Ds_Amount,
            ds_Currency: incomingPayload.Ds_Currency,
            ds_Signature: incomingPayload.Ds_Signature,
            ds_Merchant_Subscription_Account:
              incomingPayload.Ds_Merchant_Subscription_Account,
            ds_Merchant_Subscription_Action:
              incomingPayload.Ds_Merchant_Subscription_Action,
            ds_Merchant_Url: incomingPayload.Ds_Merchant_Url,
            ds_CodeBank: incomingPayload.Ds_CodeBank,
            ds_TransactionDate: incomingPayload.Ds_TransactionDate,
            ds_ClientRef: incomingPayload.Ds_ClientRef,
            // CORREGIDO: Mapear Ds_TransactionId del payload a ds_Merchant_TransactionID en Prisma
            ds_Merchant_TransactionID: incomingPayload.Ds_TransactionId,
            ds_PanMask: incomingPayload.Ds_PanMask,
            ds_Expiry: incomingPayload.Ds_Expiry,
            ds_Bank: incomingPayload.Ds_Bank,
            ds_Merchant_Guarantees: incomingPayload.Ds_Merchant_Guarantees,
            ds_CostumerCreditCardCountry:
              incomingPayload.Ds_CostumerCreditCardCountry,
            // CORREGIDO: Mapear Ds_Card_Brand del payload a ds_CostumerCreditCardBrand en Prisma
            ds_CostumerCreditCardBrand:
              incomingPayload.Ds_CostumerCreditCardBrand ||
              incomingPayload.Ds_Card_Brand,
            ds_CostumerCreditCardType:
              incomingPayload.Ds_CostumerCreditCardType,
            ds_CostumerCreditCardExpiryDate:
              incomingPayload.Ds_CostumerCreditCardExpiryDate,
            ds_CostumerCreditCardId: incomingPayload.Ds_CostumerCreditCardId,
            ds_CostumerCreditCardBin: incomingPayload.Ds_CostumerCreditCardBin,
            ds_Merchant_UserName: incomingPayload.Ds_Merchant_UserName,
            raw_notification: incomingPayload as any,
            status: TefPayNotificationStatus.RECEIVED,
            createdAt: now,
            updatedAt: now,
          } as any,
        });
      this.logger.log(
        `[TefpayNotificationsService] Stored Tefpay notification ID: ${storedNotificationPrisma.id} for order: ${orderIdentifier}`
      );

      // Emit a specific event for Tefpay notifications that are stored (and ideally verified)
      // PaymentsService or other relevant services will listen to this.
      this.eventEmitter.emit("tefpay.notification.processed_by_handler", {
        notification: storedNotificationPrisma, // El objeto Prisma de la notificación almacenada
        parsedData: incomingPayload, // El payload original analizado
      });

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
