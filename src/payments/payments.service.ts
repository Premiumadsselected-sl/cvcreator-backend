import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Inject,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { UpdatePaymentDto } from "./dto/update-payment.dto";
import { Payment, Prisma } from "@prisma/client";
import { PaymentStatus } from "./dto/payment.dto";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";
import { UsersService } from "../users/users.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { SubscriptionStatus as AppSubscriptionStatus } from "../subscriptions/dto/subscription.dto";
import { PlansService } from "./plans/plans.service";
import { ConfigService } from "@nestjs/config";
import { PAYMENT_PROCESSOR_TOKEN } from "./payment-processor.token";
import { IPaymentProcessor } from "./processors/payment-processor.interface";
import { InitiatePaymentResponseDto } from "./dto/initiate-payment-response.dto";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly plansService: PlansService,
    private readonly configService: ConfigService,
    @Inject(PAYMENT_PROCESSOR_TOKEN)
    private readonly paymentProcessor: IPaymentProcessor
  ) {}

  async initiatePaymentFlow(
    initiatePaymentDto: InitiatePaymentDto,
    requestingUserId: string
  ): Promise<InitiatePaymentResponseDto> {
    const { email, plan_id } = initiatePaymentDto;
    const user = await this.usersService.findOne(requestingUserId);
    if (!user) {
      throw new NotFoundException( // Cambiado de InternalServerErrorException a NotFoundException
        `User with ID "${requestingUserId}" not found.` // Mensaje ajustado para coincidir con la expectativa de la prueba (o la prueba se ajustará)
      );
    }
    if (user.email !== email) {
      throw new BadRequestException(
        "The provided email does not match the authenticated user's email."
      );
    }

    const existingSubscription =
      await this.subscriptionsService.validateSubscription({
        user_id: user.id,
      });

    if (
      existingSubscription &&
      (existingSubscription.status ===
        (AppSubscriptionStatus.ACTIVE as string) ||
        existingSubscription.status ===
          (AppSubscriptionStatus.TRIALING as string)) &&
      (!existingSubscription.current_period_end ||
        new Date(existingSubscription.current_period_end) > new Date())
    ) {
      throw new ConflictException(
        `User already has an active or trialing subscription. Status: ${existingSubscription.status}`
      );
    }

    const plan = await this.plansService.findOne(plan_id);
    if (!plan || !plan.active) {
      throw new NotFoundException(
        `Plan with ID "${plan_id}" not found or is not active.`
      );
    }

    const paymentAmount = plan.price;
    const currency = plan.currency || "EUR";
    const activeProcessorName = this.configService.get<string>(
      "ACTIVE_PAYMENT_PROCESSOR",
      "tefpay"
    );

    let payment: Payment;
    try {
      payment = await this.prisma.payment.create({
        data: {
          user: { connect: { id: user.id } },
          amount: paymentAmount,
          currency: currency,
          status: PaymentStatus.PENDING,
          processor: activeProcessorName,
          metadata: {
            plan_id: plan.id,
            plan_name: plan.name,
            user_email: user.email,
            action: "subscription_setup",
          },
        },
      });
    } catch (error) {
      console.error("Error creating payment record:", error); // This console.error is noted in the summary
      throw new InternalServerErrorException(
        "Failed to create payment record" // Aligning with test expectation
      );
    }

    const orderReference = payment.id;
    const amountInCents = Math.round(paymentAmount * 100);

    let preparedPayment;
    try {
      preparedPayment = this.paymentProcessor.preparePaymentParameters({
        amount: amountInCents,
        currency: currency,
        order: orderReference,
        merchant_data: `user_id:${user.id},plan_id:${plan.id},processor:${activeProcessorName}`,
        product_description: `Suscripción al plan ${plan.name}`,
        customer_email: user.email,
      });
    } catch (error) {
      console.error("Error preparing payment parameters:", error);
      throw new InternalServerErrorException(
        `Failed to prepare payment parameters with payment processor. Error: ${error.message}`
      );
    }

    return {
      payment_id: payment.id,
      amount: amountInCents,
      currency: currency,
      order_reference: orderReference,
      payment_processor_url: preparedPayment.url,
      payment_processor_data: preparedPayment.fields,
    };
  }

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    let paymentProcessorName = createPaymentDto.processor;
    if (!paymentProcessorName) {
      paymentProcessorName = this.configService.get<string>(
        "ACTIVE_PAYMENT_PROCESSOR",
        "tefpay"
      );
    }

    const metadata = {
      ...(createPaymentDto.metadata || {}),
    };

    if (createPaymentDto.plan_id) {
      metadata.plan_id = createPaymentDto.plan_id;
    }
    if (createPaymentDto.order_id) {
      metadata.order_id = createPaymentDto.order_id;
    }

    const paymentData: Prisma.PaymentCreateInput = {
      amount: createPaymentDto.amount,
      currency: createPaymentDto.currency,
      status: createPaymentDto.status || PaymentStatus.PENDING,
      processor: paymentProcessorName,
      user: { connect: { id: createPaymentDto.user_id } },
      processor_payment_id: createPaymentDto.processor_payment_id,
      processor_response:
        createPaymentDto.processor_response || Prisma.JsonNull,
      paid_at: createPaymentDto.paid_at
        ? new Date(createPaymentDto.paid_at)
        : null,
      metadata: Object.keys(metadata).length > 0 ? metadata : Prisma.JsonNull,
    };

    if (createPaymentDto.subscription_id) {
      paymentData.subscription = {
        connect: { id: createPaymentDto.subscription_id },
      };
    }

    try {
      const newPayment = await this.prisma.payment.create({
        data: paymentData,
      });
      return newPayment;
    } catch (error) {
      this.logger.error(
        `Error creating payment: ${error.message}`,
        error.stack
      );
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          let targetString = "unknown field(s)";
          if (error.meta && typeof error.meta.target === "string") {
            targetString = error.meta.target;
          } else if (error.meta && Array.isArray(error.meta.target)) {
            targetString = error.meta.target.join(", ");
          }
          throw new ConflictException(
            `Payment creation failed due to a conflict on: ${targetString}`
          );
        }
      }
      throw new InternalServerErrorException(
        `Failed to create payment: ${error.message || "Unknown error"}`
      );
    }
  }

  async findAll(): Promise<Payment[]> {
    // Método findAll añadido
    return this.prisma.payment.findMany();
  }

  async findOne(id: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({ where: { id } });
  }

  async update(
    id: string,
    updatePaymentDto: UpdatePaymentDto
  ): Promise<Payment | null> {
    const { user_id, subscription_id, ...restOfDto } = updatePaymentDto as any;
    const data: Prisma.PaymentUpdateInput = { ...restOfDto };

    if (user_id) {
      data.user = { connect: { id: user_id } };
    }
    if (subscription_id) {
      data.subscription = { connect: { id: subscription_id } };
    }

    return this.prisma.payment.update({ where: { id }, data });
  }

  async remove(id: string): Promise<Payment | null> {
    return this.prisma.payment.delete({ where: { id } });
  }

  async findByMatchingData(
    matchingData: string,
    tx?: Prisma.TransactionClient
  ): Promise<Payment | null> {
    const prismaClient = tx || this.prisma;
    if (matchingData.startsWith("tfp_")) {
      const paymentByProcessorId = await prismaClient.payment.findFirst({
        where: { processor_payment_id: matchingData },
      });
      if (paymentByProcessorId) return paymentByProcessorId;
    }
    try {
      const paymentById = await prismaClient.payment.findUnique({
        where: { id: matchingData },
      });
      if (paymentById) return paymentById;
    } catch (error) {
      console.warn(
        `Attempt to find payment by ID with non-UUID matchingData: ${matchingData} , error: ${error}`
      );
    }
    return null;
  }

  async updateStatus(
    paymentId: string,
    status: PaymentStatus,
    processorResponse?: Prisma.InputJsonValue | Record<string, any>,
    tx?: Prisma.TransactionClient
  ): Promise<Payment | null> {
    const prismaClient = tx || this.prisma;
    const updateData: Prisma.PaymentUpdateInput = { status };
    if (processorResponse) {
      updateData.processor_response = processorResponse;
      if (typeof processorResponse === "object" && processorResponse !== null) {
        const prAsAny = processorResponse as any;
        if (prAsAny.Ds_Merchant_TransactionID) {
          updateData.processor_payment_id = String(
            prAsAny.Ds_Merchant_TransactionID
          );
        }
        if (status === PaymentStatus.SUCCEEDED && !prAsAny.paid_at) {
          updateData.paid_at = new Date();
        }
      }
    }
    return prismaClient.payment.update({
      where: { id: paymentId },
      data: updateData,
    });
  }
}
