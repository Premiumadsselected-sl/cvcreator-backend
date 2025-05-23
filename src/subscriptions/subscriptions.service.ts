import { Injectable } from "@nestjs/common"; // NotFoundException eliminada si no se usa
import { PrismaService } from "../prisma/prisma.service";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";
import { Subscription, Prisma } from "@prisma/client";
import { SubscriptionStatus, SubscriptionDto } from "./dto/subscription.dto"; // SubscriptionDto importado aquí
import { AuditLogsService } from "../audit-logs/audit-logs.service"; // Importar AuditLogsService
import { AuditAction } from "../audit-logs/dto/audit-action.enum"; // Importar AuditAction

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService // Inyectar AuditLogsService
  ) {}

  async create(
    createSubscriptionDto: CreateSubscriptionDto,
    tx?: Prisma.TransactionClient
  ): Promise<Subscription> {
    const prismaClient = tx || this.prisma;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user_id, plan_id, payment_id, ...restInput } =
      createSubscriptionDto; // payment_id desestructurado para excluirlo de 'restInput'
    const data: Prisma.SubscriptionCreateInput = {
      ...restInput, // 'restInput' ya no contiene payment_id
      user: { connect: { id: user_id } },
      plan: { connect: { id: plan_id } },
      status: SubscriptionStatus.PENDING,
    };
    const subscription = await prismaClient.subscription.create({ data });

    // Crear log de auditoría
    await this.auditLogsService.create({
      user_id,
      action: AuditAction.SUBSCRIPTION_CREATED,
      target_type: "Subscription", // Corregido de entity a target_type
      target_id: subscription.id, // Corregido de entity_id a target_id
      details: JSON.stringify({ createSubscriptionDto }), // Convertir a string
    });

    return subscription;
  }

  // ... (otros métodos existentes: findAll, findOne, update, remove, updateStatus, etc.)
  async findAll(): Promise<Subscription[]> {
    return this.prisma.subscription.findMany();
  }

  async findOne(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<Subscription | null> {
    const prismaClient = tx || this.prisma;
    const subscription = await prismaClient.subscription.findUnique({
      where: { id },
    });
    return subscription;
  }

  async update(
    id: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
    tx?: Prisma.TransactionClient
  ): Promise<Subscription> {
    const prismaClient = tx || this.prisma;
    const { metadata, status, ...rest } = updateSubscriptionDto;
    const data: Prisma.SubscriptionUpdateInput = {
      ...rest,
      status: status ? (status as string) : undefined,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
    };

    const updatedSubscription = await prismaClient.subscription.update({
      where: { id },
      data,
    });

    // Crear log de auditoría
    if (updatedSubscription.user_id) {
      await this.auditLogsService.create({
        user_id: updatedSubscription.user_id,
        action: AuditAction.SUBSCRIPTION_UPDATED,
        target_type: "Subscription", // Corregido de entity a target_type
        target_id: updatedSubscription.id, // Corregido de entity_id a target_id
        details: JSON.stringify({ updateSubscriptionDto }), // Convertir a string
      });
    }

    return updatedSubscription;
  }

  async remove(id: string, userId?: string): Promise<Subscription> {
    // userId añadido opcionalmente para logging
    const subscription = await this.prisma.subscription.delete({
      where: { id },
    });

    // Crear log de auditoría
    if (userId || subscription.user_id) {
      await this.auditLogsService.create({
        user_id: userId || subscription.user_id,
        action: AuditAction.SUBSCRIPTION_CANCELLED,
        target_type: "Subscription", // Corregido de entity a target_type
        target_id: subscription.id, // Corregido de entity_id a target_id
        details: JSON.stringify({ id }), // Convertir a string
      });
    }

    return subscription;
  }

  async updateStatus(
    subscriptionId: string,
    status: SubscriptionStatus,
    updateData?: Partial<Prisma.SubscriptionUncheckedUpdateInput>,
    tx?: Prisma.TransactionClient,
    userId?: string // userId añadido opcionalmente para logging
  ): Promise<Subscription | null> {
    const prismaClient = tx || this.prisma;
    const dataToUpdate: Prisma.SubscriptionUpdateInput = {
      status: status as string,
    };

    if (updateData) {
      Object.keys(updateData).forEach((key) => {
        if (key !== "id") {
          (dataToUpdate as any)[key] = (updateData as any)[key];
        }
      });
    }

    if (status === SubscriptionStatus.ACTIVE) {
      if (
        dataToUpdate.current_period_start === undefined &&
        !(updateData && updateData.current_period_start)
      ) {
        dataToUpdate.current_period_start = new Date();
      }
    } else if (status === SubscriptionStatus.CANCELLED) {
      if (
        dataToUpdate.cancelled_at === undefined &&
        !(updateData && updateData.cancelled_at)
      ) {
        dataToUpdate.cancelled_at = new Date();
      }
      if (
        dataToUpdate.ended_at === undefined &&
        !(updateData && updateData.ended_at) &&
        !(updateData && updateData.cancel_at_period_end) &&
        !dataToUpdate.cancel_at_period_end
      ) {
        dataToUpdate.ended_at = new Date();
      }
    } else if (status === SubscriptionStatus.INACTIVE) {
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
      await this.auditLogsService.create({
        user_id: userId || updatedSubscription.user_id,
        action: AuditAction.SUBSCRIPTION_STATUS_CHANGED,
        target_type: "Subscription", // Corregido de entity a target_type
        target_id: updatedSubscription.id, // Corregido de entity_id a target_id
        details: JSON.stringify({ status, updateData }), // Convertir a string
      });
    }

    return updatedSubscription;
  }

  async findByPaymentId(
    orderIdentifier: string, // Este parece ser el ID de la suscripción, no del pago, según el uso.
    tx?: Prisma.TransactionClient
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
    tx?: Prisma.TransactionClient
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
    tx?: Prisma.TransactionClient
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
      subscription.status === (SubscriptionStatus.ACTIVE as string) ||
      subscription.status === (SubscriptionStatus.TRIALING as string);

    const isWithinPeriod =
      !subscription.current_period_end ||
      new Date(subscription.current_period_end) > new Date();

    return isActiveStatus && isWithinPeriod;
  }

  async findActiveByUserId(
    userId: string,
    tx?: Prisma.TransactionClient
  ): Promise<Subscription | null> {
    const prismaClient = tx || this.prisma;
    return prismaClient.subscription.findFirst({
      where: {
        user_id: userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
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
    tx?: Prisma.TransactionClient
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
      status: sub.status as SubscriptionStatus, // El DTO espera SubscriptionStatus
      // Manejo de campos de fecha que pueden ser null en Prisma y Date | undefined en DTO
      trial_start: sub.trial_start ?? undefined,
      trial_end: sub.trial_end ?? undefined,
      current_period_start: sub.current_period_start ?? undefined,
      current_period_end: sub.current_period_end ?? undefined,
      cancel_at_period_end: sub.cancel_at_period_end ?? undefined,
      cancelled_at: sub.cancelled_at ?? undefined,
      ended_at: sub.ended_at ?? undefined,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
      // plan: sub.plan ? { id: sub.plan.id, name: sub.plan.name, ... } : undefined, // Si se incluye el plan
      // tefpay_transaction_id: sub.tefpay_transaction_id ?? undefined, // Si existe en el modelo
      // metadata: sub.metadata ?? undefined, // Si existe en el modelo y DTO
    }));
  }

  // Eliminar cualquier otra función findByUserId duplicada o renombrarla si tiene un propósito diferente.
  // Por ejemplo, si existía una que devolvía una sola Subscription y no un DTO.
}
