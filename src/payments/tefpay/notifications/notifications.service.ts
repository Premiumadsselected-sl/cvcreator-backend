import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
import { PrismaService } from "../../../prisma/prisma.service";
import { PaymentsService } from "../../payments.service";
import { SubscriptionsService } from "../../../subscriptions/subscriptions.service";
import { TefPayNotificationStatus } from "./dto/notification.dto";
import { TefpayTransactionType } from "../common/tefpay.enums";
import { PaymentStatus } from "../../dto/payment.dto";
import { SubscriptionStatus } from "../../../subscriptions/dto/subscription.dto";
import { Prisma, Subscription, Payment } from "@prisma/client"; // Import Subscription type

@Injectable()
export class TefPayNotificationsService {
  private readonly logger = new Logger(TefPayNotificationsService.name);
  private readonly tefpayPrivateKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly paymentsService: PaymentsService,
    private readonly subscriptionsService: SubscriptionsService
  ) {
    const secret = this.configService.get<string>("TEFPAY_PRIVATE_KEY");
    if (!secret) {
      this.logger.error(
        "TEFPAY_PRIVATE_KEY no está configurada en el entorno."
      );
      throw new InternalServerErrorException(
        "Configuración de Tefpay incompleta."
      );
    }
    this.tefpayPrivateKey = secret;
  }

  private isSuccessfulResponseCode(code: string): boolean {
    if (!code) return false;
    if (code === "100") return true;
    const numericCode = parseInt(code, 10);
    if (!isNaN(numericCode) && numericCode >= 0 && numericCode <= 199)
      return true;
    if (code === "0900" || code === "900") return true;
    return false;
  }

  private verifySignature(notificationData: Record<string, any>): boolean {
    const {
      Ds_Amount,
      Ds_Merchant_MerchantCode,
      Ds_Currency,
      Ds_Code,
      Ds_Signature,
    } = notificationData;

    if (typeof Ds_Signature !== "string" || !Ds_Signature) {
      this.logger.warn(
        "No se recibió Ds_Signature o no es un string en la notificación."
      );
      return false;
    }

    const amount = String(Ds_Amount || "");
    const orderFieldForSignature = String(
      notificationData.Ds_Order ||
        notificationData.Ds_Merchant_MatchingData ||
        notificationData.Ds_Merchant_Subscription_Account ||
        ""
    );
    const merchantCode = String(Ds_Merchant_MerchantCode || "");
    const currency = String(Ds_Currency || "");
    const responseCode = String(Ds_Code || "");

    const stringToSign = `${amount}${orderFieldForSignature}${merchantCode}${currency}${responseCode}${this.tefpayPrivateKey}`;

    const calculatedSignature = createHash("sha1")
      .update(stringToSign)
      .digest("hex")
      .toLowerCase();

    this.logger.debug(`String para firmar (verifySignature): ${stringToSign}`);
    this.logger.debug(
      `Firma calculada (verifySignature): ${calculatedSignature}`
    );
    this.logger.debug(
      `Firma recibida (verifySignature): ${Ds_Signature.toLowerCase()}`
    );

    return calculatedSignature === Ds_Signature.toLowerCase();
  }

  async handleNotification(
    notificationPayload: Record<string, any>
  ): Promise<void> {
    this.logger.log(
      "Nueva notificación de Tefpay recibida",
      notificationPayload
    );

    let notificationRecord;
    try {
      notificationRecord = await this.prisma.tefPayNotification.create({
        data: {
          ds_Merchant_MatchingData: String(
            notificationPayload.Ds_Merchant_MatchingData ?? null
          ),
          ds_Order: String(
            notificationPayload.Ds_Order ??
              notificationPayload.Ds_Merchant_MatchingData ??
              notificationPayload.Ds_Merchant_Subscription_Account ??
              null
          ),
          ds_Code: String(notificationPayload.Ds_Code ?? null),
          ds_Merchant_TransactionType: String(
            notificationPayload.Ds_Merchant_TransactionType ?? null
          ),
          status: TefPayNotificationStatus.RECEIVED,
          raw_notification: notificationPayload as Prisma.JsonObject,
          processing_notes:
            "Notificación recibida, pendiente de procesamiento.",
          ds_Date: String(notificationPayload.Ds_Date ?? null),
          ds_Hour: String(notificationPayload.Ds_Hour ?? null),
          ds_SecurePayment: String(
            notificationPayload.Ds_SecurePayment ?? null
          ),
          ds_Card_Type: String(notificationPayload.Ds_Card_Type ?? null),
          ds_Card_Country: String(notificationPayload.Ds_Card_Country ?? null),
          ds_AuthorisationCode: String(
            notificationPayload.Ds_AuthorisationCode ?? null
          ),
          ds_Merchant_MerchantCode: String(
            notificationPayload.Ds_Merchant_MerchantCode ?? null
          ),
          ds_Merchant_Terminal: String(
            notificationPayload.Ds_Merchant_Terminal ?? null
          ),
          ds_Amount: String(notificationPayload.Ds_Amount ?? null),
          ds_Currency: String(notificationPayload.Ds_Currency ?? null),
          ds_Signature: String(notificationPayload.Ds_Signature ?? null),
          ds_Merchant_Subscription_Account: String(
            notificationPayload.Ds_Merchant_Subscription_Account ?? null
          ),
          ds_Merchant_Subscription_Action: String(
            notificationPayload.Ds_Merchant_Subscription_Action ?? null
          ),
        },
      });
      this.logger.log(`Notificación guardada con ID: ${notificationRecord.id}`);
    } catch (error) {
      this.logger.error("Error al guardar la notificación inicial en la BD", {
        message: error.message,
        stack: error.stack,
        payload: notificationPayload,
      });
      throw new InternalServerErrorException(
        "Error al registrar la notificación de Tefpay."
      );
    }

    const isSignatureValid = this.verifySignature(notificationPayload);

    if (!isSignatureValid) {
      this.logger.warn("Firma de notificación Tefpay inválida.", {
        order: String(
          notificationPayload.Ds_Order ||
            notificationPayload.Ds_Merchant_MatchingData ||
            notificationPayload.Ds_Merchant_Subscription_Account ||
            "Desconocido"
        ),
      });
      await this.prisma.tefPayNotification.update({
        where: { id: notificationRecord.id },
        data: {
          status: TefPayNotificationStatus.ERROR,
          processing_notes: "Error: Firma inválida.",
        },
      });
      return;
    }

    this.logger.log("Firma de notificación Tefpay verificada correctamente.");

    try {
      await this.prisma.$transaction(async (tx) => {
        const {
          Ds_Code,
          Ds_Merchant_TransactionType,
          Ds_Merchant_MatchingData,
          Ds_Order,
          Ds_Merchant_Subscription_Account,
          Ds_Merchant_Subscription_Action,
          Ds_Merchant_TransactionID,
        } = notificationPayload;

        const orderIdentifier = String(
          Ds_Order ||
            Ds_Merchant_MatchingData ||
            Ds_Merchant_Subscription_Account ||
            ""
        );

        if (!orderIdentifier) {
          this.logger.warn(
            "No se pudo determinar un identificador de pedido/suscripción (Ds_Order, Ds_Merchant_MatchingData, Ds_Merchant_Subscription_Account) en la notificación."
          );
          // Actualizar el registro de notificación fuera de la transacción si la transacción falla aquí.
          // No se puede usar 'tx' aquí si la transacción va a hacer rollback debido a este throw.
          // Esta actualización se moverá al bloque catch principal si es necesario.
          throw new Error("Identificador de pedido/suscripción faltante.");
        }

        const payment: Payment | null =
          await this.paymentsService.findByMatchingData(orderIdentifier, tx); // Pasar tx

        if (!payment && !Ds_Merchant_Subscription_Account) {
          this.logger.warn(
            `No se encontró el pago para el identificador: ${orderIdentifier} y no parece ser una notificación de gestión de suscripción pura (sin Ds_Merchant_Subscription_Account).`
          );
          throw new Error(
            `Pago no encontrado para identificador ${orderIdentifier} y no es acción de suscripción pura.`
          );
        }
        if (!payment && Ds_Merchant_Subscription_Account) {
          this.logger.log(
            `No se encontró pago para ${orderIdentifier}, pero existe Ds_Merchant_Subscription_Account. Se procederá si es una acción de suscripción válida.`
          );
        }

        let newPaymentStatus: PaymentStatus | null = payment
          ? (payment.status as PaymentStatus)
          : null;
        let newSubscriptionStatus: SubscriptionStatus | null = null;
        let subscriptionToUpdate: Subscription | null = null;

        if (payment && payment.subscription_id) {
          subscriptionToUpdate = await this.subscriptionsService.findOne(
            payment.subscription_id,
            tx // Pasar tx
          );
          if (subscriptionToUpdate) {
            newSubscriptionStatus =
              subscriptionToUpdate.status as SubscriptionStatus;
          }
        } else if (Ds_Merchant_Subscription_Account) {
          // Si no hay pago asociado directamente o el pago no tiene subscription_id,
          // intentar encontrar la suscripción usando Ds_Merchant_Subscription_Account
          subscriptionToUpdate =
            await this.subscriptionsService.findByPaymentId(
              Ds_Merchant_Subscription_Account, // Usar el ID de cuenta de suscripción de Tefpay
              tx // Pasar tx
            );
          if (subscriptionToUpdate) {
            newSubscriptionStatus =
              subscriptionToUpdate.status as SubscriptionStatus;
          }
        }

        const tefpayResponseCode = String(Ds_Code);
        const transactionType = String(
          Ds_Merchant_TransactionType
        ) as TefpayTransactionType;

        if (payment) {
          if (this.isSuccessfulResponseCode(tefpayResponseCode)) {
            newPaymentStatus = PaymentStatus.SUCCEEDED;
            if (payment.subscription_id) {
              if (
                transactionType === TefpayTransactionType.SUBSCRIPTION_SETUP ||
                transactionType === TefpayTransactionType.RECURRING_PAYMENT ||
                transactionType === ("6" as TefpayTransactionType)
              ) {
                newSubscriptionStatus = SubscriptionStatus.ACTIVE;
              }
            }
            if (
              transactionType === TefpayTransactionType.REFUND ||
              transactionType === TefpayTransactionType.REFUND_ONLINE ||
              transactionType === ("4" as TefpayTransactionType)
            ) {
              newPaymentStatus = PaymentStatus.REFUNDED;
            }
            if (
              (transactionType === ("208" as TefpayTransactionType) ||
                transactionType === ("33" as TefpayTransactionType)) &&
              payment.subscription_id
            ) {
              newSubscriptionStatus = SubscriptionStatus.ACTIVE;
            }
          } else {
            newPaymentStatus = PaymentStatus.FAILED;
            if (payment.subscription_id) {
              newSubscriptionStatus = SubscriptionStatus.PAST_DUE;
              if (
                tefpayResponseCode === "0208" ||
                tefpayResponseCode === "208"
              ) {
                newSubscriptionStatus = SubscriptionStatus.CANCELLED;
              }
              if (
                transactionType === TefpayTransactionType.SUBSCRIPTION_SETUP
              ) {
                newSubscriptionStatus = SubscriptionStatus.PENDING;
              }
            }
          }
        }

        const subscriptionAction = Ds_Merchant_Subscription_Action as string;
        const subscriptionAccountForAction = String(
          Ds_Merchant_Subscription_Account || orderIdentifier
        );

        if (subscriptionAction && subscriptionAccountForAction) {
          this.logger.log(
            `Procesando Ds_Merchant_Subscription_Action: ${subscriptionAction} para cuenta: ${subscriptionAccountForAction}`
          );

          let tempSubscriptionToUpdate: Subscription | null = null;
          if (payment && payment.subscription_id) {
            tempSubscriptionToUpdate = await this.subscriptionsService.findOne(
              payment.subscription_id,
              tx // Pasar tx
            );
          } else if (subscriptionAccountForAction) {
            // Usar findByPaymentId (que debería poder buscar por ID de cuenta de suscripción si se implementa correctamente)
            // o directamente por ID de suscripción si subscriptionAccountForAction es nuestro ID de suscripción.
            tempSubscriptionToUpdate =
              await this.subscriptionsService.findByPaymentId(
                subscriptionAccountForAction,
                tx // Pasar tx
              );
          }

          if (!tempSubscriptionToUpdate) {
            this.logger.warn(
              `No se encontró suscripción para SubscriptionAction ${subscriptionAction} en cuenta ${subscriptionAccountForAction}`
            );
            // No lanzar error aquí, solo registrar y continuar, ya que podría ser una notificación informativa
            // o el estado del pago podría ser más importante.
            await tx.tefPayNotification.update({
              where: { id: notificationRecord.id },
              data: {
                processing_notes:
                  (notificationRecord.processing_notes || "") +
                  ` Advertencia: Suscripción no encontrada para SubscriptionAction ${subscriptionAction} en cuenta ${subscriptionAccountForAction}.`,
              },
            });
          } else {
            // Asignar a la variable principal si se encuentra
            subscriptionToUpdate = tempSubscriptionToUpdate;
            if (this.isSuccessfulResponseCode(tefpayResponseCode)) {
              let statusFromAction: SubscriptionStatus | null = null;
              if (subscriptionAction === "S") {
                statusFromAction = SubscriptionStatus.CANCELLED;
              } else if (subscriptionAction === "O") {
                statusFromAction = SubscriptionStatus.ACTIVE;
              }
              if (statusFromAction) {
                newSubscriptionStatus = statusFromAction;
                this.logger.log(
                  `Estado de suscripción ${subscriptionToUpdate.id} determinado por SubscriptionAction ${subscriptionAction} a: ${newSubscriptionStatus}`
                );
              }
            }
          }
        }

        if (
          payment &&
          newPaymentStatus &&
          payment.status !== (newPaymentStatus as string) // Comparar como strings para evitar problemas de tipo enum
        ) {
          await this.paymentsService.updateStatus(
            payment.id,
            newPaymentStatus,
            notificationPayload as Prisma.JsonObject,
            tx
          );
          this.logger.log(
            `Pago ${payment.id} actualizado a estado ${newPaymentStatus}`
          );
        }

        const finalSubscriptionIdToUpdate =
          subscriptionToUpdate?.id || // Si ya obtuvimos la suscripción, usar su ID
          payment?.subscription_id || // Fallback al ID de suscripción del pago
          (Ds_Merchant_Subscription_Account && // Último intento si es una notificación de suscripción
            (
              await this.subscriptionsService.findByPaymentId(
                Ds_Merchant_Subscription_Account,
                tx
              )
            )?.id);

        if (finalSubscriptionIdToUpdate && newSubscriptionStatus) {
          const currentSubscription = await this.subscriptionsService.findOne(
            finalSubscriptionIdToUpdate,
            tx // Pasar tx
          );
          if (
            currentSubscription &&
            currentSubscription.status !== (newSubscriptionStatus as string) // Comparar como strings
          ) {
            const subscriptionUpdatePayload: Prisma.SubscriptionUpdateInput = {
              status: newSubscriptionStatus,
            };
            if (Ds_Merchant_TransactionID) {
              subscriptionUpdatePayload.tefpay_transaction_id = String(
                Ds_Merchant_TransactionID
              );
            }
            if (
              currentSubscription.metadata &&
              typeof currentSubscription.metadata === "object"
            ) {
              subscriptionUpdatePayload.metadata =
                currentSubscription.metadata as Prisma.JsonObject;
            }

            await this.subscriptionsService.updateStatus(
              finalSubscriptionIdToUpdate, // Usar el ID de la suscripción encontrada o inferida
              newSubscriptionStatus,
              subscriptionUpdatePayload,
              tx
            );
            this.logger.log(
              `Suscripción ${finalSubscriptionIdToUpdate} actualizada a estado ${newSubscriptionStatus}`
            );
          }
        }

        await tx.tefPayNotification.update({
          where: { id: notificationRecord.id },
          data: {
            payment_id: payment?.id,
            subscription_id: finalSubscriptionIdToUpdate, // Usar el ID de la suscripción final
            status: TefPayNotificationStatus.PROCESSED,
            processing_notes:
              `Procesado. Pago: ${newPaymentStatus || "N/A"}. Suscripción: ${newSubscriptionStatus || "N/A"}`.trim(),
          },
        });
      });
    } catch (error) {
      this.logger.error(
        "Error procesando la lógica de negocio de la notificación o transacción fallida",
        {
          message: error.message,
          stack: error.stack,
          order: String(
            notificationPayload.Ds_Order ||
              notificationPayload.Ds_Merchant_MatchingData ||
              notificationPayload.Ds_Merchant_Subscription_Account ||
              "Desconocido"
          ),
        }
      );
      if (notificationRecord) {
        await this.prisma.tefPayNotification.update({
          where: { id: notificationRecord.id },
          data: {
            status: TefPayNotificationStatus.ERROR,
            processing_notes: `Error durante el procesamiento: ${error instanceof Error ? error.message : String(error)}`,
          },
        });
      }
    }
  }
}
