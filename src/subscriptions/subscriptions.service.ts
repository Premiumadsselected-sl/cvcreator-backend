import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";
import {
  Subscription,
  Prisma,
  SubscriptionStatus as PrismaSubscriptionStatus,
} from "@prisma/client";
import {
  SubscriptionDto,
  SubscriptionStatus as DtoSubscriptionStatus,
} from "./dto/subscription.dto";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { AuditAction } from "../audit-logs/dto/audit-action.enum";
import { PaymentProcessorRegistryService } from "../payments/payment-processor-registry.service";
import { SubscriptionCancellationResponse } from "../payments/processors/payment-processor.interface"; // AÑADIDO para tipar cancellationResponse

// ADDED: Define a type for the createFromPayment method arguments
interface CreateSubscriptionFromPaymentParams {
  user_id: string;
  plan_id: string;
  status: PrismaSubscriptionStatus;
  processor_transaction_id?: string | null; // MODIFIED
  processor_subscription_id?: string | null; // MODIFIED
  payment_processor_name?: string | null; // ADDED
  payment_id: string;
  trial_start?: Date | null;
  trial_end?: Date | null;
  current_period_start: Date;
  current_period_end?: Date | null;
  metadata?: Prisma.InputJsonObject;
  tx?: Prisma.TransactionClient;
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly registryService: PaymentProcessorRegistryService
  ) {}

  async create(
    createSubscriptionDto: CreateSubscriptionDto,
    tx?: Prisma.TransactionClient // Existing optional transaction client
  ): Promise<Subscription> {
    const prismaClient = tx || this.prisma;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user_id, plan_id, payment_id, ...restInput } =
      createSubscriptionDto;
    const data: Prisma.SubscriptionCreateInput = {
      ...restInput,
      user: { connect: { id: user_id } },
      plan: { connect: { id: plan_id } },
      status: PrismaSubscriptionStatus.PENDING,
    };
    const subscription = await prismaClient.subscription.create({ data });

    await this.auditLogsService.create(
      {
        user_id,
        action: AuditAction.SUBSCRIPTION_CREATED,
        target_type: "Subscription",
        target_id: subscription.id,
        details: JSON.stringify({ createSubscriptionDto }),
      },
      prismaClient // Pass the prismaClient (which could be tx) to audit service
    );

    return subscription;
  }

  async createFromPayment(
    params: CreateSubscriptionFromPaymentParams,
    // The 'tx' from params is for internal use if this method itself starts a transaction.
    // The 'transactionClient' is passed from an external transaction (e.g., PaymentsService).
    transactionClient?: Prisma.TransactionClient
  ): Promise<Subscription> {
    // Prioritize externally passed transactionClient, then params.tx, then default prisma instance.
    const prismaClient = transactionClient || params.tx || this.prisma;
    const {
      user_id,
      plan_id,
      status,
      processor_transaction_id, // MODIFIED
      processor_subscription_id, // MODIFIED
      payment_processor_name, // ADDED
      payment_id,
      trial_start,
      trial_end,
      current_period_start,
      current_period_end,
      metadata,
    } = params;

    const data: Prisma.SubscriptionCreateInput = {
      user: { connect: { id: user_id } },
      plan: { connect: { id: plan_id } },
      status: status,
      processor_subscription_id: processor_subscription_id, // MODIFIED
      payment_processor_name: payment_processor_name, // ADDED
      trial_start,
      trial_end,
      current_period_start,
      current_period_end,
      metadata: metadata || {
        source: "payment_creation",
        payment_id: payment_id,
        ...(processor_transaction_id && {
          original_payment_processor_transaction_id: processor_transaction_id, // MODIFIED
        }),
      },
    };

    const subscription = await prismaClient.subscription.create({ data });

    await this.auditLogsService.create(
      {
        user_id,
        action: AuditAction.SUBSCRIPTION_CREATED,
        target_type: "Subscription",
        target_id: subscription.id,
        details: JSON.stringify({
          plan_id,
          status,
          payment_id,
          processor_transaction_id,
          processor_subscription_id,
          payment_processor_name,
          source: "createFromPayment",
        }),
      },
      prismaClient // Pass the prismaClient to audit service
    );

    return subscription;
  }

  async findByProcessorSubscriptionId(
    processorSubscriptionId: string,
    tx?: Prisma.TransactionClient, // Existing optional transaction client
    include?: Prisma.SubscriptionInclude
  ): Promise<(Subscription & { plan?: any }) | null> {
    const prismaClient = tx || this.prisma;
    return prismaClient.subscription.findUnique({
      where: { processor_subscription_id: processorSubscriptionId }, // MODIFIED
      include: include,
    });
  }

  async findActiveSubscriptionByUserId(
    userId: string,
    tx?: Prisma.TransactionClient // Existing optional transaction client
  ): Promise<Subscription | null> {
    const prismaClient = tx || this.prisma;
    return prismaClient.subscription.findFirst({
      where: {
        user_id: userId,
        status: {
          in: [
            PrismaSubscriptionStatus.ACTIVE,
            PrismaSubscriptionStatus.TRIALING,
          ],
        },
      },
      // orderBy: { created_at: "desc" } // Eliminado orderBy para evitar el error
    });
  }

  // ... (otros métodos existentes: findAll, findOne, update, remove, updateStatus, etc.)
  async findAll(include?: Prisma.SubscriptionInclude): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({ include });
  }

  async findOne(
    id: string,
    tx?: Prisma.TransactionClient, // Existing optional transaction client
    include?: Prisma.SubscriptionInclude
  ): Promise<(Subscription & { plan?: any }) | null> {
    // Tipo de retorno ajustado
    const prismaClient = tx || this.prisma;
    const subscription = await prismaClient.subscription.findUnique({
      where: { id },
      include: include, // Usar el parámetro include
    });
    return subscription;
  }

  async update(
    id: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
    tx?: Prisma.TransactionClient // Existing optional transaction client
  ): Promise<Subscription> {
    const prismaClient = tx || this.prisma;
    const { metadata, status, ...rest } = updateSubscriptionDto;
    const data: Prisma.SubscriptionUpdateInput = {
      ...rest,
      // MODIFICADO: Mapear DtoSubscriptionStatus a PrismaSubscriptionStatus si es necesario, o asegurar que el DTO use PrismaSubscriptionStatus
      status: status
        ? (status as unknown as PrismaSubscriptionStatus)
        : undefined,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
    };

    const updatedSubscription = await prismaClient.subscription.update({
      where: { id },
      data,
    });

    // Crear log de auditoría
    if (updatedSubscription.user_id) {
      await this.auditLogsService.create(
        {
          user_id: updatedSubscription.user_id,
          action: AuditAction.SUBSCRIPTION_UPDATED,
          target_type: "Subscription",
          target_id: updatedSubscription.id,
          details: JSON.stringify({ updateSubscriptionDto }),
        },
        prismaClient // Pass the prismaClient to audit service
      );
    }

    return updatedSubscription;
  }

  async remove(
    id: string,
    userId?: string,
    tx?: Prisma.TransactionClient
  ): Promise<Subscription> {
    // Added tx parameter
    const prismaClient = tx || this.prisma;
    const subscription = await prismaClient.subscription.delete({
      where: { id },
    });

    if (userId || subscription.user_id) {
      await this.auditLogsService.create(
        {
          user_id: userId || subscription.user_id,
          action: AuditAction.SUBSCRIPTION_CANCELLED,
          target_type: "Subscription",
          target_id: subscription.id,
          details: JSON.stringify({ id }),
        },
        prismaClient // Pass the prismaClient to audit service
      );
    }

    return subscription;
  }

  async updateStatus(
    subscriptionId: string,
    status: PrismaSubscriptionStatus,
    updateData?: Partial<Prisma.SubscriptionUncheckedUpdateInput>,
    tx?: Prisma.TransactionClient, // Existing optional transaction client
    userId?: string
  ): Promise<Subscription | null> {
    const prismaClient = tx || this.prisma;
    const dataToUpdate: Prisma.SubscriptionUpdateInput = {
      status: status, // MODIFICADO: 'status' ya es de tipo PrismaSubscriptionStatus
    };

    if (updateData) {
      Object.keys(updateData).forEach((key) => {
        if (key !== "id") {
          (dataToUpdate as any)[key] = (updateData as any)[key];
        }
      });
    }

    if (status === PrismaSubscriptionStatus.ACTIVE) {
      // MODIFICADO
      if (
        dataToUpdate.current_period_start === undefined &&
        !(updateData && updateData.current_period_start)
      ) {
        dataToUpdate.current_period_start = new Date();
      }
    } else if (status === PrismaSubscriptionStatus.CANCELLED) {
      // MODIFICADO
      if (
        dataToUpdate.canceled_at === undefined &&
        !(updateData && updateData.canceled_at)
      ) {
        dataToUpdate.canceled_at = new Date();
      }
      if (
        dataToUpdate.ended_at === undefined &&
        !(updateData && updateData.ended_at) &&
        !(updateData && updateData.cancel_at_period_end) &&
        !dataToUpdate.cancel_at_period_end
      ) {
        dataToUpdate.ended_at = new Date();
      }
    } else if (status === PrismaSubscriptionStatus.INACTIVE) {
      // MODIFICADO
      if (
        dataToUpdate.ended_at === undefined &&
        !(updateData && updateData.ended_at)
      ) {
        dataToUpdate.ended_at = new Date();
      }
    }

    const updatedSubscription = await prismaClient.subscription.update({
      where: { id: subscriptionId },
      data: dataToUpdate,
    });

    // Crear log de auditoría
    if (updatedSubscription && (userId || updatedSubscription.user_id)) {
      await this.auditLogsService.create(
        {
          user_id: userId || updatedSubscription.user_id,
          action: AuditAction.SUBSCRIPTION_STATUS_CHANGED,
          target_type: "Subscription",
          target_id: updatedSubscription.id,
          details: JSON.stringify({ status, updateData }),
        },
        prismaClient // Pass the prismaClient to audit service
      );
    }

    return updatedSubscription;
  }

  async findByPaymentId(
    orderIdentifier: string,
    tx?: Prisma.TransactionClient // Existing optional transaction client
  ): Promise<Subscription | null> {
    const prismaClient = tx || this.prisma;
    // Intenta buscar por ID de suscripción directamente
    const subscription = await prismaClient.subscription.findUnique({
      where: { id: orderIdentifier },
    });
    if (subscription) return subscription;

    // Si no se encuentra por ID y `orderIdentifier` realmente pretendía ser un `payment_id`,
    // se necesitaría un campo `payment_id` en el modelo Subscription para buscar por él.
    // Por ahora, asumimos que `orderIdentifier` es el `subscription.id`.
    // Si la lógica es buscar una suscripción asociada a un `payment_id`,
    // el modelo Subscription debería tener una relación o campo `payment_id`.
    // Y la búsqueda sería: `where: { payment_id: orderIdentifier }` (si payment_id es único en Subscription)
    // o `findFirst` si no es único.

    // console.warn(
    //   `[findByPaymentId] No se pudo encontrar la suscripción para orderIdentifier: ${orderIdentifier}.`
    // );
    return null;
  }

  async validateSubscription(
    params: {
      user_id: string;
    },
    tx?: Prisma.TransactionClient // Existing optional transaction client
  ): Promise<Subscription | null> {
    const prismaClient = tx || this.prisma;
    const { user_id } = params;
    // Asumiendo que user_id es único para suscripciones activas o relevantes.
    // Si un usuario puede tener múltiples suscripciones, esto debería ser findFirst o findMany.
    const subscription = await prismaClient.subscription.findUnique({
      where: {
        user_id: user_id,
      },
    });
    return subscription;
  }

  async isSubscriptionActive(
    userId: string,
    tx?: Prisma.TransactionClient // Existing optional transaction client
  ): Promise<boolean> {
    const prismaClient = tx || this.prisma;
    // Asume que un usuario tiene como máximo una suscripción activa a la vez o que user_id es único.
    const subscription = await prismaClient.subscription.findUnique({
      where: {
        user_id: userId,
      },
    });

    if (!subscription) {
      return false;
    }

    const isActiveStatus =
      subscription.status === PrismaSubscriptionStatus.ACTIVE || // MODIFICADO
      subscription.status === PrismaSubscriptionStatus.TRIALING; // MODIFICADO

    const isWithinPeriod =
      !subscription.current_period_end ||
      new Date(subscription.current_period_end) > new Date();

    return isActiveStatus && isWithinPeriod;
  }

  async findActiveByUserId(
    userId: string,
    tx?: Prisma.TransactionClient // Existing optional transaction client
  ): Promise<Subscription | null> {
    const prismaClient = tx || this.prisma;
    return prismaClient.subscription.findFirst({
      where: {
        user_id: userId,
        status: {
          // MODIFICADO: Usar PrismaSubscriptionStatus directamente
          in: [
            PrismaSubscriptionStatus.ACTIVE,
            PrismaSubscriptionStatus.TRIALING,
          ],
        },
        OR: [
          { current_period_end: null },
          { current_period_end: { gt: new Date() } },
        ],
      },
    });
  }

  // Este es el método que el controlador usará para obtener todas las suscripciones de un usuario.
  async findAllByUserId(
    userId: string,
    tx?: Prisma.TransactionClient // Existing optional transaction client
  ): Promise<SubscriptionDto[]> {
    const prismaClient = tx || this.prisma;
    const subscriptions = await prismaClient.subscription.findMany({
      where: { user_id: userId },
      // include: { plan: true } // Opcional: incluir datos del plan si son necesarios en el DTO
    });
    return subscriptions.map((sub) => ({
      id: sub.id,
      user_id: sub.user_id,
      plan_id: sub.plan_id,
      status: sub.status as DtoSubscriptionStatus, // Castear a DtoSubscriptionStatus para el DTO
      // Manejo de campos de fecha que pueden ser null en Prisma y Date | undefined en DTO
      trial_start: sub.trial_start ?? undefined,
      trial_end: sub.trial_end ?? undefined,
      current_period_start: sub.current_period_start ?? undefined,
      current_period_end: sub.current_period_end ?? undefined,
      cancel_at_period_end: sub.cancel_at_period_end ?? undefined,
      canceled_at: sub.canceled_at ?? undefined, // Corregido a canceled_at para coincidir con Prisma
      ended_at: sub.ended_at ?? undefined,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
      // plan: sub.plan ? { id: sub.plan.id, name: sub.plan.name, ... } : undefined, // Si se incluye el plan
      // tefpay_transaction_id: sub.tefpay_transaction_id ?? undefined, // ELIMINADO - Este campo no debería usarse directamente en el DTO si se busca agnosticismo
      // metadata: sub.metadata ?? undefined, // Si existe en el modelo y DTO
    }));
  }

  // Eliminar cualquier otra función findByUserId duplicada o renombrarla si tiene un propósito diferente.
  // Por ejemplo, si existía una que devolvía una sola Subscription y no un DTO.

  /**
   * Handles a user's request to cancel their active subscription.
   * The cancellation will be effective at the end of the current billing period.
   *
   * @param userId The ID of the user requesting the cancellation.
   * @param subscriptionId The ID of the subscription to cancel.
   * @param cancellationReason Optional reason for cancellation provided by the user.
   * @returns The updated subscription entity.
   * @throws NotFoundException if the subscription doesn't exist.
   * @throws BadRequestException if the subscription doesn't belong to the user,
   *         or if it's not in a cancellable state (e.g., already cancelled, ended, pending).
   */
  async requestUserSubscriptionCancellation(
    userId: string,
    subscriptionId: string,
    cancellationReason?: string,
    tx?: Prisma.TransactionClient // Added tx parameter
  ): Promise<Subscription> {
    this.logger.log(
      `User ${userId} requesting cancellation for subscription ${subscriptionId}. Reason: ${cancellationReason || "N/A"}`
    );
    const prismaClient = tx || this.prisma;

    const subscription = await prismaClient.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription with ID ${subscriptionId} not found.`
      );
    }

    if (subscription.user_id !== userId) {
      throw new BadRequestException(
        "Subscription does not belong to the authenticated user."
      );
    }

    const cancellableStatuses: PrismaSubscriptionStatus[] = [
      PrismaSubscriptionStatus.ACTIVE,
      PrismaSubscriptionStatus.TRIALING,
      PrismaSubscriptionStatus.PAST_DUE,
    ];
    if (!cancellableStatuses.includes(subscription.status)) {
      throw new BadRequestException(
        `Subscription is already in status '${subscription.status}' and cannot be cancelled.`
      );
    }

    if (!subscription.current_period_end) {
      this.logger.error(
        `Subscription ${subscriptionId} is missing 'current_period_end' and cannot be scheduled for cancellation at period end.`
      );
      throw new BadRequestException(
        "Cannot determine cancellation date due to missing current period end."
      );
    }

    if (subscription.processor_subscription_id) {
      // MODIFIED
      const processorResponse = await this.cancelSubscriptionAtProcessor(
        subscriptionId,
        subscription.processor_subscription_id,
        cancellationReason
      );

      if (!processorResponse.success) {
        this.logger.error(
          `Payment processor failed to acknowledge cancellation for subscription ${subscriptionId} (Processor ID: ${subscription.processor_subscription_id}): ${processorResponse.message}` // MODIFIED
        );
        throw new BadRequestException(
          `Could not process cancellation with payment provider: ${processorResponse.message}`
        );
      }
      this.logger.log(
        `Payment processor acknowledged cancellation for subscription ${subscriptionId} (Processor ID: ${subscription.processor_subscription_id})` // MODIFIED
      );
    } else {
      this.logger.warn(
        `Subscription ${subscriptionId} does not have a processor subscription account ID. Skipping direct cancellation with payment processor.` // MODIFIED
      );
    }

    const cancelAtDate = new Date(subscription.current_period_end);

    const updatedSubscription = await prismaClient.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: PrismaSubscriptionStatus.PENDING_CANCELLATION,
        requested_cancellation_at: new Date(),
        cancel_at: cancelAtDate,
        cancel_at_period_end: true,
      },
    });

    await this.auditLogsService.create(
      {
        user_id: userId,
        action: AuditAction.SUBSCRIPTION_CANCELLATION_REQUESTED,
        target_type: "Subscription",
        target_id: updatedSubscription.id,
        details: JSON.stringify({
          subscriptionId,
          cancellationReason,
          cancelAtDate: cancelAtDate.toISOString(),
        }),
      },
      prismaClient // Pass the prismaClient to audit service
    );

    this.logger.log(
      `Subscription ${subscriptionId} for user ${userId} has been set to 'pending_cancellation', effective on ${cancelAtDate.toISOString()}.`
    );

    return updatedSubscription;
  }

  // REVISAR: El siguiente método `cancelSubscriptionAtProcessor` es un ejemplo
  // y necesita ser adaptado o eliminado si no existe o si la lógica es diferente.
  // Este es un EJEMPLO de cómo se podría adaptar un método que antes usaba this.paymentProcessor
  async cancelSubscriptionAtProcessor(
    subscriptionId: string,
    processorName: string,
    cancellationReason?: string,
    tx?: Prisma.TransactionClient // Added tx parameter
  ): Promise<SubscriptionCancellationResponse> {
    this.logger.log(
      `Attempting to cancel subscription ${subscriptionId} at processor ${processorName}`
    );
    const prismaClient = tx || this.prisma;
    const subscription = await prismaClient.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription with ID ${subscriptionId} not found.`
      );
    }

    if (!subscription.processor_subscription_id) {
      this.logger.warn(
        `Subscription ${subscriptionId} does not have a processor_subscription_id. Cannot cancel at processor.`
      );
      throw new BadRequestException(
        "La suscripción no tiene un identificador de procesador para cancelar."
      );
    }

    // Determinar el nombre del procesador si no se proporciona explícitamente
    // y está almacenado en la suscripción.
    const actualProcessorName =
      processorName || subscription.payment_processor_name;

    if (!actualProcessorName) {
      this.logger.error(
        `Payment processor name not found for subscription ${subscriptionId}. Cannot determine which processor to use.`
      );
      throw new BadRequestException(
        "No se pudo determinar el procesador de pagos para esta suscripción."
      );
    }

    const paymentProcessor =
      this.registryService.getProcessor(actualProcessorName);

    if (!paymentProcessor) {
      this.logger.error(
        `Payment processor '${actualProcessorName}' not found or not enabled for subscription ${subscriptionId}.`
      );
      throw new NotFoundException(
        `Servicio de procesador de pagos '${actualProcessorName}' no disponible.`
      );
    }

    if (!paymentProcessor.requestSubscriptionCancellation) {
      this.logger.warn(
        `Payment processor '${actualProcessorName}' does not support requestSubscriptionCancellation method.`
      );
      throw new BadRequestException(
        `El procesador de pagos '${actualProcessorName}' no admite la cancelación de suscripciones de esta manera.`
      );
    }

    try {
      const cancellationResponse: SubscriptionCancellationResponse =
        await paymentProcessor.requestSubscriptionCancellation({
          processorSubscriptionId: subscription.processor_subscription_id, // ELIMINADA aserción innecesaria
          cancellationReason:
            cancellationReason || "Cancelación solicitada por el usuario.",
        });

      this.logger.log(
        `Subscription ${subscriptionId} (processor ID: ${subscription.processor_subscription_id}) cancellation requested at ${actualProcessorName}. Response: ${JSON.stringify(cancellationResponse)}`
      );

      const newMetadata = {
        ...((subscription.metadata as Prisma.JsonObject) || {}),
        cancellation_request_details:
          cancellationResponse as unknown as Prisma.InputJsonValue,
        cancelled_at_processor_attempted: new Date().toISOString(),
      };

      await this.updateStatus(
        subscriptionId,
        PrismaSubscriptionStatus.PENDING_CANCELLATION,
        {
          metadata: newMetadata,
        },
        prismaClient // Pass the prismaClient to updateStatus
      );

      await this.auditLogsService.create(
        {
          user_id: subscription.user_id,
          action: AuditAction.SUBSCRIPTION_CANCELLATION_REQUESTED,
          target_type: "Subscription",
          target_id: subscription.id,
          details: JSON.stringify({
            processor: actualProcessorName,
            processorSubscriptionId: subscription.processor_subscription_id,
            reason: cancellationReason,
            response: cancellationResponse,
          }),
        },
        prismaClient // Pass the prismaClient to audit service
      );

      return cancellationResponse;
    } catch (error) {
      this.logger.error(
        `Error cancelling subscription ${subscriptionId} at processor ${actualProcessorName}: ${error.message}`,
        error.stack
      );
      await this.auditLogsService.create(
        {
          user_id: subscription.user_id,
          action: AuditAction.SUBSCRIPTION_UPDATED,
          target_type: "Subscription",
          target_id: subscription.id,
          details: JSON.stringify({
            processor: actualProcessorName,
            processorSubscriptionId: subscription.processor_subscription_id,
            cancellation_attempt_failed: true,
            reason: cancellationReason,
            error: error.message,
          }),
        },
        prismaClient // Pass the prismaClient to audit service
      );
      throw new BadRequestException(
        `Error al solicitar la cancelación de la suscripción en el procesador: ${error.message}`
      );
    }
  }
}
