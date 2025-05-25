import { Test, TestingModule } from "@nestjs/testing";
import { PaymentsService } from "../../../src/payments/payments.service";
import { PrismaService } from "../../../src/prisma/prisma.service";
import { UsersService } from "../../../src/users/users.service";
import { SubscriptionsService } from "../../../src/subscriptions/subscriptions.service";
import { PlansService } from "../../../src/payments/plans/plans.service";
import { ConfigService } from "@nestjs/config";
import { AuditLogsService } from "../../../src/audit-logs/audit-logs.service";
import { PAYMENT_PROCESSOR_TOKEN } from "../../../src/payments/payment-processor.token";
import {
  IPaymentProcessor,
  ProcessedNotificationResponse,
} from "../../../src/payments/processors/payment-processor.interface"; // CORREGIDO: Usar IPaymentProcessor e importar ProcessedNotificationResponse

describe("PaymentsService", () => {
  let service: PaymentsService;
  let prismaServiceMock: Partial<PrismaService>;
  let usersServiceMock: Partial<UsersService>;
  let subscriptionsServiceMock: Partial<SubscriptionsService>;
  let plansServiceMock: Partial<PlansService>;
  let configServiceMock: Partial<ConfigService>;
  let auditLogsServiceMock: Partial<AuditLogsService>;
  // let paymentProcessorMock: Partial<PaymentProcessor>; // CORREGIDO: Usar IPaymentProcessor
  let paymentProcessorMock: Partial<IPaymentProcessor>;

  beforeEach(async () => {
    prismaServiceMock = {
      payment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      } as unknown as PrismaService["payment"],
      // Añadir otros mocks de prisma si son necesarios directamente por PaymentsService
    };
    usersServiceMock = {
      findOne: jest.fn(),
      update: jest.fn(),
    };
    subscriptionsServiceMock = {
      // findOneByUserIdAndPlanId: jest.fn(), // ELIMINADO: Método no existente en el servicio
      create: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      // findActiveSubscriptionByUserId: jest.fn(), // REEMPLAZADO por findActiveByUserId
      findActiveByUserId: jest.fn(), // CORREGIDO: Nombre correcto del método
      updateStatus: jest.fn(), // AÑADIDO: Método existente en el servicio y usado por PaymentsService
      findByPaymentId: jest.fn(), // AÑADIDO: Método existente en el servicio y usado por PaymentsService
    };
    plansServiceMock = {
      findOne: jest.fn(),
      findOneByName: jest.fn(),
    };
    configServiceMock = {
      get: jest.fn().mockImplementation((key: string) => {
        switch (key) {
          case "TEFPAY_MERCHANT_CODE":
            return "mock_merchant_code";
          case "TEFPAY_PRIVATE_KEY":
            return "mock_private_key";
          case "FRONTEND_URL":
            return "http://localhost:3000";
          case "APP_URL":
            return "http://localhost:3001"; // Usado en initiatePaymentFlow
          case "TEFPAY_WEBHOOK_SECRET": // Aunque no cause el error de constructor, es bueno tenerlo si otros tests lo usan
            return "mock_webhook_secret";
          case "TEFPAY_API_KEY": // Igual que arriba
            return "mock_tefpay_api_key";
          default:
            // Devolver null o undefined para claves no mockeadas explícitamente si es el comportamiento esperado.
            // El servicio usa '!' así que espera que las claves que pide existan.
            return undefined;
        }
      }),
    };
    auditLogsServiceMock = {
      create: jest.fn(),
    };
    paymentProcessorMock = {
      preparePaymentParameters: jest.fn(),
      // handleWebhook: jest.fn(), // CORREGIDO: Nombre correcto del método
      handleWebhookNotification: jest.fn(),
      verifySignature: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prismaServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
        { provide: SubscriptionsService, useValue: subscriptionsServiceMock },
        { provide: PlansService, useValue: plansServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: AuditLogsService, useValue: auditLogsServiceMock },
        { provide: PAYMENT_PROCESSOR_TOKEN, useValue: paymentProcessorMock },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // Casos de prueba para initiatePaymentFlow
  describe("initiatePaymentFlow", () => {
    // TODO: Añadir casos de prueba
  });

  // Casos de prueba para handleTefpayNotification
  describe("handleTefpayNotification", () => {
    // TODO: Añadir casos de prueba
  });

  // Casos de prueba para verifyTefpaySignature
  describe("verifyTefpaySignature", () => {
    // TODO: Añadir casos de prueba
  });

  // Otros casos de prueba para métodos auxiliares si es necesario
});
