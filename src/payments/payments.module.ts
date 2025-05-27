import { Module, forwardRef, Global } from "@nestjs/common"; // Import Global
import { HttpModule } from "@nestjs/axios";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PrismaModule } from "../prisma/prisma.module";
import { TefpayNotificationsService } from "./tefpay/notifications/notifications.service";
import { TefpayService } from "./tefpay/tefpay.service";
import { UsersModule } from "../users/users.module";
import { PlansModule } from "./plans/plans.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PAYMENT_PROCESSOR_TOKEN } from "./payment-processor.token";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";
import { NotificationsModule } from "./tefpay/notifications/notifications.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module"; // Added import

@Global() // Make the module global
@Module({
  imports: [
    PrismaModule,
    HttpModule,
    UsersModule,
    PlansModule,
    ConfigModule,
    AuditLogsModule,
    forwardRef(() => NotificationsModule), // Usar forwardRef aquí
    forwardRef(() => SubscriptionsModule), // Added forwardRef for SubscriptionsModule
  ],
  controllers: [PaymentsController],
  providers: [
    TefpayService,
    {
      provide: PAYMENT_PROCESSOR_TOKEN,
      useFactory: (
        configService: ConfigService,
        tefpayService: TefpayService
      ) => {
        const activeProcessor = configService.get<string>(
          "ACTIVE_PAYMENT_PROCESSOR",
          "tefpay"
        );

        if (activeProcessor === "tefpay") {
          return tefpayService;
        }
        // Aquí se podrían añadir otros procesadores en el futuro
        // Ejemplo:
        // else if (activeProcessor === "stripe") {
        //   return stripeService; // Suponiendo que stripeService está inyectado
        // }
        else {
          return tefpayService;
        }
      },
      inject: [ConfigService, TefpayService],
    },
    PaymentsService,
    TefpayNotificationsService,
  ],
  exports: [PaymentsService, TefpayService, PAYMENT_PROCESSOR_TOKEN],
})
export class PaymentsModule {}
