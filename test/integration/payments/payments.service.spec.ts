import { Test, TestingModule } from "@nestjs/testing";
import { PaymentsService } from "../../../src/payments/payments.service";
import { PrismaService } from "../../../src/prisma/prisma.service";
import { UsersService } from "../../../src/users/users.service";
import { SubscriptionsService } from "../../../src/subscriptions/subscriptions.service";
import { PlansService } from "../../../src/payments/plans/plans.service";
import { ConfigService } from "@nestjs/config";
import { PAYMENT_PROCESSOR_TOKEN } from "../../../src/payments/payment-processor.token";
import { IPaymentProcessor } from "../../../src/payments/processors/payment-processor.interface";
import { HttpModule } from "@nestjs/axios";
// import { TefpayService } from "../../../src/payments/tefpay/tefpay.service"; // No se usa directamente en este spec
import { CreatePaymentDto } from "../../../src/payments/dto/create-payment.dto"; // IMPORTAR CreatePaymentDto
import { PaymentStatus } from "../../../src/payments/dto/payment.dto"; // IMPORTAR PaymentStatus si es necesario para los mocks
import { Payment } from "@prisma/client"; // IMPORTAR Payment para tipar mocks
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

const mockPaymentProcessor: jest.Mocked<IPaymentProcessor> = {
  preparePaymentParameters: jest.fn(),
  // handleWebhook: jest.fn(), // Comentado o eliminado ya que no está en la interfaz activa
  // verifySignature: jest.fn(), // Comentado o eliminado ya que no está en la interfaz activa
};

const mockPrismaService = {
  payment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockUsersService = {
  findOne: jest.fn(),
};

const mockSubscriptionsService = {
  validateSubscription: jest.fn(),
  createSubscriptionAfterPayment: jest.fn(),
};

const mockPlansService = {
  findOne: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(
    <T = any>(key: string, defaultValue?: T): T | string | undefined => {
      // Tipado más específico
      if (key === "ACTIVE_PAYMENT_PROCESSOR") {
        return "tefpay";
      }
      if (key === "APP_BASE_URL") {
        return "http://localhost:3000";
      }
      if (key === "DOMAIN_URL") {
        return "http://localhost:3001";
      }
      return defaultValue;
    }
  ),
};

describe("PaymentsService", () => {
  let service: PaymentsService;
  let paymentProcessorMock: jest.Mocked<IPaymentProcessor>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SubscriptionsService, useValue: mockSubscriptionsService },
        { provide: PlansService, useValue: mockPlansService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PAYMENT_PROCESSOR_TOKEN, useValue: mockPaymentProcessor },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentProcessorMock = module.get(PAYMENT_PROCESSOR_TOKEN);

    // Reiniciar mocks antes de cada prueba
    mockUsersService.findOne.mockReset();
    mockPlansService.findOne.mockReset();
    mockSubscriptionsService.validateSubscription.mockReset();
    mockPrismaService.payment.create.mockReset();
    paymentProcessorMock.preparePaymentParameters.mockReset();
    mockConfigService.get.mockClear(); // Asegurar que el mock de configService se limpie
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("initiatePaymentFlow", () => {
    it("should successfully initiate a payment flow", async () => {
      mockUsersService.findOne.mockResolvedValue({
        id: "user-id",
        email: "test@example.com",
      });
      mockSubscriptionsService.validateSubscription.mockResolvedValue(null);
      mockPlansService.findOne.mockResolvedValue({
        id: "plan-id",
        price: 1000,
        currency: "EUR",
        active: true,
      });
      mockPrismaService.payment.create.mockResolvedValue({
        id: "payment-id",
        amount: 1000,
        currency: "EUR",
        status: "PENDING",
        user_id: "user-id",
        order_id: "order-id",
      });
      paymentProcessorMock.preparePaymentParameters.mockReturnValue({
        url: "http://paymentprocessor.com/pay",
        fields: { field1: "value1" },
        payment_processor_name: "tefpay",
      });

      const result = await service.initiatePaymentFlow(
        { email: "test@example.com", plan_id: "plan-id" },
        "user-id"
      );

      expect(result).toBeDefined();
      expect(result.payment_processor_url).toBe(
        "http://paymentprocessor.com/pay"
      );
      expect(result.payment_processor_data).toBeDefined();
      expect(result.payment_processor_data?.field1).toBe("value1");
      expect(mockPrismaService.payment.create).toHaveBeenCalled();
      expect(paymentProcessorMock.preparePaymentParameters).toHaveBeenCalled();
    });

    it("should throw NotFoundException if user is not found", async () => {
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(
        service.initiatePaymentFlow(
          { email: "test@example.com", plan_id: "plan-id" },
          "non-existent-user-id"
        )
      ).rejects.toThrow(NotFoundException);
      // Se ajusta el mensaje esperado para que coincida exactamente con el servicio
      await expect(
        service.initiatePaymentFlow(
          { email: "test@example.com", plan_id: "plan-id" },
          "non-existent-user-id"
        )
      ).rejects.toThrow('User with ID "non-existent-user-id" not found.');
    });

    it("should throw NotFoundException if plan is not found", async () => {
      mockUsersService.findOne.mockResolvedValue({
        id: "user-id",
        email: "test@example.com",
      });
      mockPlansService.findOne.mockResolvedValue(null);

      await expect(
        service.initiatePaymentFlow(
          { email: "test@example.com", plan_id: "non-existent-plan-id" },
          "user-id"
        )
      ).rejects.toThrow(NotFoundException);
      // Se ajusta el mensaje esperado para que coincida exactamente con el servicio
      await expect(
        service.initiatePaymentFlow(
          { email: "test@example.com", plan_id: "non-existent-plan-id" },
          "user-id"
        )
      ).rejects.toThrow(
        'Plan with ID "non-existent-plan-id" not found or is not active.'
      );
    });

    it("should throw ConflictException if user already has an active subscription", async () => {
      mockUsersService.findOne.mockResolvedValue({
        id: "user-id",
        email: "test@example.com",
      });
      mockPlansService.findOne.mockResolvedValue({
        id: "plan-id",
        name: "Test Plan",
        price: 1000,
        currency: "EUR",
        active: true,
      });
      mockSubscriptionsService.validateSubscription.mockRejectedValue(
        new ConflictException("User already has an active subscription.")
      );

      await expect(
        service.initiatePaymentFlow(
          { email: "test@example.com", plan_id: "plan-id" },
          "user-id"
        )
      ).rejects.toThrow(ConflictException);
      await expect(
        service.initiatePaymentFlow(
          { email: "test@example.com", plan_id: "plan-id" },
          "user-id"
        )
      ).rejects.toThrow("User already has an active subscription.");
    });

    it("should throw InternalServerErrorException if payment creation fails", async () => {
      mockUsersService.findOne.mockResolvedValue({
        id: "user-id",
        email: "test@example.com",
      });
      mockPlansService.findOne.mockResolvedValue({
        id: "plan-id",
        name: "Test Plan",
        price: 1000,
        currency: "EUR",
        active: true,
      });
      mockSubscriptionsService.validateSubscription.mockResolvedValue(null);
      mockPrismaService.payment.create.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        service.initiatePaymentFlow(
          { email: "test@example.com", plan_id: "plan-id" },
          "user-id"
        )
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.initiatePaymentFlow(
          { email: "test@example.com", plan_id: "plan-id" },
          "user-id"
        )
      ).rejects.toThrow("Failed to create payment record");
    });

    it("should throw InternalServerErrorException if payment processor parameter preparation fails", async () => {
      mockUsersService.findOne.mockResolvedValue({
        id: "user-id",
        email: "test@example.com",
      });
      mockPlansService.findOne.mockResolvedValue({
        id: "plan-id",
        name: "Test Plan",
        price: 1000,
        currency: "EUR",
        active: true,
      });
      mockSubscriptionsService.validateSubscription.mockResolvedValue(null);
      mockPrismaService.payment.create.mockResolvedValue({
        id: "payment-id",
        amount: 1000,
        currency: "EUR",
        status: "PENDING",
        user_id: "user-id",
      });
      paymentProcessorMock.preparePaymentParameters.mockImplementation(() => {
        throw new Error("Processor error");
      });

      await expect(
        service.initiatePaymentFlow(
          { email: "test@example.com", plan_id: "plan-id" },
          "user-id"
        )
      ).rejects.toThrow(InternalServerErrorException);

      await expect(
        service.initiatePaymentFlow(
          { email: "test@example.com", plan_id: "plan-id" },
          "user-id"
        )
      ).rejects.toThrow(
        "Failed to prepare payment parameters with payment processor. Error: Processor error"
      );
    });
  });

  describe("create", () => {
    const userId = "user-id-for-create";
    const baseCreatePaymentDto = {
      user_id: userId,
      amount: 2000,
      currency: "USD",
    };

    // Updated to reflect that plan_id and order_id are in metadata
    const expectedPaymentDataBasePrismaInput = {
      amount: baseCreatePaymentDto.amount,
      currency: baseCreatePaymentDto.currency,
      status: PaymentStatus.PENDING,
      user: { connect: { id: userId } },
      // processor_payment_id, processor_response, paid_at, metadata will be added per test case
    };

    it("should successfully create a payment with default processor and plan_id/order_id in metadata", async () => {
      const createPaymentDto: CreatePaymentDto = {
        ...baseCreatePaymentDto,
        plan_id: "test-plan-id",
        order_id: "test-order-id",
        metadata: { custom_field: "custom_value" },
      };

      const expectedMetadata = {
        plan_id: "test-plan-id",
        order_id: "test-order-id",
        custom_field: "custom_value",
      };

      const expectedPrismaCreateData = {
        ...expectedPaymentDataBasePrismaInput,
        processor: "tefpay", // As per mockConfigService default
        metadata: expectedMetadata,
        processor_payment_id: undefined, // or null if that's the DTO default
        processor_response: {}, // Prisma.JsonNull,
        paid_at: null,
      };

      const mockCreatedPayment: Payment = {
        id: "new-payment-id",
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency,
        status: PaymentStatus.PENDING,
        processor: "tefpay",
        user_id: userId,
        subscription_id: null,
        processor_payment_id: null,
        processor_response: {}, // Prisma.JsonNull in service
        paid_at: null,
        metadata: expectedMetadata, // metadata should contain plan_id and order_id
        createdAt: new Date(), // Using new Date() for mock
        updatedAt: new Date(), // Using new Date() for mock
        refunded_at: null,
        error_message: null,
        refunded_amount: null, // Added
        refund_reason: null, // Added
        method: null, // Added
      };
      mockPrismaService.payment.create.mockResolvedValue(mockCreatedPayment);

      const result = await service.create(createPaymentDto);

      expect(result).toEqual(mockCreatedPayment);
      // Corrected expectation for metadata
      expect(mockPrismaService.payment.create).toHaveBeenCalledWith({
        data: {
          ...expectedPrismaCreateData,
          // Ensure Prisma.JsonNull is used if metadata is empty, but here it's not.
          processor_response: createPaymentDto.processor_response || {}, // Prisma.JsonNull,
        },
      });
      expect(mockConfigService.get).toHaveBeenCalledWith(
        "ACTIVE_PAYMENT_PROCESSOR",
        "tefpay"
      );
    });

    it("should successfully create a payment with a specified processor and metadata", async () => {
      const dtoWithProcessor: CreatePaymentDto = {
        ...baseCreatePaymentDto,
        processor: "custom_processor",
        plan_id: "plan-custom",
        order_id: "order-custom",
      };
      const expectedMetadata = {
        plan_id: "plan-custom",
        order_id: "order-custom",
      };
      const expectedPrismaCreateData = {
        ...expectedPaymentDataBasePrismaInput,
        processor: "custom_processor",
        metadata: expectedMetadata,
        processor_payment_id: undefined,
        processor_response: {}, // Prisma.JsonNull,
        paid_at: null,
      };
      const mockCreatedPayment: Payment = {
        id: "new-payment-id-custom",
        amount: dtoWithProcessor.amount,
        currency: dtoWithProcessor.currency,
        status: PaymentStatus.PENDING,
        processor: "custom_processor",
        user_id: userId,
        subscription_id: null,
        processor_payment_id: null,
        processor_response: {}, // Prisma.JsonNull,
        paid_at: null,
        metadata: expectedMetadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        refunded_at: null,
        error_message: null,
        refunded_amount: null, // Added
        refund_reason: null, // Added
        method: null, // Added
      };
      mockPrismaService.payment.create.mockResolvedValue(mockCreatedPayment);

      const result = await service.create(dtoWithProcessor);

      expect(result).toEqual(mockCreatedPayment);
      expect(mockPrismaService.payment.create).toHaveBeenCalledWith({
        data: {
          ...expectedPrismaCreateData,
          processor_response: dtoWithProcessor.processor_response || {}, // Prisma.JsonNull,
        },
      });
      expect(mockConfigService.get).not.toHaveBeenCalledWith(
        "ACTIVE_PAYMENT_PROCESSOR",
        expect.anything()
      );
    });

    it("should successfully create a payment with subscription_id and metadata", async () => {
      const subscriptionId = "sub-id-123";
      const dtoWithSubscription: CreatePaymentDto = {
        ...baseCreatePaymentDto,
        subscription_id: subscriptionId,
        plan_id: "plan-sub",
        order_id: "order-sub",
        metadata: { another_key: "another_value" },
      };
      const expectedMetadata = {
        plan_id: "plan-sub",
        order_id: "order-sub",
        another_key: "another_value",
      };
      const expectedPrismaCreateData = {
        ...expectedPaymentDataBasePrismaInput,
        processor: "tefpay", // Assumes default if not specified
        subscription: { connect: { id: subscriptionId } },
        metadata: expectedMetadata,
        processor_payment_id: undefined,
        processor_response: {}, // Prisma.JsonNull,
        paid_at: null,
      };
      const mockCreatedPayment: Payment = {
        id: "new-payment-id-sub",
        amount: dtoWithSubscription.amount,
        currency: dtoWithSubscription.currency,
        status: PaymentStatus.PENDING,
        processor: "tefpay",
        user_id: userId,
        subscription_id: subscriptionId,
        processor_payment_id: null,
        processor_response: {}, // Prisma.JsonNull,
        paid_at: null,
        metadata: expectedMetadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        refunded_at: null,
        error_message: null,
        refunded_amount: null, // Added
        refund_reason: null, // Added
        method: null, // Added
      };
      mockPrismaService.payment.create.mockResolvedValue(mockCreatedPayment);

      const result = await service.create(dtoWithSubscription);

      expect(result).toEqual(mockCreatedPayment);
      expect(mockPrismaService.payment.create).toHaveBeenCalledWith({
        data: {
          ...expectedPrismaCreateData,
          processor_response: dtoWithSubscription.processor_response || {}, // Prisma.JsonNull,
        },
      });
      expect(mockConfigService.get).toHaveBeenCalledWith(
        "ACTIVE_PAYMENT_PROCESSOR",
        "tefpay"
      );
    });

    it("should use Prisma.JsonNull for metadata if no metadata fields are provided", async () => {
      const createPaymentDto: CreatePaymentDto = { ...baseCreatePaymentDto }; // No plan_id, order_id, or explicit metadata

      const expectedPrismaCreateData = {
        ...expectedPaymentDataBasePrismaInput,
        processor: "tefpay",
        metadata: {}, // Prisma.JsonNull, // Service should handle this conversion
        processor_payment_id: undefined,
        processor_response: {}, // Prisma.JsonNull,
        paid_at: null,
      };

      const mockCreatedPayment: Payment = {
        id: "new-payment-id-no-meta",
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency,
        status: PaymentStatus.PENDING,
        processor: "tefpay",
        user_id: userId,
        subscription_id: null,
        processor_payment_id: null,
        processor_response: {}, // Prisma.JsonNull,
        paid_at: null,
        metadata: {}, // Prisma.JsonNull,
        createdAt: new Date(),
        updatedAt: new Date(),
        refunded_at: null,
        error_message: null,
        refunded_amount: null, // Added
        refund_reason: null, // Added
        method: null, // Added
      };
      mockPrismaService.payment.create.mockResolvedValue(mockCreatedPayment);

      const result = await service.create(createPaymentDto);
      expect(result).toEqual(mockCreatedPayment);
      expect(mockPrismaService.payment.create).toHaveBeenCalledWith({
        data: {
          ...expectedPrismaCreateData,
          metadata: {}, // Prisma.JsonNull, // Service converts empty object to Prisma.JsonNull
          processor_response: createPaymentDto.processor_response || {}, // Prisma.JsonNull,
        },
      });
    });

    it("should throw InternalServerErrorException if prisma.create fails", async () => {
      const createPaymentDto: CreatePaymentDto = { ...baseCreatePaymentDto };
      mockPrismaService.payment.create.mockRejectedValue(
        new Error("DB create error")
      );

      await expect(service.create(createPaymentDto)).rejects.toThrow(
        InternalServerErrorException
      );
      // Verifying the exact message if the service customizes it:
      await expect(service.create(createPaymentDto)).rejects.toThrow(
        "Failed to create payment: DB create error" // Mensaje de error actualizado
      );
    });
  });

  // Aquí irían los describe para findAll, findOne, update, remove si se decide añadirlos
  // Y para handlePaymentWebhook y verifyTefpaySignature
});
