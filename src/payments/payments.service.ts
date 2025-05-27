import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "src/prisma/prisma.service";
import { UsersService } from "src/users/users.service";
import { SubscriptionsService } from "src/subscriptions/subscriptions.service";
import { AuditLogsService } from "src/audit-logs/audit-logs.service";
import {
  SubscriptionStatus as PrismaSubscriptionStatus,
  Prisma,
  TefPayNotification as PrismaTefPayNotification,
  Payment,
  Subscription,
  TefPayNotificationStatus,
} from "@prisma/client";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";
import { TefpayNotificationsService } from "./tefpay/notifications/notifications.service";
import { PlansService } from "src/payments/plans/plans.service";
import { PaymentProcessorRegistryService } from "./payment-processor-registry.service";
import { TefpayService } from "./tefpay/tefpay.service"; // Necesario para el tipado del procesador

// Placeholder for PaymentStatus enum if not from Prisma
enum PaymentStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

// Placeholder for AuditAction enum if not from Prisma
enum AuditAction {
  PAYMENT_INITIATED = "PAYMENT_INITIATED",
  PAYMENT_NOTIFICATION_RECEIVED = "PAYMENT_NOTIFICATION_RECEIVED",
}

// Define TefpayWebhookEvent and related interfaces directly in this file
interface TefpayWebhookEventDataObject {
  id?: string; // Transaction ID or relevant ID from Tefpay
  subscription?: string | null; // Tefpay's subscription account identifier
  plan?: { id?: string | null; [key: string]: any }; // Plan details
  status?: string | null; // Status from Tefpay (e.g., subscription action)
  amount_paid?: number | null;
  currency?: string | null;
  amount_due?: number | null;
  [key: string]: any; // Allow other properties
}

interface TefpayWebhookEventData {
  object: TefpayWebhookEventDataObject;
  // Potentially other fields from Tefpay's event structure
  [key: string]: any;
}

interface TefpayWebhookEvent {
  id: string; // Our internal notification ID
  type: string; // e.g., 'customer.subscription.created', 'invoice.payment_succeeded'
  data: TefpayWebhookEventData;
  // Potentially other top-level fields
  [key: string]: any;
}

// Define InitiatePaymentResponseDto
interface InitiatePaymentResponseDto {
  payment_id: string;
  redirect_url: string;
  tefpay_form_inputs: Record<string, string | number | boolean>;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly registryService: PaymentProcessorRegistryService, // Añadido
    private readonly tefPayNotificationsService: TefpayNotificationsService,
    private readonly plansService: PlansService
  ) {}

  // Helper to calculate next billing date
  private calculateNextBillingDate(
    currentDate: Date,
    interval: "month" | "year"
  ): Date {
    const nextDate = new Date(currentDate);
    if (interval === "month") {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (interval === "year") {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }
    return nextDate;
  }

  private getMetadataValue(
    metadata: Prisma.JsonValue | undefined | null,
    key: string
  ): any {
    if (
      metadata &&
      typeof metadata === "object" &&
      !Array.isArray(metadata) &&
      metadata !== null &&
      key in metadata
    ) {
      return metadata[key];
    }
    return undefined;
  }

  private formatMetadataField(value: any): Prisma.InputJsonValue {
    if (value === undefined || value === null) {
      // Return null, Prisma will handle conversion to JsonNull
      return null as unknown as Prisma.InputJsonValue; // FORCED TYPE
    }
    if (typeof value === "object" && value !== null) {
      const sanitizedObject: Prisma.JsonObject = {};
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          const formattedValue = this.formatMetadataField(value[key]);
          sanitizedObject[key] = formattedValue as Prisma.JsonValue; // FORCED TYPE
        }
      }
      return sanitizedObject;
    }
    return value as Prisma.InputJsonValue;
  }

  async initiatePayment(
    initiatePaymentDto: InitiatePaymentDto, // DTO should have plan_id, return_url. subscription_id is optional.
    userId: string
  ): Promise<InitiatePaymentResponseDto> {
    const tefpayService = this.registryService.getProcessor(
      "tefpay"
    ) as TefpayService; // CORREGIDO
    if (!tefpayService) {
      this.logger.error(
        "Tefpay payment processor not available or not enabled."
      );
      throw new InternalServerErrorException("Servicio de pago no disponible.");
    }

    const { plan_id, return_url: dto_return_url } = initiatePaymentDto;
    const subscription_id = (initiatePaymentDto as any).subscription_id;

    // VERIFICACIÓN: Usuario ya tiene un pago PENDING?
    const existingPendingPayment = await this.prisma.payment.findFirst({
      where: {
        user_id: userId,
        status: "PENDING", // Usar string literal
      },
    });

    if (existingPendingPayment) {
      this.logger.warn(
        `User ${userId} already has a pending payment ${existingPendingPayment.id}. New payment blocked.`
      );
      throw new ConflictException(
        "Ya tiene un pago pendiente. Por favor, espere a que se complete o cancele."
      );
    }

    // VERIFICACIÓN: Usuario ya tiene una suscripción ACTIVA?
    const activeSubscription =
      await this.subscriptionsService.findActiveSubscriptionByUserId(userId);

    if (activeSubscription) {
      this.logger.warn(
        `User ${userId} already has an active subscription ${activeSubscription.id}. New payment for a new subscription blocked.`
      );
      throw new ConflictException("Ya tiene una suscripción activa.");
    }

    const plan = await this.prisma.plan.findUnique({ where: { id: plan_id } });
    if (!plan) {
      this.logger.error(`Plan with ID ${plan_id} not found.`);
      throw new NotFoundException("Plan no encontrado.");
    }

    const user = await this.usersService.findOne(userId);
    if (!user) {
      this.logger.error(
        `User with ID ${userId} not found during payment initiation.`
      );
      throw new NotFoundException("Usuario no encontrado.");
    }

    const defaultSuccessRedirectUrl = this.configService.get<string>(
      "TEFPAY_DEFAULT_SUCCESS_URL"
    );
    const defaultCancelRedirectUrl = this.configService.get<string>(
      "TEFPAY_DEFAULT_CANCEL_URL"
    );

    if (!defaultSuccessRedirectUrl) {
      this.logger.error("TEFPAY_DEFAULT_SUCCESS_URL is not configured.");
      throw new InternalServerErrorException(
        "Default success redirect URL is not configured."
      );
    }
    if (!defaultCancelRedirectUrl) {
      this.logger.error("TEFPAY_DEFAULT_CANCEL_URL is not configured.");
      throw new InternalServerErrorException(
        "Default cancel redirect URL is not configured."
      );
    }

    const finalReturnUrl = dto_return_url || defaultSuccessRedirectUrl;
    const finalCancelUrl = dto_return_url || defaultCancelRedirectUrl;

    // Generate an internal reference for this payment attempt.
    // This will be stored in our database for our own tracking.
    // TefpayService will generate its own Ds_Merchant_MatchingData.
    const internalOrderReference = `CVO-${user.id.substring(0, 4)}-${plan.id.substring(0, 4)}-${Date.now()}`;
    const paymentId = `PAY-${Date.now()}`; // This is our internal Payment record ID.

    // Obtener el locale del usuario o un valor por defecto
    const userLocale = user.locale || "es";

    // Call TefpayService to prepare parameters.
    // TefpayService will generate Ds_Merchant_MatchingData internally.
    // We pass our internalOrderReference as 'order' for TefpayService's internal logging/use if needed,
    // but it's NOT directly sent as Ds_Merchant_Order to Tefpay.
    const tefpayParams = tefpayService.preparePaymentParameters({
      // Modificado para usar la instancia del registro
      amount: plan.price,
      currency: plan.currency,
      order: internalOrderReference, // This is our internal reference, NOT Ds_Merchant_Order
      locale: userLocale,
      product_description: plan.name,
      success_url: finalReturnUrl,
      cancel_url: finalCancelUrl,
      notification_url: this.configService.get<string>("TEFPAY_NOTIFY_URL")!,
      metadata: {
        // Metadata for TefpayService, not directly for Tefpay payment form
        payment_id_internal: paymentId, // Our internal payment ID
        subscription_id: subscription_id || undefined,
      },
    });

    // Extract the Ds_Merchant_MatchingData generated by TefpayService.
    // This is crucial for S2S notification reconciliation.
    const tefpayGeneratedMatchingData =
      tefpayParams.fields.Ds_Merchant_MatchingData;

    if (!tefpayGeneratedMatchingData) {
      this.logger.error(
        `TefpayService did not return Ds_Merchant_MatchingData for internal order ${internalOrderReference}. Payment initiation failed.`
      );
      throw new InternalServerErrorException(
        "Error al preparar los datos de pago con el proveedor."
      );
    }

    const payment = await this.prisma.payment.create({
      data: {
        id: paymentId, // Our internal payment ID
        user_id: userId,
        subscription_id: subscription_id || null,
        amount: plan.price,
        currency: plan.currency,
        status: PaymentStatus.PENDING,
        processor: "tefpay",
        // Store Tefpay's Ds_Merchant_MatchingData here for S2S lookup
        matching_data: tefpayGeneratedMatchingData,
        // processor_payment_id is set to null initially, will be updated with Ds_Merchant_TransactionID from S2S notification
        processor_payment_id: null,
        metadata: this.formatMetadataField({
          plan_id: plan.id,
          plan_name: plan.name,
          user_email: user.email,
          return_url: finalReturnUrl,
          internal_order_reference: internalOrderReference, // Store our internal reference
          // Do NOT store the full tefpayParams.fields here to avoid large objects in metadata.
          // Store only what's necessary for your system's logic post-payment.
        }),
      },
    });

    this.logger.log(
      `Payment record created: ${payment.id} (Internal Ref: ${internalOrderReference}, Tefpay MatchingData: ${tefpayGeneratedMatchingData}) for plan ${plan_id} by user ${userId}`
    );

    await this.auditLogsService.create({
      user_id: userId,
      action: AuditAction.PAYMENT_INITIATED,
      target_type: "Payment",
      target_id: payment.id,
      details: JSON.stringify(
        this.formatMetadataField({
          plan_id: plan_id,
          amount: plan.price,
          internal_order_ref: internalOrderReference,
          tefpay_matching_data: tefpayGeneratedMatchingData, // Log the actual matching data used
          // Ds_Merchant_Order from tefpayParams.fields is what TefpayService used for signature,
          // which might be different from our internalOrderReference if TefpayService modifies it.
          // However, based on current TefpayService, Ds_Merchant_Order is NOT sent.
          // We log what TefpayService *would* have used if it was part of the signature base.
          // For now, let's assume tefpayParams.fields.Ds_Merchant_Order is not relevant here
          // as it's not sent to Tefpay.
        })
      ),
    });

    return {
      payment_id: payment.id,
      redirect_url: tefpayParams.url,
      tefpay_form_inputs: tefpayParams.fields,
    };
  }

  @OnEvent("tefpay.notification.processed_by_handler") // CORREGIDO: Nombre del evento
  async handleTefpayNotificationEvent(payload: {
    notification: PrismaTefPayNotification;
    parsedData: any;
  }) {
    const { notification, parsedData } = payload;
    this.logger.log(
      `Processing Tefpay notification event for notification ID: ${notification.id}`
    );

    const tefpayService = this.registryService.getProcessor(
      "tefpay"
    ) as TefpayService; // CORREGIDO
    if (!tefpayService) {
      this.logger.error(
        "Tefpay payment processor not available during notification handling."
      );
      // No lanzar excepción aquí directamente, ya que es un manejador de eventos.
      // Considerar una estrategia de reintento o alerta si es crítico.
      return;
    }

    const storedNotificationId = notification.id;

    if (!parsedData.Ds_Signature) {
      this.logger.warn(
        `Tefpay S2S notification signature is MISSING. Order: ${parsedData.Ds_Merchant_MatchingData}. Cannot validate.`
      );
      await this.tefPayNotificationsService.updateNotificationProcessingStatus(
        storedNotificationId,
        TefPayNotificationStatus.SIGNATURE_MISSING,
        notification.payment_id || undefined,
        notification.subscription_id || undefined,
        "S2S Signature missing in notification."
      );
      return;
    }

    const isSignatureValid = tefpayService.verifySignature(parsedData); // Modificado para usar la instancia del registro

    if (!isSignatureValid) {
      this.logger.warn(
        `Tefpay S2S notification signature validation FAILED. Order: ${parsedData.Ds_Merchant_MatchingData}.`
      );
      await this.tefPayNotificationsService.updateNotificationProcessingStatus(
        storedNotificationId,
        TefPayNotificationStatus.SIGNATURE_FAILED,
        notification.payment_id || undefined,
        notification.subscription_id || undefined,
        "Signature validation failed."
      );
      return;
    }

    this.logger.log(
      `Tefpay S2S notification signature VERIFIED. Order: ${parsedData.Ds_Merchant_MatchingData || parsedData.Ds_Merchant_Subscription_Account}.` // Log either, as one should be present
    );

    let paymentRecord: Payment | null = null;
    const primaryMatchingData = parsedData.Ds_Merchant_MatchingData as
      | string
      | undefined;
    const secondaryMatchingData =
      parsedData.Ds_Merchant_Subscription_Account as string | undefined;
    let lookupValue: string | undefined;
    let lookupSourceDescription: string = "";

    if (primaryMatchingData) {
      lookupValue = primaryMatchingData;
      lookupSourceDescription = `Ds_Merchant_MatchingData: "${primaryMatchingData}"`;
    } else if (secondaryMatchingData) {
      lookupValue = secondaryMatchingData;
      lookupSourceDescription = `Ds_Merchant_Subscription_Account: "${secondaryMatchingData}" (used as fallback)`;
      this.logger.log(
        `Ds_Merchant_MatchingData not present in S2S notification, attempting lookup with Ds_Merchant_Subscription_Account: "${secondaryMatchingData}"`
      );
    }

    if (lookupValue) {
      paymentRecord = await this.prisma.payment.findUnique({
        where: { matching_data: lookupValue },
      });
    }

    if (!paymentRecord) {
      this.logger.error(
        `Payment record not found for Tefpay S2S notification. Attempted lookup using ${lookupSourceDescription}. Raw payload fields: Ds_Merchant_MatchingData='${primaryMatchingData}', Ds_Merchant_Subscription_Account='${secondaryMatchingData}'. StoredNotificationID: ${storedNotificationId}`
      );
      await this.tefPayNotificationsService.updateNotificationProcessingStatus(
        storedNotificationId,
        TefPayNotificationStatus.ERROR,
        notification.payment_id || undefined,
        notification.subscription_id || undefined,
        `Payment record not found. Attempted with ${lookupSourceDescription}.`
      );
      return;
    }

    this.logger.log(
      `Payment record ${paymentRecord.id} found using ${lookupSourceDescription}.`
    );

    // Associate payment_id with the notification if it wasn't (e.g., if found via a different key than initially assumed
    if (notification.payment_id !== paymentRecord.id) {
      await this.prisma.tefPayNotification.update({
        where: { id: storedNotificationId },
        data: { payment_id: paymentRecord.id },
      });
    }

    const userIdForAudit: string = paymentRecord.user_id;
    const tefpaySubscriptionAccount =
      parsedData.Ds_Merchant_Subscription_Account;
    const tefpayTransactionId = parsedData.Ds_Merchant_TransactionID;

    const initialAuditDetails: any = {
      merchant_params_from_payload: parsedData,
      payment_record_id: paymentRecord.id,
      stored_notification_id: storedNotificationId,
    };

    const auditEntry = await this.auditLogsService.create({
      user_id: userIdForAudit,
      action: AuditAction.PAYMENT_NOTIFICATION_RECEIVED,
      target_type: "Notification",
      target_id:
        tefpayTransactionId || paymentRecord.id || storedNotificationId,
      details: JSON.stringify(this.formatMetadataField(initialAuditDetails)),
    });

    try {
      const paymentRecordForProcessing: {
        id: string;
        user_id: string;
        metadata?: Prisma.JsonValue;
        status?: string;
        subscription_id?: string | null;
      } = {
        id: paymentRecord.id,
        user_id: paymentRecord.user_id,
        metadata: paymentRecord.metadata,
        status: paymentRecord.status,
        subscription_id: paymentRecord.subscription_id,
      };

      if (tefpaySubscriptionAccount) {
        this.logger.log(
          `Routing to subscription lifecycle event processing for account: ${tefpaySubscriptionAccount}, Payment: ${paymentRecord.id}`
        );
        const simulatedEvent: TefpayWebhookEvent = {
          id: storedNotificationId,
          type: this.mapTefpayNotificationToEventType(parsedData),
          data: {
            object: {
              subscription: tefpaySubscriptionAccount,
              id: parsedData.Ds_Merchant_MatchingData,
              ...(parseInt(parsedData.Ds_Code || "999", 10) < 100 && {
                amount_paid: parsedData.Ds_Amount
                  ? parseInt(parsedData.Ds_Amount, 10)
                  : undefined,
                currency: parsedData.Ds_Currency,
              }),
              ...(parseInt(parsedData.Ds_Code || "0", 10) >= 100 && {
                amount_due: parsedData.Ds_Amount
                  ? parseInt(parsedData.Ds_Amount, 10)
                  : undefined,
              }),
              plan: {
                id:
                  this.getMetadataValue(paymentRecord.metadata, "plan_id") ||
                  undefined,
              },
              status: parsedData.Ds_Merchant_Subscription_Action,
            } as TefpayWebhookEvent["data"]["object"],
          },
        };
        await this.processSubscriptionLifecycleEvent(
          simulatedEvent,
          storedNotificationId,
          auditEntry.id,
          initialAuditDetails,
          paymentRecordForProcessing
        );
      } else {
        this.logger.log(
          `Processing as initial payment/subscription notification for payment: ${paymentRecord.id}`
        );
        const createdSubscriptionId = await this.processInitialPaymentEvent(
          parsedData,
          paymentRecord,
          auditEntry.id,
          initialAuditDetails,
          storedNotificationId
        );
        if (createdSubscriptionId) {
          paymentRecord.subscription_id = createdSubscriptionId;
        }
      }
      const finalNotificationState =
        await this.prisma.tefPayNotification.findUnique({
          where: { id: storedNotificationId },
        });
      if (
        finalNotificationState &&
        !(
          [
            TefPayNotificationStatus.ERROR,
            TefPayNotificationStatus.SIGNATURE_FAILED,
            TefPayNotificationStatus.SIGNATURE_MISSING,
            TefPayNotificationStatus.PROCESSED_UNHANDLED,
          ] as TefPayNotificationStatus[]
        ).includes(finalNotificationState.status)
      ) {
        await this.tefPayNotificationsService.updateNotificationProcessingStatus(
          storedNotificationId,
          TefPayNotificationStatus.PROCESSED,
          paymentRecord.id,
          paymentRecord.subscription_id || undefined,
          "Notification processed successfully."
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error processing Tefpay notification event for payment ${paymentRecord.id} (StoredNotification: ${storedNotificationId}): ${errorMessage}`
      );
      await this.auditLogsService.update(auditEntry.id, {
        details: JSON.stringify(
          this.formatMetadataField({
            ...initialAuditDetails,
            error: `Processing error: ${errorMessage}`,
          })
        ),
      });
      await this.tefPayNotificationsService.updateNotificationProcessingStatus(
        storedNotificationId,
        TefPayNotificationStatus.ERROR,
        paymentRecord.id,
        paymentRecord.subscription_id || undefined,
        `Error during processing: ${errorMessage}`
      );
    }
  }

  private mapTefpayNotificationToEventType(
    rawPayload: Record<string, any>
  ): string {
    const action = rawPayload.Ds_Merchant_Subscription_Action;
    const responseCode = parseInt(rawPayload.Ds_Code || "-1", 10); // Usar -1 para que no coincida con éxito por defecto
    const transactionType = rawPayload.Ds_Merchant_TransactionType;
    // const subscriptionAccount = rawPayload.Ds_Merchant_Subscription_Account; // No se usa directamente aquí, pero es relevante para el contexto

    // Condición de éxito de Tefpay (basado en logs: Ds_Code: "100" es aprobación)
    // Otros códigos de éxito podrían ser < 100 según la documentación completa de Tefpay.
    // Por ahora, nos basamos en el log observado donde Ds_Code: "100" es "Transacción aprobada".
    const isSuccess = responseCode === 100;

    // Caso 1: Notificación de creación/confirmación de suscripción (usualmente Ds_Merchant_TransactionType: "A" o similar)
    // Si es un tipo de transacción de autorización/alta, es exitosa, y no hay una acción de ciclo de vida específica (R,C,M).
    // Esto cubre tanto el pago inicial que crea la suscripción como la notificación subsecuente
    // que podría confirmar el ID de la cuenta de suscripción de Tefpay.
    if (transactionType === "A" && isSuccess && !action) {
      // El evento 'customer.subscription.created' debería ser manejado de forma idempotente:
      // - Si la suscripción no existe, la crea.
      // - Si ya existe (creada por una notificación previa sin Ds_Merchant_Subscription_Account),
      //   la actualiza, especialmente para asegurar que el processor_subscription_id (Ds_Merchant_Subscription_Account)
      //   esté registrado y el estado sea activo.
      return "customer.subscription.created";
    }

    // Caso 2: Acciones explícitas del ciclo de vida de la suscripción (Ds_Merchant_Subscription_Action presente)
    if (action === "R") {
      // Renewal
      return isSuccess
        ? "invoice.payment_succeeded" // Renovación exitosa
        : "invoice.payment_failed"; // Renovación fallida
    }
    if (action === "C") {
      // Cancellation by user/system via Tefpay
      // Para cancelaciones, el Ds_Code podría no ser 100 (éxito), pero la acción 'C' es lo importante.
      return "customer.subscription.deleted";
    }
    if (action === "M" && isSuccess) {
      // Modification (e.g., plan change, reactivation) confirmed by Tefpay
      return "customer.subscription.updated";
    }

    // Fallback para combinaciones no reconocidas
    this.logger.warn(
      `Could not map Tefpay notification to a known webhook event type: ${JSON.stringify(
        rawPayload
      )}`
    );
    return "unknown.tefpay.event";
  }

  private async processInitialPaymentEvent(
    merchantParams: Record<string, any>,
    paymentRecord: Payment,
    auditEntryId: string,
    initialAuditDetails: any,
    storedNotificationId: string
  ): Promise<string | undefined> {
    return this.prisma.$transaction(async (tx) => {
      let createdSubscriptionId: string | undefined = undefined;
      const tefpayResultCode = merchantParams.Ds_Code as string;
      const planId = this.getMetadataValue(paymentRecord.metadata, "plan_id");
      const userId = paymentRecord.user_id;

      if (!planId) {
        this.logger.error(
          `Plan ID not found in metadata for payment ${paymentRecord.id}. Cannot process initial payment event.`
        );
        await this.auditLogsService.update(
          auditEntryId,
          {
            // action_status: "ERROR", // REMOVED
            details: {
              ...initialAuditDetails,
              status: "ERROR", // ADDED status to details
              error: "Plan ID not found in metadata",
              notification_id: storedNotificationId,
            },
          },
          tx
        );
        return;
      }
      const plan = await tx.plan.findUnique({ where: { id: planId } });
      if (!plan) {
        this.logger.error(
          `Plan with ID ${planId} not found. Cannot process initial payment event for payment ${paymentRecord.id}.`
        );
        await this.auditLogsService.update(
          auditEntryId,
          {
            // action_status: "ERROR", // REMOVED
            details: {
              ...initialAuditDetails,
              status: "ERROR", // ADDED status to details
              error: `Plan with ID ${planId} not found`,
              notification_id: storedNotificationId,
            },
          },
          tx
        );
        return;
      }

      const numericResultCode = parseInt(tefpayResultCode, 10);

      if (
        !isNaN(numericResultCode) &&
        numericResultCode >= 0 &&
        numericResultCode <= 199
      ) {
        await tx.payment.update({
          where: { id: paymentRecord.id },
          data: {
            status: PaymentStatus.COMPLETED,
            processor_response: merchantParams as Prisma.InputJsonValue,
            processor_payment_id:
              merchantParams.Ds_TransactionId ||
              paymentRecord.processor_payment_id,
          },
        });

        if (plan.billing_interval && plan.billing_interval !== "once") {
          const existingSubscription = paymentRecord.subscription_id
            ? await tx.subscription.findUnique({
                where: { id: paymentRecord.subscription_id },
              })
            : null;

          if (existingSubscription) {
            createdSubscriptionId = existingSubscription.id;
            this.logger.warn(
              `User ${userId} already has subscription ${existingSubscription.id}. Payment ${paymentRecord.id} successful, linked to existing subscription.`
            );
            await this.auditLogsService.update(
              auditEntryId,
              {
                // action_status: "SUCCESS", // REMOVED
                details: {
                  ...initialAuditDetails,
                  status: "SUCCESS", // ADDED status to details
                  message:
                    "Payment successful. Linked to existing subscription.",
                  subscription_id: existingSubscription.id,
                  notification_id: storedNotificationId,
                },
              },
              tx
            );
          } else {
            try {
              const newSubscription =
                await this.subscriptionsService.createFromPayment(
                  {
                    user_id: userId,
                    plan_id: plan.id,
                    payment_id: paymentRecord.id,
                    processor_subscription_id:
                      merchantParams.Ds_Merchant_Subscription_Account,
                    status: PrismaSubscriptionStatus.ACTIVE,
                    current_period_start: new Date(),
                    current_period_end: this.calculateNextBillingDate(
                      new Date(),
                      plan.billing_interval as "month" | "year"
                    ),
                  },
                  tx
                );
              createdSubscriptionId = newSubscription.id;

              await tx.payment.update({
                where: { id: paymentRecord.id },
                data: { subscription_id: newSubscription.id },
              });

              this.logger.log(
                `New subscription ${newSubscription.id} created for user ${userId} from payment ${paymentRecord.id}.`
              );
              await this.auditLogsService.update(
                auditEntryId,
                {
                  // action_status: "SUCCESS", // REMOVED
                  details: {
                    ...initialAuditDetails,
                    status: "SUCCESS", // ADDED status to details
                    message: "Payment successful. New subscription created.",
                    subscription_id: newSubscription.id,
                    notification_id: storedNotificationId,
                  },
                },
                tx
              );
            } catch (error) {
              this.logger.error(
                `Error creating subscription for user ${userId} after payment ${paymentRecord.id}: ${error.message}`,
                error.stack
              );
              await this.auditLogsService.update(
                auditEntryId,
                {
                  // action_status: "ERROR", // REMOVED
                  details: {
                    ...initialAuditDetails,
                    status: "ERROR", // ADDED status to details
                    error: "Failed to create subscription after payment.",
                    original_error: error.message,
                    notification_id: storedNotificationId,
                  },
                },
                tx
              );
            }
          }
        } else {
          this.logger.log(
            `Payment ${paymentRecord.id} successful for a 'once' plan. No subscription created.`
          );
          await this.auditLogsService.update(
            auditEntryId,
            {
              // action_status: "SUCCESS", // REMOVED
              details: {
                ...initialAuditDetails,
                status: "SUCCESS", // ADDED status to details
                message:
                  "Payment successful for a 'once' plan. No subscription created.",
                notification_id: storedNotificationId,
              },
            },
            tx
          );
        }
      } else {
        this.logger.error(
          `Payment ${paymentRecord.id} failed or was rejected by Tefpay. Result code: ${tefpayResultCode}`
        );
        await tx.payment.update({
          where: { id: paymentRecord.id },
          data: {
            status: PaymentStatus.FAILED,
            processor_response: merchantParams as Prisma.InputJsonValue,
          },
        });
        await this.auditLogsService.update(
          auditEntryId,
          {
            // action_status: "ERROR", // REMOVED
            details: {
              ...initialAuditDetails,
              status: "ERROR", // ADDED status to details
              error: "Payment failed or rejected by processor.",
              processor_response: merchantParams,
              notification_id: storedNotificationId,
            },
          },
          tx
        );
      }
      return createdSubscriptionId;
    });
  }

  private async processSubscriptionLifecycleEvent(
    tefpayEvent: TefpayWebhookEvent,
    storedNotificationId: string,
    auditEntryId: string,
    initialAuditDetails: any,
    paymentRecord: {
      id: string;
      user_id: string;
      metadata?: Prisma.JsonValue;
      status?: string;
      subscription_id?: string | null;
    }
  ): Promise<void> {
    const userId = paymentRecord.user_id;
    // tefpaySubscriptionAccount might be null if the event is not directly from a subscription action (e.g. initial payment that creates one)
    const tefpaySubscriptionAccount =
      tefpayEvent.data.object.subscription || null;
    const rawPayload = initialAuditDetails.merchant_params_from_payload;

    this.logger.log(
      `Processing subscription lifecycle event: ${tefpayEvent.type} for Tefpay account ${tefpaySubscriptionAccount}, original payment ${paymentRecord.id}, StoredNotificationId: ${storedNotificationId}`
    );

    let subscription: Subscription | null = null;
    if (tefpaySubscriptionAccount) {
      // Assuming findByProcessorAccountId exists and is correct
      subscription =
        await this.subscriptionsService.findByProcessorSubscriptionId(
          tefpaySubscriptionAccount
        );
    }

    if (!subscription && paymentRecord.subscription_id) {
      subscription = await this.prisma.subscription.findUnique({
        where: { id: paymentRecord.subscription_id },
      });
    }

    if (!subscription && tefpayEvent.type !== "customer.subscription.created") {
      this.logger.error(
        `Subscription not found for Tefpay account ${tefpaySubscriptionAccount} (Payment: ${paymentRecord.id}). Event: ${tefpayEvent.type}.`
      );
      await this.auditLogsService.update(auditEntryId, {
        details: JSON.stringify(
          this.formatMetadataField({
            ...initialAuditDetails,
            status: "ProcessingError",
            error: `Subscription not found for event ${tefpayEvent.type}`,
          })
        ),
      });
      await this.tefPayNotificationsService.updateNotificationProcessingStatus(
        storedNotificationId,
        TefPayNotificationStatus.PROCESSED_UNHANDLED,
        paymentRecord.id,
        paymentRecord.subscription_id || undefined,
        `Subscription not found for event ${tefpayEvent.type}`
      );
      return;
    }

    const planId =
      subscription?.plan_id ||
      this.getMetadataValue(paymentRecord.metadata, "plan_id");
    if (!planId) {
      this.logger.error(
        `Plan ID not found for subscription ${subscription?.id} or payment ${paymentRecord.id}. Event: ${tefpayEvent.type}`
      );
      await this.auditLogsService.update(auditEntryId, {
        details: JSON.stringify(
          this.formatMetadataField({
            ...initialAuditDetails,
            status: "ProcessingError",
            error: "Plan ID missing for subscription event.",
          })
        ),
      });
      await this.tefPayNotificationsService.updateNotificationProcessingStatus(
        storedNotificationId,
        TefPayNotificationStatus.PROCESSED_UNHANDLED,
        paymentRecord.id,
        subscription?.id || paymentRecord.subscription_id || undefined,
        "Plan ID missing for subscription event."
      );
      return;
    }

    const plan = await this.plansService.findOne(planId);
    if (!plan) {
      this.logger.error(
        `Plan ${planId} not found for subscription ${subscription?.id} or payment ${paymentRecord.id}. Event: ${tefpayEvent.type}`
      );
      await this.auditLogsService.update(auditEntryId, {
        details: JSON.stringify(
          this.formatMetadataField({
            ...initialAuditDetails,
            status: "ProcessingError",
            error: `Plan ${planId} not found.`,
          })
        ),
      });
      await this.tefPayNotificationsService.updateNotificationProcessingStatus(
        storedNotificationId,
        TefPayNotificationStatus.PROCESSED_UNHANDLED,
        paymentRecord.id,
        subscription?.id || paymentRecord.subscription_id || undefined,
        `Plan ${planId} not found.`
      );
      return;
    }

    switch (tefpayEvent.type) {
      case "customer.subscription.created": {
        if (subscription) {
          this.logger.warn(
            `Subscription ${subscription.id} already exists. Processing event ${tefpayEvent.type} to ensure data consistency.`
          );

          const updateData: Prisma.SubscriptionUpdateInput = {
            status: PrismaSubscriptionStatus.ACTIVE, // Ensure status is active
            metadata: this.formatMetadataField({
              ...(subscription.metadata as Prisma.JsonObject),
              last_tefpay_event: tefpayEvent.type,
              last_tefpay_event_id: tefpayEvent.id,
            }),
          };

          // Ensure processor_subscription_id is updated if it's available in the event
          // tefpaySubscriptionAccount is derived from tefpayEvent.data.object.subscription
          if (
            tefpaySubscriptionAccount &&
            subscription.processor_subscription_id !== tefpaySubscriptionAccount
          ) {
            updateData.processor_subscription_id = tefpaySubscriptionAccount;
            this.logger.log(
              `Updating processor_subscription_id for subscription ${subscription.id} to ${tefpaySubscriptionAccount} based on event ${tefpayEvent.type}.`
            );
          }

          await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: updateData,
          });
        } else {
          this.logger.log(
            `Creating new subscription from event ${tefpayEvent.type} for user ${userId}, Tefpay account ${tefpaySubscriptionAccount}`
          );
          const newSubscription =
            await this.subscriptionsService.createFromPayment({
              user_id: userId,
              plan_id: planId,
              status: PrismaSubscriptionStatus.ACTIVE,
              current_period_start: new Date(),
              current_period_end: this.calculateNextBillingDate(
                new Date(),
                plan.billing_interval as "month" | "year"
              ),
              processor_subscription_id: tefpaySubscriptionAccount,
              processor_transaction_id:
                rawPayload.Ds_Merchant_TransactionID || null,
              payment_processor_name: "tefpay",
              payment_id: paymentRecord.id,
              metadata: this.formatMetadataField({
                source: "tefpay_subscription_created_event",
                original_payment_metadata: paymentRecord.metadata,
                tefpay_event_id: tefpayEvent.id,
              }) as Prisma.JsonObject,
            });
          await this.prisma.tefPayNotification.update({
            where: { id: storedNotificationId },
            data: { subscription_id: newSubscription.id },
          });
          this.logger.log(
            `New subscription ${newSubscription.id} created via ${tefpayEvent.type}.`
          );
        }
        await this.auditLogsService.update(auditEntryId, {
          details: JSON.stringify(
            this.formatMetadataField({
              ...initialAuditDetails,
              status: "ProcessedSubscriptionCreated",
              subscription_id: subscription?.id,
              tefpay_event_type: tefpayEvent.type,
            })
          ),
        });
        break;
      }
      case "invoice.payment_succeeded": {
        if (!subscription) {
          this.logger.error(
            `Subscription not found for invoice.payment_succeeded. Tefpay account: ${tefpaySubscriptionAccount}`
          );
          await this.tefPayNotificationsService.updateNotificationProcessingStatus(
            storedNotificationId,
            TefPayNotificationStatus.ERROR,
            paymentRecord.id,
            undefined,
            `Subscription not found for successful payment event.`
          );
          await this.auditLogsService.update(auditEntryId, {
            details: JSON.stringify(
              this.formatMetadataField({
                ...initialAuditDetails,
                status: "ProcessingError",
                error: "Subscription not found for invoice.payment_succeeded.",
                tefpay_event_type: tefpayEvent.type,
              })
            ),
          });
          return;
        }

        const renewalPaymentAmount = tefpayEvent.data.object.amount_paid
          ? tefpayEvent.data.object.amount_paid / 100 // Assuming amount_paid is in cents
          : plan.price; // Fallback to plan price

        // Create a new payment record for this renewal
        const renewalPayment = await this.prisma.payment.create({
          data: {
            user_id: userId,
            subscription_id: subscription.id,
            amount: renewalPaymentAmount,
            currency:
              tefpayEvent.data.object.currency?.toUpperCase() || plan.currency,
            status: PaymentStatus.COMPLETED, // Local enum
            processor: "tefpay",
            processor_payment_id:
              rawPayload.Ds_Merchant_TransactionID || // Priorizar TransactionID
              rawPayload.Ds_Merchant_MatchingData ||
              rawPayload.Ds_Order ||
              `renewal-${subscription.id}-${Date.now()}`,
            processor_response: rawPayload as Prisma.InputJsonValue,
            paid_at: new Date(),
            metadata: this.formatMetadataField({
              source: "tefpay_renewal_event",
              tefpay_event_id: tefpayEvent.id,
              renewal_for_subscription_id: subscription.id,
            }),
          },
        });
        this.logger.log(
          `Renewal payment ${renewalPayment.id} created for subscription ${subscription.id}.`
        );

        // Update subscription period
        const newPeriodEnd = this.calculateNextBillingDate(
          subscription.current_period_end || new Date(), // Fallback to now if current_period_end is null
          plan.billing_interval as "month" | "year"
        );
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: PrismaSubscriptionStatus.ACTIVE,
            current_period_start: subscription.current_period_end || new Date(),
            current_period_end: newPeriodEnd,
            // Reset cancellation flags if any
            cancel_at_period_end: false,
            requested_cancellation_at: null,
            cancel_at: null,
            metadata: this.formatMetadataField({
              ...(subscription.metadata as Prisma.JsonObject),
              last_tefpay_event: tefpayEvent.type,
              last_tefpay_event_id: tefpayEvent.id,
              last_renewal_payment_id: renewalPayment.id,
            }),
          },
        });
        await this.auditLogsService.update(auditEntryId, {
          details: JSON.stringify(
            this.formatMetadataField({
              ...initialAuditDetails,
              status: "ProcessedInvoicePaymentSucceeded",
              subscription_id: subscription.id,
              renewal_payment_id: renewalPayment.id,
              new_period_end: newPeriodEnd,
              tefpay_event_type: tefpayEvent.type,
            })
          ),
        });
        break;
      }
      case "invoice.payment_failed": {
        if (!subscription) {
          this.logger.error(
            `Subscription not found for invoice.payment_failed. Tefpay account: ${tefpaySubscriptionAccount}`
          );
          await this.tefPayNotificationsService.updateNotificationProcessingStatus(
            storedNotificationId,
            TefPayNotificationStatus.ERROR,
            paymentRecord.id,
            undefined,
            `Subscription not found for failed payment event.`
          );
          await this.auditLogsService.update(auditEntryId, {
            details: JSON.stringify(
              this.formatMetadataField({
                ...initialAuditDetails,
                status: "ProcessingError",
                error: "Subscription not found for invoice.payment_failed.",
                tefpay_event_type: tefpayEvent.type,
              })
            ),
          });
          return;
        }

        // Create a failed payment attempt record
        const failedPaymentAmount = tefpayEvent.data.object.amount_due
          ? tefpayEvent.data.object.amount_due / 100
          : plan.price;

        const failedPayment = await this.prisma.payment.create({
          data: {
            user_id: userId,
            subscription_id: subscription.id,
            amount: failedPaymentAmount,
            currency:
              tefpayEvent.data.object.currency?.toUpperCase() || plan.currency,
            status: PaymentStatus.FAILED, // Local enum
            processor: "tefpay",
            processor_payment_id:
              rawPayload.Ds_Merchant_TransactionID || // Priorizar TransactionID
              rawPayload.Ds_Merchant_MatchingData ||
              rawPayload.Ds_Order ||
              `failed-renewal-${subscription.id}-${Date.now()}`,
            processor_response: rawPayload as Prisma.InputJsonValue,
            error_message: `Payment failed due to Tefpay event: ${tefpayEvent.type}. Code: ${rawPayload.Ds_Code}, Message: ${rawPayload.Ds_Message}`,
            metadata: this.formatMetadataField({
              source: "tefpay_renewal_failed_event",
              tefpay_event_id: tefpayEvent.id,
              failed_renewal_for_subscription_id: subscription.id,
            }),
          },
        });
        this.logger.warn(
          `Failed payment ${failedPayment.id} recorded for subscription ${subscription.id}.`
        );

        // Update subscription status to past_due or handle dunning
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: PrismaSubscriptionStatus.PAST_DUE, // Or another status based on dunning logic
            metadata: this.formatMetadataField({
              ...(subscription.metadata as Prisma.JsonObject),
              last_tefpay_event: tefpayEvent.type,
              last_tefpay_event_id: tefpayEvent.id,
              last_failed_payment_id: failedPayment.id,
              dunning_attempt:
                ((subscription.metadata as any)?.dunning_attempt || 0) + 1,
            }),
          },
        });
        this.logger.warn(
          `Subscription ${subscription.id} status updated to PAST_DUE due to failed payment.`
        );
        await this.auditLogsService.update(auditEntryId, {
          details: JSON.stringify(
            this.formatMetadataField({
              ...initialAuditDetails,
              status: "ProcessedRenewalFailure",
              subscription_id: subscription.id,
              failed_payment_id: failedPayment.id,
              tefpay_event_type: tefpayEvent.type,
            })
          ),
        });
        await this.prisma.tefPayNotification.update({
          where: { id: storedNotificationId },
          data: {
            payment_id: failedPayment.id,
            subscription_id: subscription.id,
          },
        });
        // TODO: Implement dunning logic (e.g., send email to user)
        break;
      }
      case "customer.subscription.deleted": {
        if (!subscription) {
          this.logger.warn(
            `Subscription not found for customer.subscription.deleted event. Tefpay account: ${tefpaySubscriptionAccount}. Might have been already deleted.`
          );
          await this.auditLogsService.update(auditEntryId, {
            details: JSON.stringify(
              this.formatMetadataField({
                ...initialAuditDetails,
                status: "ProcessedSubscriptionDeletedNotFound",
                tefpay_event_type: tefpayEvent.type,
              })
            ),
          });
          // Mark notification as PROCESSED_UNHANDLED if no subscription to update
          await this.tefPayNotificationsService.updateNotificationProcessingStatus(
            storedNotificationId,
            TefPayNotificationStatus.PROCESSED_UNHANDLED,
            paymentRecord.id,
            undefined,
            "Subscription not found for deletion event, posiblemente ya eliminada."
          );
          return;
        }

        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: PrismaSubscriptionStatus.CANCELLED,
            ended_at: new Date(), // Mark when it effectively ended
            canceled_at: subscription.canceled_at || new Date(), // If not already set by user request
            metadata: this.formatMetadataField({
              ...(subscription.metadata as Prisma.JsonObject),
              last_tefpay_event: tefpayEvent.type,
              last_tefpay_event_id: tefpayEvent.id,
              cancellation_source: "tefpay_event",
            }),
          },
        });
        this.logger.log(
          `Subscription ${subscription.id} cancelled due to Tefpay event ${tefpayEvent.type}.`
        );
        await this.auditLogsService.update(auditEntryId, {
          details: JSON.stringify(
            this.formatMetadataField({
              ...initialAuditDetails,
              status: "ProcessedSubscriptionDeleted",
              subscription_id: subscription.id,
              tefpay_event_type: tefpayEvent.type,
            })
          ),
        });
        await this.prisma.tefPayNotification.update({
          where: { id: storedNotificationId },
          data: { subscription_id: subscription.id },
        });
        break;
      }
      case "customer.subscription.updated": {
        if (!subscription) {
          this.logger.error(
            `Subscription not found for customer.subscription.updated. Tefpay account: ${tefpaySubscriptionAccount}`
          );
          await this.tefPayNotificationsService.updateNotificationProcessingStatus(
            storedNotificationId,
            TefPayNotificationStatus.ERROR,
            paymentRecord.id,
            undefined,
            `Subscription not found for update event.`
          );
          await this.auditLogsService.update(auditEntryId, {
            details: JSON.stringify(
              this.formatMetadataField({
                ...initialAuditDetails,
                status: "ProcessingError",
                error:
                  "Subscription not found for customer.subscription.updated.",
                tefpay_event_type: tefpayEvent.type,
              })
            ),
          });
          return;
        }
        // This is a generic update. We might need more specific info from rawPayload
        // to determine what changed (e.g. plan, quantity, status from pending_cancellation to active).
        // For now, assume it might reactivate or confirm active status.
        const updatedSubscriptionData: Prisma.SubscriptionUpdateInput = {
          status: PrismaSubscriptionStatus.ACTIVE, // Default to active on update, adjust if more info
          metadata: this.formatMetadataField({
            ...(subscription.metadata as Prisma.JsonObject),
            last_tefpay_event: tefpayEvent.type,
            last_tefpay_event_id: tefpayEvent.id,
            update_details_from_tefpay:
              rawPayload.Ds_Message || "Updated by Tefpay",
          }),
        };

        // If the event contains new plan details, update them (this part is speculative)
        const newPlanIdFromEvent = tefpayEvent.data.object.plan?.id;
        if (newPlanIdFromEvent && newPlanIdFromEvent !== subscription.plan_id) {
          const newPlan = await this.plansService.findOne(newPlanIdFromEvent);
          if (newPlan) {
            updatedSubscriptionData.plan = { connect: { id: newPlan.id } }; // Corrected: Prisma relation update
            // Potentially adjust current_period_end if plan change implies new billing cycle
            updatedSubscriptionData.current_period_end =
              this.calculateNextBillingDate(
                new Date(), // Assume change is effective now
                newPlan.billing_interval as "month" | "year"
              );
            updatedSubscriptionData.current_period_start = new Date();
            this.logger.log(
              `Subscription ${subscription.id} plan changed to ${newPlan.id}.`
            );
          } else {
            this.logger.warn(
              `New plan ID ${newPlanIdFromEvent} from Tefpay event not found.`
            );
          }
        }

        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: updatedSubscriptionData,
        });
        this.logger.log(
          `Subscription ${subscription.id} updated by Tefpay event ${tefpayEvent.type}.`
        );
        await this.auditLogsService.update(auditEntryId, {
          details: JSON.stringify(
            this.formatMetadataField({
              ...initialAuditDetails,
              status: "ProcessedSubscriptionUpdated",
              subscription_id: subscription.id,
              tefpay_event_type: tefpayEvent.type,
              update_details: rawPayload.Ds_Message,
            })
          ),
        });
        await this.prisma.tefPayNotification.update({
          where: { id: storedNotificationId },
          data: { subscription_id: subscription.id },
        });
        break;
      }
      default: {
        this.logger.warn(
          `Unhandled Tefpay webhook event type: ${tefpayEvent.type} for subscription ${subscription?.id}, Tefpay Account: ${tefpaySubscriptionAccount}`
        );
        await this.auditLogsService.update(auditEntryId, {
          details: JSON.stringify(
            this.formatMetadataField({
              ...initialAuditDetails,
              status: "UnhandledEventType",
              tefpay_event_type: tefpayEvent.type,
            })
          ),
        });
        await this.tefPayNotificationsService.updateNotificationProcessingStatus(
          storedNotificationId,
          TefPayNotificationStatus.PROCESSED_UNHANDLED,
          paymentRecord.id,
          subscription?.id || paymentRecord.subscription_id || undefined,
          `Unhandled Tefpay event type: ${tefpayEvent.type}`
        );
      }
    }
  }
}
