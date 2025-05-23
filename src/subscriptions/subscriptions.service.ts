import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";
import { Subscription, Prisma } from "@prisma/client";
import { SubscriptionStatus } from "./dto/subscription.dto";

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createSubscriptionDto: CreateSubscriptionDto,
    tx?: Prisma.TransactionClient
  ): Promise<Subscription> {
    const prismaClient = tx || this.prisma;
    const { user_id, plan_id, ...rest } = createSubscriptionDto;
    const data: Prisma.SubscriptionCreateInput = {
      ...rest,
      user: { connect: { id: user_id } },
      plan: { connect: { id: plan_id } },
      status: SubscriptionStatus.PENDING,
    };
    return prismaClient.subscription.create({ data });
  }

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

    return prismaClient.subscription.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<Subscription> {
    return this.prisma.subscription.delete({
      where: { id },
    });
  }

  async updateStatus(
    subscriptionId: string,
    status: SubscriptionStatus,
    updateData?: Partial<Prisma.SubscriptionUncheckedUpdateInput>,
    tx?: Prisma.TransactionClient
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

    return prismaClient.subscription.update({
      where: { id: subscriptionId },
      data: dataToUpdate,
    });
  }

  async findByPaymentId(
    orderIdentifier: string,
    tx?: Prisma.TransactionClient
  ): Promise<Subscription | null> {
    const prismaClient = tx || this.prisma;

    try {
      const subscriptionById = await prismaClient.subscription.findUnique({
        where: { id: orderIdentifier },
      });
      if (subscriptionById) return subscriptionById;
    } catch (e) {
      console.warn(
        `[findByPaymentId] Error al buscar la suscripción por ID: ${e}`
      );
    }

    console.warn(
      `[findByPaymentId] No se pudo encontrar la suscripción para orderIdentifier: ${orderIdentifier}. Se requiere una estrategia de enlace más robusta.`
    );
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
}
