import {
  Injectable,
  NotFoundException,
  ConflictException,
  // BadRequestException, // Removed unused import
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
import { PlansService } from "./plans/plans.service";
import { ConfigService } from "@nestjs/config";
import { PAYMENT_PROCESSOR_TOKEN } from "./payment-processor.token";
import { IPaymentProcessor } from "./processors/payment-processor.interface";
import { InitiatePaymentResponseDto } from "./dto/initiate-payment-response.dto";
import { AuditLogsService } from "../audit-logs/audit-logs.service"; // ADDED
import { AuditAction } from "../audit-logs/dto/audit-action.enum"; // ADDED (asumming enum exists or will be created)

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
    private readonly paymentProcessor: IPaymentProcessor,
    private readonly auditLogsService: AuditLogsService // ADDED
  ) {}

  async initiatePaymentFlow(
    initiatePaymentDto: InitiatePaymentDto,
    requestingUserId: string
  ): Promise<InitiatePaymentResponseDto> {
    const { plan_id } = initiatePaymentDto;
    const user = await this.usersService.findOne(requestingUserId);
    if (!user) {
      throw new NotFoundException(
        `User with ID "${requestingUserId}" not found.`
      );
    }

    // Corrected method name to match SubscriptionsService
    const existingSubscription =
      await this.subscriptionsService.findActiveByUserId(requestingUserId); // Corrected method name
    if (existingSubscription) {
      throw new ConflictException(
        "User already has an active subscription. Cannot initiate new payment for a plan."
      );
    }

    const plan = await this.plansService.findOne(plan_id);
    if (!plan) {
      throw new NotFoundException(`Plan with ID "${plan_id}" not found.`);
    }
    // Add check for plan active status
    if (!plan.active) {
      throw new NotFoundException(`Plan with ID "${plan_id}" is not active.`);
    }

    const payment = await this.prisma.payment.create({
      data: {
        user_id: requestingUserId,
        amount: plan.price,
        currency: plan.currency,
        status: "PENDING",
        processor: "tefpay", // Assuming tefpay is the processor for now
        metadata: {
          plan_id: plan.id, // Corrected to plan.id from plan.plan_id
          action: "subscription_creation",
        },
      },
    });

    const successUrl = `${this.configService.get<string>(
      "FRONTEND_URL"
    )}/payment/success?payment_id=${payment.id}`;
    const cancelUrl = `${this.configService.get<string>(
      "FRONTEND_URL"
    )}/payment/cancelled?payment_id=${payment.id}`;
    const notificationUrl = `${this.configService.get<string>(
      "APP_URL"
    )}/payments/tefpay/notifications`;

    // Use the injected paymentProcessor (which is TefpayService instance)
    const preparedPayment = this.paymentProcessor.preparePaymentParameters({
      amount: plan.price,
      currency: plan.currency,
      order: payment.id,
      success_url: successUrl,
      cancel_url: cancelUrl,
      notification_url: notificationUrl,
      customer_email: user.email,
      product_description: `Subscription to plan ${plan.name}`,
      metadata: { userId: requestingUserId, paymentId: payment.id },
    });

    this.logger.log(
      `Initiating payment for user ${requestingUserId}, plan ${plan_id}, payment ${payment.id}`
    );

    // Audit Log
    await this.auditLogsService.create({
      user_id: requestingUserId,
      action: AuditAction.PAYMENT_INTENT_CREATED, // Define AuditAction enum
      target_type: "Payment",
      target_id: payment.id,
      details: JSON.stringify({
        plan_id,
        amount: payment.amount,
        currency: payment.currency,
      }),
    });

    // Ensure the response matches InitiatePaymentResponseDto structure
    return {
      payment_id: payment.id, // Corrected to payment_id
      amount: payment.amount, // Amount in smallest unit
      currency: payment.currency,
      order_reference: payment.id, // Using payment.id as order_reference
      payment_processor_url: preparedPayment.url,
      payment_processor_data: preparedPayment.fields,
    };
  }

  async handleTefpayNotification(notificationPayload: any): Promise<void> {
    this.logger.log(
      `Received Tefpay notification: ${JSON.stringify(notificationPayload)}`
    );

    // Extract relevant information from the notification
    // const tefpayPaymentId = notificationPayload.Ds_Merchant_TransactionID; // Example field - REMOVED AS UNUSED
    const paymentStatusFromTefpay = notificationPayload.Ds_Response; // Example field, needs mapping to your PaymentStatus
    const orderIdFromNotification = notificationPayload.Ds_Order; // This is your internal payment.id

    if (!orderIdFromNotification) {
      this.logger.error(
        "Tefpay notification is missing Ds_Order. Cannot process."
      );
      // Log an audit event for a notification that can't even be identified
      await this.auditLogsService.create({
        action: AuditAction.PAYMENT_NOTIFICATION_ERROR,
        target_type: "Notification", // General type as payment is unknown
        target_id: "UNKNOWN", // No specific payment ID can be identified
        details: JSON.stringify({
          error: "Missing Ds_Order in notification",
          notification: notificationPayload,
        }),
      });
      return;
    }

    // Find the payment in your database using the internal payment ID (order ID sent to Tefpay)
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: orderIdFromNotification,
      },
      include: {
        user: true,
      },
    });

    if (!payment) {
      this.logger.error(
        `Payment not found for Tefpay notification with Order ID: ${orderIdFromNotification}`
      );
      // Log an audit event for a notification for an unknown payment
      await this.auditLogsService.create({
        action: AuditAction.PAYMENT_NOTIFICATION_ERROR,
        target_type: "Payment",
        target_id: orderIdFromNotification, // Use the ID from notification as payment wasn't found
        details: JSON.stringify({
          error: "Payment not found for received notification",
          notification: notificationPayload,
        }),
      });
      return;
    }

    // Audit Log for receiving notification - NOW WITH PAYMENT CONTEXT
    await this.auditLogsService.create({
      user_id: payment.user_id, // Use user_id from the fetched payment
      action: AuditAction.PAYMENT_NOTIFICATION_RECEIVED,
      target_type: "Payment",
      target_id: payment.id, // Use payment.id from the fetched payment
      details: JSON.stringify(notificationPayload),
    });

    // Cast payment.status to PaymentStatus for comparison
    const currentPaymentStatus = payment.status as PaymentStatus;

    if (
      currentPaymentStatus === PaymentStatus.SUCCEEDED ||
      currentPaymentStatus === PaymentStatus.FAILED
    ) {
      this.logger.warn(
        `Payment ${payment.id} has already been processed (status: ${payment.status}). Ignoring notification.`
      );
      return;
    }

    let newStatus: PaymentStatus;
    // Map Tefpay status to your internal PaymentStatus
    // This is a critical part and needs to be accurate based on Tefpay's documentation
    // Example mapping:
    if (paymentStatusFromTefpay === "0000") {
      // Assuming '0000' is a success code from Tefpay
      newStatus = PaymentStatus.SUCCEEDED;
    } else {
      newStatus = PaymentStatus.FAILED;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // Update payment status first
        await this.updateStatus(payment.id, newStatus, notificationPayload, tx);

        // Audit Log for Payment Status Update (Success/Failure)
        await this.auditLogsService.create({
          user_id: payment.user_id,
          action:
            newStatus === PaymentStatus.SUCCEEDED
              ? AuditAction.PAYMENT_SUCCEEDED
              : AuditAction.PAYMENT_FAILED,
          target_type: "Payment",
          target_id: payment.id,
          details: JSON.stringify({
            tefpayResponse: paymentStatusFromTefpay,
            processorFullResponse: notificationPayload,
          }),
        });

        if (newStatus === PaymentStatus.SUCCEEDED) {
          this.logger.log(
            `Payment ${payment.id} succeeded. Attempting to create subscription.`
          );
          const planId = (payment.metadata as Prisma.JsonObject)
            ?.plan_id as string;

          if (!planId) {
            this.logger.error(
              `Plan ID not found in payment metadata for payment ${payment.id}. Cannot create subscription.`
            );
            throw new InternalServerErrorException(
              "Subscription creation failed due to missing plan information."
            );
          }

          const plan = await this.plansService.findOne(planId); // No tx needed here if not modifying plan
          if (!plan) {
            this.logger.error(
              `Plan with ID ${planId} not found during notification processing for payment ${payment.id}.`
            );
            throw new NotFoundException(`Plan with ID ${planId} not found.`);
          }

          // Create subscription
          const newSubscription = await this.subscriptionsService.create(
            {
              user_id: payment.user_id,
              plan_id: planId,
              payment_id: payment.id, // Pass payment_id for potential linking, though not directly used in Subscription.create for a direct relation
            },
            tx
          );
          this.logger.log(
            `Subscription created with ID ${newSubscription.id} for user ${payment.user_id}, plan ${planId}.`
          );

          // Audit Log for Subscription Creation
          await this.auditLogsService.create({
            user_id: payment.user_id,
            action: AuditAction.SUBSCRIPTION_CREATED,
            target_type: "Subscription",
            target_id: newSubscription.id,
            details: JSON.stringify({
              plan_id: planId,
              payment_id: payment.id,
            }),
          });

          // Link the subscription to the payment
          await tx.payment.update({
            where: { id: payment.id },
            data: { subscription_id: newSubscription.id },
          });
          this.logger.log(
            `Payment ${payment.id} updated with subscription_id ${newSubscription.id}.`
          );
        } else {
          this.logger.log(
            `Payment ${payment.id} failed. No subscription will be created.`
          );
        }
      });
      this.logger.log(
        `Successfully processed Tefpay notification for payment ${payment.id}. New status: ${newStatus}`
      );
    } catch (error) {
      this.logger.error(
        `Error processing Tefpay notification for payment ${payment.id}: ${error.message}`,
        error.stack
      );
      // Audit Log for Processing Error
      await this.auditLogsService.create({
        user_id: payment.user_id, // payment is defined here
        action: AuditAction.PAYMENT_NOTIFICATION_ERROR,
        target_type: "Payment",
        target_id: payment.id, // payment.id is available
        details: JSON.stringify({
          error: error.message,
          stack: error.stack,
          notification: notificationPayload,
        }),
      });

      // Decide if you need to throw an error that NestJS will handle,
      // or if logging is sufficient (Tefpay might retry or you handle reconciliation separately)
      // For now, we'll let the error propagate if it's serious (like DB error)
      if (
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to process Tefpay notification: ${error.message}`
      );
    }
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
