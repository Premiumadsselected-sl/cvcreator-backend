import { Test, TestingModule } from "@nestjs/testing";
import { PaymentsModule } from "../../../src/payments/payments.module";
import { PaymentsService } from "../../../src/payments/payments.service";
import { TefpayService } from "../../../src/payments/tefpay/tefpay.service";
import { PAYMENT_PROCESSOR_TOKEN } from "../../../src/payments/payment-processor.token";
import { IPaymentProcessor } from "../../../src/payments/processors/payment-processor.interface";
import { ConfigService, ConfigModule } from "@nestjs/config";
import { HttpModule, HttpService } from "@nestjs/axios";
import { PrismaModule } from "../../../src/prisma/prisma.module";
import { SubscriptionsModule } from "../../../src/subscriptions/subscriptions.module";
import { UsersModule } from "../../../src/users/users.module";
import { PlansModule } from "../../../src/payments/plans/plans.module"; // RUTA ACTUALIZADA

// Mock de IPaymentProcessor para pruebas de la factoría
const mockTefpayService = {
  provide: TefpayService,
  useValue: {
    preparePaymentParameters: jest.fn().mockReturnValue({
      url: "mockTefpayUrl",
      fields: { tefpayField: "tefpayValue" },
      payment_processor_name: "tefpay",
    }),
    // Mockear otros métodos de TefpayService si son necesarios
  },
};

// Mock de un procesador alternativo (ej. Stripe)
const mockStripeService = {
  provide: "StripeService", // Usar un string o Symbol si StripeService no existe realmente
  useValue: {
    preparePaymentParameters: jest.fn().mockReturnValue({
      url: "mockStripeUrl",
      fields: { stripeField: "stripeValue" },
      payment_processor_name: "stripe",
    }),
  },
};

// Mock para HttpService
const mockHttpService = {
  get: jest.fn(),
  post: jest.fn(),
  // Añade otros métodos de HttpService que TefpayService pueda utilizar
};

describe("PaymentsModule", () => {
  let module: TestingModule;

  const compileModule = async (activeProcessorEnv?: string) => {
    return (
      Test.createTestingModule({
        imports: [
          PaymentsModule,
          // HttpModule no es necesario aquí si HttpService se mockea directamente
        ],
      })
        .overrideProvider(ConfigService)
        .useValue({
          get: jest.fn(
            <T = any>(
              key: string,
              defaultValue?: T
            ): T | string | undefined => {
              if (key === "ACTIVE_PAYMENT_PROCESSOR") {
                return activeProcessorEnv || defaultValue || "tefpay";
              }
              // Mockear otras claves de ConfigService si son necesarias para TefpayService o la factoría
              if (key === "TEFPAY_MERCHANT_CODE") return "test_code";
              if (key === "TEFPAY_PRIVATE_KEY") return "test_key";
              if (key === "TEFPAY_FORM_URL") return "http://tefpay.form.url";
              if (key === "TEFPAY_BACKOFFICE_URL")
                return "http://tefpay.backoffice.url";
              return defaultValue;
            }
          ),
        })
        .overrideProvider(HttpService) // Mockea HttpService
        .useValue(mockHttpService)
        // Si los servicios reales (TefpayService, etc.) tienen dependencias complejas (HttpService, PrismaService),
        // puede ser más fácil mockearlos directamente en el contexto del test del módulo.
        // .overrideProvider(TefpayService)
        // .useValue(mockTefpayService.useValue) // Usar el mock si es más simple
        .compile()
    );
  };

  it("should be defined", async () => {
    module = await compileModule();
    expect(module).toBeDefined();
  });

  it("should provide TefpayService as IPaymentProcessor when ACTIVE_PAYMENT_PROCESSOR is tefpay", async () => {
    module = await compileModule("tefpay");
    const paymentProcessor = module.get<IPaymentProcessor>(
      PAYMENT_PROCESSOR_TOKEN
    );
    const tefpayService = module.get<TefpayService>(TefpayService);
    expect(paymentProcessor).toBe(tefpayService); // Debe ser la misma instancia
    // Opcionalmente, verificar que es una instancia de TefpayService
    expect(paymentProcessor instanceof TefpayService).toBe(true);
  });

  it("should provide TefpayService as IPaymentProcessor when ACTIVE_PAYMENT_PROCESSOR is undefined (default)", async () => {
    module = await compileModule(); // Sin definir ACTIVE_PAYMENT_PROCESSOR, usa el default
    const paymentProcessor = module.get<IPaymentProcessor>(
      PAYMENT_PROCESSOR_TOKEN
    );
    const tefpayService = module.get<TefpayService>(TefpayService);
    expect(paymentProcessor).toBe(tefpayService);
    expect(paymentProcessor instanceof TefpayService).toBe(true);
  });

  it("should provide TefpayService (default) if ACTIVE_PAYMENT_PROCESSOR is an unsupported value", async () => {
    module = await compileModule("unsupported_processor");
    const paymentProcessor = module.get<IPaymentProcessor>(
      PAYMENT_PROCESSOR_TOKEN
    );
    const tefpayService = module.get<TefpayService>(TefpayService);
    // La lógica actual de la factoría devuelve TefpayService como fallback
    expect(paymentProcessor).toBe(tefpayService);
    expect(paymentProcessor instanceof TefpayService).toBe(true);
  });

  // Para probar un procesador alternativo (ej. Stripe), necesitarías:
  // 1. Crear una clase MockStripeService o una real simple que implemente IPaymentProcessor.
  // 2. Añadirla a los providers del PaymentsModule (o mockearla en el Test.createTestingModule si no está en el módulo real).
  // 3. Actualizar la factoría en PaymentsModule para que pueda devolver esta instancia.
  // 4. Escribir un test similar a los anteriores, pero con ACTIVE_PAYMENT_PROCESSOR='stripe'.

  // Ejemplo (asumiendo que StripeService está configurado en la factoría y provisto en el módulo de prueba):
  // it('should provide StripeService as IPaymentProcessor when ACTIVE_PAYMENT_PROCESSOR is stripe', async () => {
  //   // Necesitarías que StripeService esté disponible en el módulo de prueba
  //   // y que la factoría en PaymentsModule lo maneje.
  //   const moduleWithStripe = await Test.createTestingModule({
  //     imports: [PaymentsModule],
  //     providers: [StripeService], // Asegúrate que StripeService esté disponible
  //   })
  //   .overrideProvider(ConfigService)
  //   .useValue({
  //     get: jest.fn((key: string) => key === 'ACTIVE_PAYMENT_PROCESSOR' ? 'stripe' : null),
  //   })
  //   .compile();

  //   const paymentProcessor = moduleWithStripe.get<IPaymentProcessor>(PAYMENT_PROCESSOR_TOKEN);
  //   expect(paymentProcessor instanceof StripeService).toBe(true);
  // });

  // Test para asegurar que PaymentsService está disponible y se puede inyectar
  it("should provide PaymentsService", async () => {
    module = await compileModule();
    const paymentsService = module.get<PaymentsService>(PaymentsService);
    expect(paymentsService).toBeDefined();
  });
});
