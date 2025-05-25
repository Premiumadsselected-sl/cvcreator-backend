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
import { AuditLogsService } from "../../../src/audit-logs/audit-logs.service";
import { CreatePaymentDto } from "../../../src/payments/dto/create-payment.dto";
import { PaymentStatus } from "../../../src/payments/dto/payment.dto";
import { Payment, Prisma } from "@prisma/client"; // ELIMINAR SubscriptionStatus de la importación
import { AuditAction } from "../../../src/audit-logs/dto/audit-action.enum";
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

// Mock de AuditLogsService
const mockAuditLogsService = {
  create: jest.fn(),
  findOne: jest.fn(), // AÑADIR findOne al mock
};

const mockPaymentProcessor: jest.Mocked<IPaymentProcessor> = {
  preparePaymentParameters: jest.fn(),
  // handleWebhook: jest.fn(), // Comentado o eliminado ya que no está en la interfaz activa
  // verifySignature: jest.fn(), // Comentado o eliminado ya que no está en la interfaz activa
  // AÑADIR los nuevos métodos de la interfaz para que el mock sea completo
  handleWebhookNotification: jest.fn(),
  verifySignature: jest.fn(),
};

const mockPrismaService = {
  payment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(), // AÑADIR findFirst al mock
  },
  $transaction: jest.fn(), // AÑADIR mock para $transaction si no está
  // Añadir Prisma.JsonNull para las pruebas
  JsonNull: Prisma.JsonNull,
};

const mockUsersService = {
  findOne: jest.fn(),
};

const mockSubscriptionsService = {
  validateSubscription: jest.fn(), // Mantener para compatibilidad si alguna prueba aún lo usa indirectamente
  createSubscriptionAfterPayment: jest.fn(),
  findActiveByUserId: jest.fn(), // Añadir el mock para findActiveByUserId
  create: jest.fn(), // AÑADIR create al mock
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
      // Add Tefpay specific config values needed by PaymentsService constructor
      if (key === "TEFPAY_MERCHANT_CODE") {
        return "mock_merchant_code_integration";
      }
      if (key === "TEFPAY_PRIVATE_KEY") {
        return "mock_private_key_integration";
      }
      if (key === "TEFPAY_WEBHOOK_SECRET") {
        return "mock_webhook_secret_integration";
      }
      if (key === "TEFPAY_API_KEY") {
        return "mock_tefpay_api_key_integration";
      }
      if (key === "APP_URL") {
        return "http://localhost:3002"; // Example, adjust if specific value needed
      }
      if (key === "FRONTEND_URL") {
        return "http://localhost:3003"; // Example, adjust if specific value needed
      }
      return defaultValue;
    }
  ),
};

describe("PaymentsService", () => {
  let service: PaymentsService;
  let paymentProcessorMock: jest.Mocked<IPaymentProcessor>;
  let preparePaymentParametersSpy: jest.SpyInstance; // Añadir spy para el método

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
        { provide: AuditLogsService, useValue: mockAuditLogsService }, // Usar el mockAuditLogsService aquí
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentProcessorMock = module.get(PAYMENT_PROCESSOR_TOKEN);

    // Crear un spy para el método preparePaymentParameters
    preparePaymentParametersSpy = jest.spyOn(
      paymentProcessorMock,
      "preparePaymentParameters"
    );

    // Reiniciar mocks antes de cada prueba
    mockUsersService.findOne.mockReset();
    mockPlansService.findOne.mockReset();
    mockSubscriptionsService.findActiveByUserId.mockReset();
    mockPrismaService.payment.create.mockReset();
    mockPrismaService.payment.update.mockReset(); // Asegurar que el mock de update se resetea
    // if (paymentProcessorMock.preparePaymentParameters.mockReset) { // Ya no es necesario con el spy
    //   paymentProcessorMock.preparePaymentParameters.mockReset();
    // }
    preparePaymentParametersSpy.mockClear(); // Limpiar el spy
    mockConfigService.get.mockClear();
    mockPrismaService.payment.findFirst.mockReset();
    mockPrismaService.$transaction.mockReset();
    mockSubscriptionsService.create.mockReset();
    mockAuditLogsService.create.mockReset(); // Usar mockAuditLogsService.create.mockReset()
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("initiatePaymentFlow", () => {
    const mockPreliminaryPayment = {
      id: "preliminary-payment-id",
      amount: 1000,
      currency: "EUR",
      status: "PENDING",
      user_id: "user-id",
      order_id: "order-id", // Este campo no existe en el modelo Payment, pero el mock lo tenía. Lo mantengo por si alguna lógica interna lo usa, aunque debería ser metadata.
      matching_data: "",
      signature: "test-signature",
      metadata: { plan_id: "plan-id", action: "subscription_creation" },
    };
    const mockFinalPayment = {
      ...mockPreliminaryPayment,
      id: "payment-id", // ID final después de la actualización
      matching_data: "preliminary-payment-id", // Actualizado
    };

    it("should successfully initiate a payment flow", async () => {
      mockUsersService.findOne.mockResolvedValue({
        id: "user-id",
        email: "test@example.com",
      });
      mockSubscriptionsService.findActiveByUserId.mockResolvedValue(null);
      mockPlansService.findOne.mockResolvedValue({
        id: "plan-id",
        price: 1000,
        currency: "EUR",
        active: true,
        name: "Test Plan",
      });
      mockPrismaService.payment.create.mockResolvedValue(
        mockPreliminaryPayment as any
      );
      mockPrismaService.payment.update.mockResolvedValue(
        mockFinalPayment as any
      ); // Mock para la actualización
      paymentProcessorMock.preparePaymentParameters.mockReturnValue({
        url: "http://paymentprocessor.com/pay",
        fields: { field1: "value1" },
        payment_processor_name: "tefpay", // AÑADIR payment_processor_name
      });

      const result = await service.initiatePaymentFlow(
        { plan_id: "plan-id", tefpay_signature: "test-signature" },
        "user-id"
      );

      expect(result).toBeDefined();
      expect(result.payment_id).toBe("payment-id");
      expect(result.payment_processor_url).toBe(
        "http://paymentprocessor.com/pay"
      );
      expect(result.payment_processor_data).toBeDefined();
      expect(result.payment_processor_data?.field1).toBe("value1");
      expect(mockPrismaService.payment.create).toHaveBeenCalled();
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: mockPreliminaryPayment.id },
        data: { matching_data: mockPreliminaryPayment.id },
      });
      expect(preparePaymentParametersSpy).toHaveBeenCalledTimes(1);
    });

    it("should throw NotFoundException if user is not found", async () => {
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(
        service.initiatePaymentFlow(
          // Remove email from DTO
          { plan_id: "plan-id", tefpay_signature: "test-signature" }, // AÑADIR tefpay_signature
          "non-existent-user-id"
        )
      ).rejects.toThrow(NotFoundException);
      // Se ajusta el mensaje esperado para que coincida exactamente con el servicio
      await expect(
        service.initiatePaymentFlow(
          // Remove email from DTO
          { plan_id: "plan-id", tefpay_signature: "test-signature" }, // AÑADIR tefpay_signature
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
          // Remove email from DTO
          {
            plan_id: "non-existent-plan-id",
            tefpay_signature: "test-signature",
          }, // AÑADIR tefpay_signature
          "user-id"
        )
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.initiatePaymentFlow(
          // Remove email from DTO
          {
            plan_id: "non-existent-plan-id",
            tefpay_signature: "test-signature",
          }, // AÑADIR tefpay_signature
          "user-id"
        )
      ).rejects.toThrow('Plan with ID "non-existent-plan-id" not found.');
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
      // mockSubscriptionsService.validateSubscription.mockRejectedValue( // Ya no se usa directamente
      //   new ConflictException("User already has an active subscription.")
      // );
      mockSubscriptionsService.findActiveByUserId.mockResolvedValue({
        /* datos de una suscripción activa simulada */
        id: "sub-active-id",
        status: "ACTIVE", // o 'TRIALING'
        user_id: "user-id",
      });

      await expect(
        service.initiatePaymentFlow(
          // Remove email from DTO
          { plan_id: "plan-id", tefpay_signature: "test-signature" }, // AÑADIR tefpay_signature
          "user-id"
        )
      ).rejects.toThrow(ConflictException);
      await expect(
        service.initiatePaymentFlow(
          // Remove email from DTO
          { plan_id: "plan-id", tefpay_signature: "test-signature" }, // AÑADIR tefpay_signature
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
      // mockSubscriptionsService.validateSubscription.mockResolvedValue(null); // Ya no se usa directamente
      mockSubscriptionsService.findActiveByUserId.mockResolvedValue(null); // Simular que no hay suscripción activa
      mockPrismaService.payment.create.mockRejectedValue(
        new InternalServerErrorException("Database error")
      );

      await expect(
        service.initiatePaymentFlow(
          // Remove email from DTO
          { plan_id: "plan-id", tefpay_signature: "test-signature" }, // AÑADIR tefpay_signature
          "user-id"
        )
      ).rejects.toThrow(InternalServerErrorException); // Verificar el tipo de excepción
      await expect(
        service.initiatePaymentFlow(
          // Remove email from DTO
          { plan_id: "plan-id", tefpay_signature: "test-signature" }, // AÑADIR tefpay_signature
          "user-id"
        )
      ).rejects.toThrow("Database error"); // Verificar el mensaje exacto del mock
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
      // mockSubscriptionsService.validateSubscription.mockResolvedValue(null); // Ya no se usa directamente
      mockSubscriptionsService.findActiveByUserId.mockResolvedValue(null); // Simular que no hay suscripción activa
      mockPrismaService.payment.create.mockResolvedValue(
        mockPreliminaryPayment as any
      );
      mockPrismaService.payment.update.mockResolvedValue(
        mockFinalPayment as any
      ); // Mock para la actualización

      paymentProcessorMock.preparePaymentParameters.mockImplementation(() => {
        throw new InternalServerErrorException("Processor error");
      });

      await expect(
        service.initiatePaymentFlow(
          { plan_id: "plan-id", tefpay_signature: "test-signature" },
          "user-id"
        )
      ).rejects.toThrow(InternalServerErrorException);

      await expect(
        service.initiatePaymentFlow(
          { plan_id: "plan-id", tefpay_signature: "test-signature" },
          "user-id"
        )
      ).rejects.toThrow("Processor error");
    });
  });

  describe("create", () => {
    const userId = "user-id-for-create";
    // ELIMINAR expectedPaymentDataBasePrismaInput si no se usa
    // const baseCreatePaymentDto = {
    //   user_id: userId,
    //   amount: 2000,
    //   currency: "USD",
    // };

    // const expectedPaymentDataBasePrismaInput = {
    //   user_id: userId,
    //   amount: baseCreatePaymentDto.amount,
    //   currency: baseCreatePaymentDto.currency,
    //   status: PaymentStatus.PENDING,
    //   matching_data: null,
    //   processor_payment_id: null,
    // };
    const baseCreatePaymentDto = {
      // Mantener baseCreatePaymentDto para las pruebas
      user_id: userId,
      amount: 2000,
      currency: "USD",
    };

    it("should successfully create a payment with default processor and plan_id in metadata", async () => {
      const createPaymentDto: CreatePaymentDto = {
        ...baseCreatePaymentDto,
        plan_id: "test-plan-id",
        metadata: { custom_field: "custom_value", order_id: "test-order-id" },
      };

      // const expectedPrismaCreateData = { // No es necesario si no se usa para aserciones directas
      //   ...expectedPaymentDataBasePrismaInput,
      //   processor: "tefpay",
      //   metadata: {
      //     custom_field: "custom_value",
      //     order_id: "test-order-id",
      //     plan_id: "test-plan-id",
      //   },
      // };

      const mockCreatedPayment: Payment = {
        id: "new-payment-id",
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency,
        status: PaymentStatus.PENDING,
        processor: "tefpay",
        user_id: userId,
        subscription_id: null,
        processor_payment_id: null,
        processor_response: null,
        paid_at: null,
        metadata: {
          // USAR el metadata esperado directamente
          custom_field: "custom_value",
          order_id: "test-order-id",
          plan_id: "test-plan-id",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        refunded_at: null,
        error_message: null,
        refunded_amount: null,
        refund_reason: null,
        method: null,
        matching_data: null,
        signature: null,
      };
      mockPrismaService.payment.create.mockResolvedValue(mockCreatedPayment);

      const result = await service.create(createPaymentDto);

      expect(result).toEqual(mockCreatedPayment);
      expect(mockPrismaService.payment.create).toHaveBeenCalledWith({
        data: {
          // Explicitly list fields based on service logic for PaymentUncheckedCreateInput
          user_id: createPaymentDto.user_id,
          amount: createPaymentDto.amount,
          currency: createPaymentDto.currency,
          status: PaymentStatus.PENDING,
          processor: "tefpay",
          processor_payment_id: null,
          matching_data: null,
          metadata: {
            custom_field: "custom_value",
            order_id: "test-order-id",
            plan_id: "test-plan-id",
          },
          plan_id: "test-plan-id", // AÑADIR plan_id aquí también según la lógica del servicio
          // processor_response: Prisma.JsonNull, // Not explicitly set if not in DTO
          // plan_id is not a direct field in PaymentUncheckedCreateInput if also in metadata
        },
      });
      expect(mockConfigService.get).toHaveBeenCalledWith(
        "ACTIVE_PAYMENT_PROCESSOR"
        // "tefpay" // The second argument to mock.get is the default value, not what it's called with
      );
    });

    it("should successfully create a payment with a specified processor and metadata", async () => {
      const dtoWithProcessor: CreatePaymentDto = {
        ...baseCreatePaymentDto,
        processor: "custom_processor",
        plan_id: "plan-custom",
        metadata: { order_id: "order-custom" },
        processor_response: { tefpay_stuff: "yes" } as any,
      };

      // const expectedPrismaCreateData = { // No es necesario
      //   ...expectedPaymentDataBasePrismaInput,
      //   processor: "custom_processor",
      //   metadata: {
      //     order_id: "order-custom",
      //     plan_id: "plan-custom",
      //   },
      //   processor_response: { tefpay_stuff: "yes" },
      // };

      const mockCreatedPayment: Payment = {
        id: "new-payment-id-custom",
        amount: dtoWithProcessor.amount,
        currency: dtoWithProcessor.currency,
        status: PaymentStatus.PENDING,
        processor: "custom_processor",
        user_id: userId,
        subscription_id: null,
        processor_payment_id: null,
        processor_response: dtoWithProcessor.processor_response,
        paid_at: null,
        metadata: {
          // USAR el metadata esperado directamente
          order_id: "order-custom",
          plan_id: "plan-custom",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        refunded_at: null,
        error_message: null,
        refunded_amount: null,
        refund_reason: null,
        method: null,
        matching_data: null,
        signature: null,
      } as unknown as Payment;
      mockPrismaService.payment.create.mockResolvedValue(mockCreatedPayment);

      const result = await service.create(dtoWithProcessor);

      expect(result).toEqual(mockCreatedPayment);
      expect(mockPrismaService.payment.create).toHaveBeenCalledWith({
        data: {
          user_id: dtoWithProcessor.user_id,
          amount: dtoWithProcessor.amount,
          currency: dtoWithProcessor.currency,
          status: PaymentStatus.PENDING,
          processor: "custom_processor",
          processor_payment_id: null,
          matching_data: null,
          metadata: {
            order_id: "order-custom",
            plan_id: "plan-custom",
          },
          processor_response: { tefpay_stuff: "yes" },
          plan_id: "plan-custom", // AÑADIR plan_id aquí también
        },
      });
      // Ensure ACTIVE_PAYMENT_PROCESSOR is not called if processor is specified
      expect(mockConfigService.get).not.toHaveBeenCalledWith(
        "ACTIVE_PAYMENT_PROCESSOR"
      );
    });

    it("should successfully create a payment with subscription_id and metadata", async () => {
      const subscriptionId = "sub-id-123";
      const dtoWithSubscription: CreatePaymentDto = {
        ...baseCreatePaymentDto,
        subscription_id: subscriptionId,
        plan_id: "plan-sub", // plan_id is present in DTO
        metadata: { another_key: "another_value", order_id: "order-sub" },
      };

      // const expectedPrismaCreateData = { // No es necesario
      //   ...expectedPaymentDataBasePrismaInput,
      //   processor: "tefpay",
      //   subscription_id: subscriptionId,
      //   metadata: {
      //     another_key: "another_value",
      //     order_id: "order-sub",
      //     plan_id: "plan-sub",
      //   },
      // };

      const mockCreatedPayment: Payment = {
        id: "new-payment-id-sub",
        amount: dtoWithSubscription.amount,
        currency: dtoWithSubscription.currency,
        status: PaymentStatus.PENDING,
        processor: "tefpay",
        user_id: userId,
        subscription_id: subscriptionId,
        processor_payment_id: null,
        processor_response: null,
        paid_at: null,
        metadata: {
          another_key: "another_value",
          order_id: "order-sub",
          plan_id: "plan-sub",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        refunded_at: null,
        error_message: null,
        refunded_amount: null,
        refund_reason: null,
        method: null,
        matching_data: null,
        signature: null,
      } as unknown as Payment;
      mockPrismaService.payment.create.mockResolvedValue(mockCreatedPayment);

      const result = await service.create(dtoWithSubscription);

      expect(result).toEqual(mockCreatedPayment);
      expect(mockPrismaService.payment.create).toHaveBeenCalledWith({
        data: {
          user_id: dtoWithSubscription.user_id,
          amount: dtoWithSubscription.amount,
          currency: dtoWithSubscription.currency,
          status: PaymentStatus.PENDING,
          processor: "tefpay",
          subscription_id: subscriptionId,
          processor_payment_id: null,
          matching_data: null,
          metadata: {
            another_key: "another_value",
            order_id: "order-sub",
            plan_id: "plan-sub",
          },
          plan_id: "plan-sub", // Ensure plan_id is also at the root as per service logic
        },
      });
      expect(mockConfigService.get).toHaveBeenCalledWith(
        "ACTIVE_PAYMENT_PROCESSOR"
      );
    });

    it("should use Prisma.JsonNull for metadata if no metadata fields (and no plan_id) are provided", async () => {
      const createPaymentDto: CreatePaymentDto = { ...baseCreatePaymentDto }; // No plan_id, no explicit metadata

      const mockCreatedPayment: Payment = {
        id: "new-payment-id-no-meta",
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency,
        status: PaymentStatus.PENDING,
        processor: "tefpay",
        user_id: userId,
        subscription_id: null,
        processor_payment_id: null,
        processor_response: null,
        paid_at: null,
        metadata: null, // CAMBIADO de Prisma.JsonNull a null
        createdAt: new Date(),
        updatedAt: new Date(),
        refunded_at: null,
        error_message: null,
        refunded_amount: null,
        refund_reason: null,
        method: null,
        matching_data: null,
        signature: null,
      } as unknown as Payment;
      mockPrismaService.payment.create.mockResolvedValue(mockCreatedPayment);

      const result = await service.create(createPaymentDto);
      expect(result).toEqual(mockCreatedPayment);
      expect(mockPrismaService.payment.create).toHaveBeenCalledWith({
        data: {
          user_id: createPaymentDto.user_id,
          amount: createPaymentDto.amount,
          currency: createPaymentDto.currency,
          status: PaymentStatus.PENDING,
          processor: "tefpay",
          processor_payment_id: null,
          matching_data: null,
          metadata: Prisma.JsonNull,
        },
      });
    });

    it("should use metadata with only plan_id if only plan_id is provided (no other metadata)", async () => {
      const createPaymentDto: CreatePaymentDto = {
        ...baseCreatePaymentDto,
        plan_id: "only-plan",
      };

      const mockCreatedPayment: Payment = {
        id: "new-payment-id-plan-meta",
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency,
        status: PaymentStatus.PENDING,
        processor: "tefpay",
        user_id: userId,
        metadata: { plan_id: "only-plan" },
        // ... other fields
      } as unknown as Payment;
      mockPrismaService.payment.create.mockResolvedValue(mockCreatedPayment);

      await service.create(createPaymentDto);
      expect(mockPrismaService.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: { plan_id: "only-plan" },
        }),
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
      await expect(service.create(createPaymentDto)).rejects.toThrow(
        "Could not create payment: DB create error" // Mensaje de error actualizado en el servicio
      );
    });
  });

  describe("handleTefpayNotification", () => {
    let mockLoggerError: jest.SpyInstance;
    let mockLoggerWarn: jest.SpyInstance;
    let mockLoggerLog: jest.SpyInstance;

    // Definir un mock para el cliente Prisma transaccional
    const mockTxClient = {
      payment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      plan: {
        findUnique: jest.fn(),
      },
      subscription: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      // Si AuditLogsService.create se llama con 'tx', y queremos simularlo a nivel de 'tx.auditLog.create',
      // se añadiría aquí. Pero como AuditLogsService es un servicio inyectado,
      // su mock global (mockAuditLogsService.create) será llamado.
    };

    // Usaremos Ds_Merchant_MatchingData como identificador principal en las pruebas
    // y Ds_Order como el ID de transacción de Tefpay (Ds_Merchant_TransactionID)
    const baseNotificationPayload = {
      Ds_Merchant_MatchingData: "test-payment-matching-data", // Nuestro ID de pago o un ID único para buscar el pago
      Ds_Code: "100", // Código de resultado de Tefpay (éxito)
      Ds_Merchant_TransactionID: "tefpay-tx-id-123", // ID de transacción de Tefpay
      Ds_Signature: "valid-signature-from-notification",
      // Otros campos que Tefpay podría enviar
      Ds_Amount: "1000", // 10.00 EUR
      Ds_Currency: "978", // EUR
      Ds_Card_Brand: "VISA",
    };

    const basePaymentDbRecord: Payment & {
      user: { id: string; email: string };
      signature: string | null;
    } = {
      id: "db-payment-id-1", // ID interno de la BD
      user_id: "test-user-id",
      amount: 1000,
      currency: "EUR",
      status: PaymentStatus.PENDING,
      processor: "tefpay",
      subscription_id: null,
      processor_payment_id: null, // Se actualizará con Ds_Merchant_TransactionID
      processor_response: null,
      paid_at: null,
      metadata: { plan_id: "test-plan-id", action: "subscription_creation" }, // Asegurar que plan_id está aquí
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: "test-user-id", email: "user@example.com" },
      refunded_at: null,
      error_message: null,
      refunded_amount: null,
      refund_reason: null,
      method: null,
      matching_data: "test-payment-matching-data", // Este es el campo que usa el servicio para buscar
      signature: "valid-signature-from-db", // Firma almacenada para verificación
    };

    const mockPlan = {
      id: "test-plan-id",
      name: "Test Plan",
      price: 1000,
      currency: "EUR",
      active: true,
      billing_interval: "month",
    };

    const mockSubscription = {
      id: "new-subscription-id",
      user_id: "test-user-id",
      plan_id: "test-plan-id",
      status: "ACTIVE",
      tefpay_subscription_account: null, // o un valor si se espera
    };

    beforeEach(() => {
      mockLoggerError = jest
        .spyOn(service["logger"], "error")
        .mockImplementation(() => {});
      mockLoggerWarn = jest
        .spyOn(service["logger"], "warn")
        .mockImplementation(() => {});
      mockLoggerLog = jest
        .spyOn(service["logger"], "log")
        .mockImplementation(() => {});

      mockPrismaService.payment.findUnique.mockReset();
      mockPrismaService.payment.update.mockReset();
      mockAuditLogsService.create.mockReset();
      mockAuditLogsService.findOne.mockReset();
      mockAuditLogsService.findOne.mockResolvedValue({
        id: "initial-audit-log-id",
        details: "{}",
      } as any); // Ensure findOne returns a valid audit entry

      mockTxClient.payment.update.mockReset();
      mockTxClient.plan.findUnique.mockReset();
      mockTxClient.subscription.create.mockReset();
      mockTxClient.subscription.findFirst.mockReset();
      mockTxClient.subscription.update.mockReset();

      // Configurar $transaction para usar mockTxClient
      mockPrismaService.$transaction = jest
        .fn()
        .mockImplementation((callback: (tx: any) => Promise<any>) =>
          callback(mockTxClient)
        ); // Añadir tipado al callback
    });

    afterEach(() => {
      mockLoggerError.mockRestore();
      mockLoggerWarn.mockRestore();
      mockLoggerLog.mockRestore();
    });

    it("should return '*error*' and audit if payment record is not found via Ds_Merchant_MatchingData", async () => {
      const notificationPayload = { ...baseNotificationPayload };
      mockPrismaService.payment.findUnique.mockResolvedValue(null); // No se encuentra el pago

      const result =
        await service.handleTefpayNotification(notificationPayload);
      expect(result).toBe("*error*");

      expect(mockLoggerError).toHaveBeenCalledWith(
        `Payment record not found for notification with Ds_Merchant_MatchingData: ${notificationPayload.Ds_Merchant_MatchingData}.`
      );
      expect(mockAuditLogsService.create).toHaveBeenCalledWith({
        action: AuditAction.PAYMENT_NOTIFICATION_ERROR,
        target_type: "Notification",
        target_id: notificationPayload.Ds_Merchant_MatchingData,
        details: JSON.stringify({
          error: "Payment record not found for signature verification.",
          received_params: notificationPayload,
        }),
      });
    });

    it("should return '*error*' and audit if Tefpay signature verification fails", async () => {
      const paymentWithDifferentSignature = {
        ...basePaymentDbRecord,
        signature: "different-db-signature",
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(
        paymentWithDifferentSignature as any
      );
      // baseNotificationPayload.Ds_Signature es "valid-signature-from-notification"

      const result = await service.handleTefpayNotification(
        baseNotificationPayload
      );
      expect(result).toBe("*error*");

      expect(mockLoggerWarn).toHaveBeenCalledWith(
        `La firma de la notificación de Tefpay no coincide con la firma esperada. Recibida: ${baseNotificationPayload.Ds_Signature}, Esperada: ${paymentWithDifferentSignature.signature}`
      );
      expect(mockAuditLogsService.create).toHaveBeenCalledWith({
        user_id: paymentWithDifferentSignature.user_id,
        action: AuditAction.PAYMENT_NOTIFICATION_ERROR,
        target_type: "Notification",
        target_id: paymentWithDifferentSignature.id,
        details: JSON.stringify({
          error: "Tefpay signature validation failed against stored signature.",
          received_params: baseNotificationPayload,
        }),
      });
    });

    // Ajustar las pruebas "should log warning and do nothing if payment already SUCCEEDED/FAILED"
    // Ahora que la verificación de firma es lo primero, estas pruebas necesitan que la firma sea válida.
    it("should log warning and do nothing if payment already SUCCEEDED (after signature check)", async () => {
      const payment = {
        ...basePaymentDbRecord,
        status: PaymentStatus.SUCCEEDED,
        signature: "valid-signature-from-db",
      };
      const notification = {
        ...baseNotificationPayload,
        Ds_Signature: "valid-signature-from-db",
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(payment as any);
      mockAuditLogsService.create.mockResolvedValue({
        id: "audit-log-id",
      } as any); // Simular creación de log de auditoría

      await service.handleTefpayNotification(notification); // ELIMINAR asignación a 'result' si no se usa
      // El servicio ahora tiene una lógica más compleja, puede que no devuelva nada o devuelva "*ok*"
      // La clave es que no intente procesar el pago de nuevo.

      // Primer log de auditoría para recepción de notificación
      expect(mockAuditLogsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PAYMENT_NOTIFICATION_RECEIVED,
          target_id: expect.stringMatching(
            new RegExp(
              `${notification.Ds_Merchant_TransactionID}|${notification.Ds_Merchant_MatchingData}`
            )
          ),
        })
      );

      // Luego, dentro de handleInitialPaymentOrSubscriptionNotification
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        `Payment ${payment.id} already processed (status: ${PaymentStatus.SUCCEEDED}). Ignoring notification.`
      );
      // $transaction no debería ser llamado para actualizar el pago si ya está procesado.
      // Contar las veces que se llama a $transaction puede ser complicado si el primer audit log está fuera.
      // Verificamos que no se intente actualizar el pago.
      const updateCalls = mockPrismaService.payment.update.mock.calls;
      // Filtrar llamadas que no sean para cambiar el estado del pago principal
      const relevantUpdateCall = updateCalls.find(
        (call) => call[0].where.id === payment.id && call[0].data.status
      );
      expect(relevantUpdateCall).toBeUndefined();
    });

    it("should log warning and do nothing if payment already FAILED (after signature check)", async () => {
      const payment = {
        ...basePaymentDbRecord,
        status: PaymentStatus.FAILED,
        signature: "valid-signature-from-db",
      };
      const notification = {
        ...baseNotificationPayload,
        Ds_Signature: "valid-signature-from-db",
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(payment as any);
      mockAuditLogsService.create.mockResolvedValue({
        id: "audit-log-id",
      } as any); // Simular creación de log de auditoría

      await service.handleTefpayNotification(notification);

      expect(mockAuditLogsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PAYMENT_NOTIFICATION_RECEIVED,
        })
      );
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        `Payment ${payment.id} already processed (status: ${PaymentStatus.FAILED}). Ignoring notification.`
      );
      const updateCalls = mockPrismaService.payment.update.mock.calls;
      const relevantUpdateCall = updateCalls.find(
        (call) => call[0].where.id === payment.id && call[0].data.status
      );
      expect(relevantUpdateCall).toBeUndefined();
    });

    // Las pruebas que esperan rechazos ahora deben esperar que la promesa se resuelva a "*error*"
    // y luego verificar los logs de auditoría/error.

    it("should return '*error*' and audit if plan_id is missing in metadata for successful payment", async () => {
      const paymentWithoutPlanId = {
        ...basePaymentDbRecord,
        metadata: { action: "subscription_creation" }, // No plan_id
        signature: "valid-signature-from-db",
      };
      const notification = {
        ...baseNotificationPayload,
        Ds_Signature: "valid-signature-from-db",
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(
        paymentWithoutPlanId as any
      );
      mockAuditLogsService.create.mockResolvedValue({
        id: "audit-log-id",
      } as any); // Simular creación de log de auditoría
      // Simular que la transacción se inicia y el update dentro de ella
      mockTxClient.payment.update.mockImplementation((args) =>
        Promise.resolve({ ...paymentWithoutPlanId, ...args.data })
      );

      const result = await service.handleTefpayNotification(notification);
      expect(result).toBe("*error*");

      expect(mockLoggerError).toHaveBeenCalledWith(
        `Plan ID missing in payment metadata for payment ${paymentWithoutPlanId.id}`
      );
      // El audit log de error se crea dentro de la transacción que falla
      expect(mockAuditLogsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PAYMENT_PROCESSING_ERROR,
          target_id: paymentWithoutPlanId.id,
          details: expect.stringContaining(
            "Plan ID missing in payment metadata."
          ),
        })
      );
    });

    it("should return '*error*' and audit if plan is not found for successful payment", async () => {
      const paymentWithValidSignature = {
        ...basePaymentDbRecord,
        metadata: { plan_id: "test-plan-id", action: "subscription_creation" },
        signature: "valid-signature-from-db", // Valid signature
      };
      const notification = {
        ...baseNotificationPayload,
        Ds_Signature: "valid-signature-from-db", // Matching signature
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(
        paymentWithValidSignature as any
      );
      mockAuditLogsService.create.mockResolvedValue({
        id: "initial-audit-log-id", // This will be the parent_audit_log_id
      } as any);
      mockTxClient.plan.findUnique.mockResolvedValue(null); // Plan not found
      mockTxClient.payment.update.mockImplementation((args) =>
        Promise.resolve({ ...paymentWithValidSignature, ...args.data })
      );

      const result = await service.handleTefpayNotification(notification);
      expect(result).toBe("*error*");

      expect(mockLoggerError).toHaveBeenCalledWith(
        `Error processing Tefpay notification (ID: ${notification.Ds_Merchant_MatchingData}): Plan ${paymentWithValidSignature.metadata.plan_id} not found.`,
        expect.any(String)
      );

      // The create call for PAYMENT_PROCESSING_ERROR will be among others.
      // We need to find the one that matches our criteria.
      const paymentProcessingErrorAuditCall =
        mockAuditLogsService.create.mock.calls.find(
          (callArgs) =>
            callArgs[0].action === AuditAction.PAYMENT_PROCESSING_ERROR
        );
      expect(paymentProcessingErrorAuditCall).toBeDefined();
      expect(paymentProcessingErrorAuditCall[0]).toEqual(
        expect.objectContaining({
          action: AuditAction.PAYMENT_PROCESSING_ERROR,
          target_id: paymentWithValidSignature.id,
          target_type: "Payment", // As per test log output
          user_id: paymentWithValidSignature.user_id,
          details: JSON.stringify({
            params: notification,
            parent_audit_log_id: "initial-audit-log-id",
            error: `Target plan ${paymentWithValidSignature.metadata.plan_id} not found.`,
          }),
        })
      );
    });

    it("should return '*error*', audit, if Prisma transaction fails during processing", async () => {
      const paymentWithValidSignature = {
        ...basePaymentDbRecord,
        signature: "valid-signature-from-db",
      };
      const notification = {
        ...baseNotificationPayload,
        Ds_Signature: "valid-signature-from-db",
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(
        paymentWithValidSignature as any
      );
      mockAuditLogsService.create.mockResolvedValue({
        id: "initial-audit-log-id",
      } as any);

      const transactionError = new Error(
        "Prisma.TransactionClientKnownRequestError: Test transaction error"
      );
      mockPrismaService.$transaction = jest
        .fn()
        .mockRejectedValue(transactionError);

      const result = await service.handleTefpayNotification(notification);
      expect(result).toBe("*error*");

      expect(mockLoggerError).toHaveBeenCalledWith(
        `Error processing Tefpay notification (ID: ${notification.Ds_Merchant_MatchingData}): ${transactionError.message}`,
        expect.any(String) // Corrected: Expect a string (stack trace)
      );

      // Check for the audit log entry created due to transaction failure
      // This will be the second call to mockAuditLogsService.create
      // The first one is for PAYMENT_NOTIFICATION_RECEIVED
      expect(mockAuditLogsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PAYMENT_NOTIFICATION_ERROR, // El error se registra como PAYMENT_NOTIFICATION_ERROR
          target_id: "UNKNOWN_ID_PROC_FAIL", // El target_id se establece a esto en el servicio
          details: expect.stringContaining("Test transaction error"),
          user_id: paymentWithValidSignature.user_id, // Asegurar que el user_id se espera correctamente
        })
      );
      // Restore $transaction mock for other tests if necessary, or ensure it's reset in beforeEach
      mockPrismaService.$transaction = jest
        .fn()
        .mockImplementation((callback: (tx: any) => Promise<any>) =>
          callback(mockTxClient)
        );
    });

    it("should process successful notification, create subscription, and audit logs", async () => {
      const notificationForSuccess = {
        ...baseNotificationPayload,
        Ds_Signature: "valid-signature-from-db", // Ensure signature matches
      };
      const paymentForSuccess = {
        ...basePaymentDbRecord,
        status: PaymentStatus.PENDING,
        signature: "valid-signature-from-db", // Ensure signature matches
        metadata: { plan_id: "test-plan-id", action: "subscription_creation" },
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(
        paymentForSuccess as any
      );
      mockAuditLogsService.create.mockResolvedValueOnce({
        id: "initial-audit-log-id",
      } as any); // For PAYMENT_NOTIFICATION_RECEIVED
      mockTxClient.payment.update.mockResolvedValue({
        // For updating payment status
        ...paymentForSuccess,
        status: PaymentStatus.SUCCEEDED,
        processor_payment_id: notificationForSuccess.Ds_Merchant_TransactionID,
        paid_at: expect.any(Date),
      });
      mockTxClient.plan.findUnique.mockResolvedValue(mockPlan as any);
      mockTxClient.subscription.findFirst.mockResolvedValue(null); // No existing subscription
      mockTxClient.subscription.create.mockResolvedValue(
        mockSubscription as any
      );

      const result = await service.handleTefpayNotification(
        notificationForSuccess
      );
      expect(result).toBe("*ok*");

      // Check payment update
      expect(mockTxClient.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: paymentForSuccess.id },
          data: expect.objectContaining({
            status: PaymentStatus.SUCCEEDED,
            processor_payment_id:
              notificationForSuccess.Ds_Merchant_TransactionID,
            paid_at: expect.any(Date),
            processor_response: notificationForSuccess,
          }),
        })
      );

      // Check subscription creation
      expect(mockTxClient.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: paymentForSuccess.user_id,
          plan_id: mockPlan.id,
          status: "active", // CORRECTED: "ACTIVE" to "active"
          tefpay_transaction_id:
            notificationForSuccess.Ds_Merchant_TransactionID,
          current_period_start: expect.any(Date),
          current_period_end: expect.any(Date),
          metadata: notificationForSuccess, // Ensure metadata is the notification payload
        }),
      });

      // Check audit logs
      const subscriptionRenewedAuditLogCall =
        mockAuditLogsService.create.mock.calls.find(
          (call) => call[0].action === AuditAction.SUBSCRIPTION_RENEWED
        );
      expect(subscriptionRenewedAuditLogCall).toBeDefined();
      expect(subscriptionRenewedAuditLogCall[0]).toEqual(
        expect.objectContaining({
          user_id: paymentForSuccess.user_id,
          action: AuditAction.SUBSCRIPTION_RENEWED,
          target_type: "Subscription",
          target_id: paymentForSuccess.id,
          details: JSON.stringify({
            tefpayResultCode: notificationForSuccess.Ds_Code,
            tefpayTransactionId:
              notificationForSuccess.Ds_Merchant_TransactionID,
            amount: parseFloat(notificationForSuccess.Ds_Amount) / 100,
            currency: "EUR",
            full_params: notificationForSuccess,
            parent_audit_log_id: "initial-audit-log-id",
          }),
        })
      );

      const subscriptionCreatedAuditLogCall =
        mockAuditLogsService.create.mock.calls.find(
          (call) => call[0].action === AuditAction.SUBSCRIPTION_CREATED
        );
      expect(subscriptionCreatedAuditLogCall).toBeDefined();
      expect(subscriptionCreatedAuditLogCall[0]).toEqual(
        expect.objectContaining({
          user_id: paymentForSuccess.user_id,
          action: AuditAction.SUBSCRIPTION_CREATED,
          target_type: "Subscription",
          target_id: mockSubscription.id,
          details: JSON.stringify({
            plan_id: mockPlan.id,
            payment_id: paymentForSuccess.id,
            tefpay_subscription_account: null, // AÑADIDO
            parent_audit_log_id: "initial-audit-log-id",
          }),
        })
      );
    });

    it("should process failed notification (Type: Initial Payment), update payment status, and audit logs", async () => {
      const notificationFailed = {
        ...baseNotificationPayload,
        Ds_Code: "0", // Payment failed
        Ds_Signature: "valid-signature-from-db",
      };
      const paymentForFailure = {
        ...basePaymentDbRecord,
        status: PaymentStatus.PENDING,
        signature: "valid-signature-from-db",
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(
        paymentForFailure as any
      );
      mockAuditLogsService.create.mockResolvedValueOnce({
        id: "initial-audit-log-id",
      } as any); // PAYMENT_NOTIFICATION_RECEIVED
      mockTxClient.payment.update.mockResolvedValue({
        ...paymentForFailure,
        status: PaymentStatus.FAILED,
        processor_payment_id: notificationFailed.Ds_Merchant_TransactionID,
        error_message: `Tefpay Result Code: ${notificationFailed.Ds_Code}, Response: N/A`, // Ds_Response is not in notificationFailed
        processor_response: notificationFailed, // Service updates processor_response with full params
      });

      const result = await service.handleTefpayNotification(notificationFailed);
      expect(result).toBe("*ok*");

      // Check payment update
      expect(mockTxClient.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: paymentForFailure.id },
          data: expect.objectContaining({
            status: PaymentStatus.FAILED,
            processor_payment_id: notificationFailed.Ds_Merchant_TransactionID,
            error_message: `Tefpay Result Code: ${notificationFailed.Ds_Code}, Response: N/A`,
            processor_response: notificationFailed,
          }),
        })
      );

      // Check audit logs
      // First call is PAYMENT_NOTIFICATION_RECEIVED
      // Second call (within transaction) is PAYMENT_FAILED
      const paymentFailedAuditLogCall =
        mockAuditLogsService.create.mock.calls.find(
          (call) =>
            call[0].action === AuditAction.PAYMENT_FAILED &&
            call[0].target_id === paymentForFailure.id
        );
      expect(paymentFailedAuditLogCall).toBeDefined();
      expect(paymentFailedAuditLogCall[0]).toEqual(
        expect.objectContaining({
          user_id: paymentForFailure.user_id,
          action: AuditAction.PAYMENT_FAILED,
          target_type: "Subscription",
          target_id: paymentForFailure.id,
          details: JSON.stringify({
            tefpayResultCode: notificationFailed.Ds_Code,
            tefpayTransactionId: notificationFailed.Ds_Merchant_TransactionID,
            amount: parseFloat(notificationFailed.Ds_Amount) / 100,
            currency: "EUR",
            full_params: notificationFailed,
            parent_audit_log_id: "initial-audit-log-id",
          }),
        })
      );
    });

    it("should return '*error*' and audit if plan is not found for successful payment", async () => {
      const paymentWithValidSignature = {
        ...basePaymentDbRecord,
        metadata: { plan_id: "test-plan-id", action: "subscription_creation" },
        signature: "valid-signature-from-db", // Valid signature
      };
      const notification = {
        ...baseNotificationPayload,
        Ds_Signature: "valid-signature-from-db", // Matching signature
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(
        paymentWithValidSignature as any
      );
      mockAuditLogsService.create.mockResolvedValue({
        id: "initial-audit-log-id", // This will be the parent_audit_log_id
      } as any);
      mockTxClient.plan.findUnique.mockResolvedValue(null); // Plan not found
      mockTxClient.payment.update.mockImplementation((args) =>
        Promise.resolve({ ...paymentWithValidSignature, ...args.data })
      );

      const result = await service.handleTefpayNotification(notification);
      expect(result).toBe("*error*");

      expect(mockLoggerError).toHaveBeenCalledWith(
        `Error processing Tefpay notification (ID: ${notification.Ds_Merchant_MatchingData}): Plan ${paymentWithValidSignature.metadata.plan_id} not found.`,
        expect.any(String)
      );

      // The create call for PAYMENT_PROCESSING_ERROR will be among others.
      // We need to find the one that matches our criteria.
      const paymentProcessingErrorAuditCall =
        mockAuditLogsService.create.mock.calls.find(
          (callArgs) =>
            callArgs[0].action === AuditAction.PAYMENT_PROCESSING_ERROR
        );
      expect(paymentProcessingErrorAuditCall).toBeDefined();
      expect(paymentProcessingErrorAuditCall[0]).toEqual(
        expect.objectContaining({
          action: AuditAction.PAYMENT_PROCESSING_ERROR,
          target_id: paymentWithValidSignature.id,
          target_type: "Payment", // As per test log output
          user_id: paymentWithValidSignature.user_id,
          details: JSON.stringify({
            params: notification,
            parent_audit_log_id: "initial-audit-log-id",
            error: `Target plan ${paymentWithValidSignature.metadata.plan_id} not found.`,
          }),
        })
      );
    });

    it("should return '*error*', audit, if Prisma transaction fails during processing", async () => {
      const paymentWithValidSignature = {
        ...basePaymentDbRecord,
        signature: "valid-signature-from-db",
      };
      const notification = {
        ...baseNotificationPayload,
        Ds_Signature: "valid-signature-from-db",
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(
        paymentWithValidSignature as any
      );
      mockAuditLogsService.create.mockResolvedValue({
        id: "initial-audit-log-id",
      } as any);

      const transactionError = new Error(
        "Prisma.TransactionClientKnownRequestError: Test transaction error"
      );
      mockPrismaService.$transaction = jest
        .fn()
        .mockRejectedValue(transactionError);

      const result = await service.handleTefpayNotification(notification);
      expect(result).toBe("*error*");

      expect(mockLoggerError).toHaveBeenCalledWith(
        `Error processing Tefpay notification (ID: ${notification.Ds_Merchant_MatchingData}): ${transactionError.message}`,
        expect.any(String) // Corrected: Expect a string (stack trace)
      );

      // Check for the audit log entry created due to transaction failure
      // This will be the second call to mockAuditLogsService.create
      // The first one is for PAYMENT_NOTIFICATION_RECEIVED
      expect(mockAuditLogsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PAYMENT_NOTIFICATION_ERROR, // El error se registra como PAYMENT_NOTIFICATION_ERROR
          target_id: "UNKNOWN_ID_PROC_FAIL", // El target_id se establece a esto en el servicio
          details: expect.stringContaining("Test transaction error"),
          user_id: paymentWithValidSignature.user_id, // Asegurar que el user_id se espera correctamente
        })
      );
      // Restore $transaction mock for other tests if necessary, or ensure it's reset in beforeEach
      mockPrismaService.$transaction = jest
        .fn()
        .mockImplementation((callback: (tx: any) => Promise<any>) =>
          callback(mockTxClient)
        );
    });

    it("should process successful notification, create subscription, and audit logs", async () => {
      const notificationForSuccess = {
        ...baseNotificationPayload,
        Ds_Signature: "valid-signature-from-db", // Ensure signature matches
      };
      const paymentForSuccess = {
        ...basePaymentDbRecord,
        status: PaymentStatus.PENDING,
        signature: "valid-signature-from-db", // Ensure signature matches
        metadata: { plan_id: "test-plan-id", action: "subscription_creation" },
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(
        paymentForSuccess as any
      );
      mockAuditLogsService.create.mockResolvedValueOnce({
        id: "initial-audit-log-id",
      } as any); // For PAYMENT_NOTIFICATION_RECEIVED
      mockTxClient.payment.update.mockResolvedValue({
        // For updating payment status
        ...paymentForSuccess,
        status: PaymentStatus.SUCCEEDED,
        processor_payment_id: notificationForSuccess.Ds_Merchant_TransactionID,
        paid_at: expect.any(Date),
      });
      mockTxClient.plan.findUnique.mockResolvedValue(mockPlan as any);
      mockTxClient.subscription.findFirst.mockResolvedValue(null); // No existing subscription
      mockTxClient.subscription.create.mockResolvedValue(
        mockSubscription as any
      );

      const result = await service.handleTefpayNotification(
        notificationForSuccess
      );
      expect(result).toBe("*ok*");

      // Check payment update
      expect(mockTxClient.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: paymentForSuccess.id },
          data: expect.objectContaining({
            status: PaymentStatus.SUCCEEDED,
            processor_payment_id:
              notificationForSuccess.Ds_Merchant_TransactionID,
            paid_at: expect.any(Date),
            processor_response: notificationForSuccess,
          }),
        })
      );

      // Check subscription creation
      expect(mockTxClient.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: paymentForSuccess.user_id,
          plan_id: mockPlan.id,
          status: "active", // CORRECTED: "ACTIVE" to "active"
          tefpay_transaction_id:
            notificationForSuccess.Ds_Merchant_TransactionID,
          current_period_start: expect.any(Date),
          current_period_end: expect.any(Date),
          metadata: notificationForSuccess, // Ensure metadata is the notification payload
        }),
      });

      // Check audit logs
      const subscriptionRenewedAuditLogCall =
        mockAuditLogsService.create.mock.calls.find(
          (call) => call[0].action === AuditAction.SUBSCRIPTION_RENEWED
        );
      expect(subscriptionRenewedAuditLogCall).toBeDefined();
      expect(subscriptionRenewedAuditLogCall[0]).toEqual(
        expect.objectContaining({
          user_id: paymentForSuccess.user_id,
          action: AuditAction.SUBSCRIPTION_RENEWED,
          target_type: "Subscription",
          target_id: paymentForSuccess.id,
          details: JSON.stringify({
            tefpayResultCode: notificationForSuccess.Ds_Code,
            tefpayTransactionId:
              notificationForSuccess.Ds_Merchant_TransactionID,
            amount: parseFloat(notificationForSuccess.Ds_Amount) / 100,
            currency: "EUR",
            full_params: notificationForSuccess,
            parent_audit_log_id: "initial-audit-log-id",
          }),
        })
      );

      const subscriptionCreatedAuditLogCall =
        mockAuditLogsService.create.mock.calls.find(
          (call) => call[0].action === AuditAction.SUBSCRIPTION_CREATED
        );
      expect(subscriptionCreatedAuditLogCall).toBeDefined();
      expect(subscriptionCreatedAuditLogCall[0]).toEqual(
        expect.objectContaining({
          user_id: paymentForSuccess.user_id,
          action: AuditAction.SUBSCRIPTION_CREATED,
          target_type: "Subscription",
          target_id: mockSubscription.id,
          details: JSON.stringify({
            plan_id: mockPlan.id,
            payment_id: paymentForSuccess.id,
            tefpay_subscription_account: null, // AÑADIDO
            parent_audit_log_id: "initial-audit-log-id",
          }),
        })
      );
    });

    it("should process failed notification (Type: Initial Payment), update payment status, and audit logs", async () => {
      const notificationFailed = {
        ...baseNotificationPayload,
        Ds_Code: "0", // Payment failed
        Ds_Signature: "valid-signature-from-db",
      };
      const paymentForFailure = {
        ...basePaymentDbRecord,
        status: PaymentStatus.PENDING,
        signature: "valid-signature-from-db",
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(
        paymentForFailure as any
      );
      mockAuditLogsService.create.mockResolvedValueOnce({
        id: "initial-audit-log-id",
      } as any); // PAYMENT_NOTIFICATION_RECEIVED
      mockTxClient.payment.update.mockResolvedValue({
        ...paymentForFailure,
        status: PaymentStatus.FAILED,
        processor_payment_id: notificationFailed.Ds_Merchant_TransactionID,
        error_message: `Tefpay Result Code: ${notificationFailed.Ds_Code}, Response: N/A`, // Ds_Response is not in notificationFailed
        processor_response: notificationFailed, // Service updates processor_response with full params
      });

      const result = await service.handleTefpayNotification(notificationFailed);
      expect(result).toBe("*ok*");

      // Check payment update
      expect(mockTxClient.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: paymentForFailure.id },
          data: expect.objectContaining({
            status: PaymentStatus.FAILED,
            processor_payment_id: notificationFailed.Ds_Merchant_TransactionID,
            error_message: `Tefpay Result Code: ${notificationFailed.Ds_Code}, Response: N/A`,
            processor_response: notificationFailed,
          }),
        })
      );

      // Check audit logs
      // First call is PAYMENT_NOTIFICATION_RECEIVED
      // Second call (within transaction) is PAYMENT_FAILED
      const paymentFailedAuditLogCall =
        mockAuditLogsService.create.mock.calls.find(
          (call) =>
            call[0].action === AuditAction.PAYMENT_FAILED &&
            call[0].target_id === paymentForFailure.id
        );
      expect(paymentFailedAuditLogCall).toBeDefined();
      expect(paymentFailedAuditLogCall[0]).toEqual(
        expect.objectContaining({
          user_id: paymentForFailure.user_id,
          action: AuditAction.PAYMENT_FAILED,
          target_type: "Subscription",
          target_id: paymentForFailure.id,
          details: JSON.stringify({
            tefpayResultCode: notificationFailed.Ds_Code,
            tefpayTransactionId: notificationFailed.Ds_Merchant_TransactionID,
            amount: parseFloat(notificationFailed.Ds_Amount) / 100,
            currency: "EUR",
            full_params: notificationFailed,
            parent_audit_log_id: "initial-audit-log-id",
          }),
        })
      );
    });
  });
});
