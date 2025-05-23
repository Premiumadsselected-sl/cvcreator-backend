import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PrismaModule } from "../prisma/prisma.module";
import { TefPayNotificationsController } from "./tefpay/notifications/notifications.controller";
import { TefPayNotificationsService } from "./tefpay/notifications/notifications.service";
import { TefpayService } from "./tefpay/tefpay.service";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { UsersModule } from "../users/users.module";
import { PlansModule } from "./plans/plans.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PAYMENT_PROCESSOR_TOKEN } from "./payment-processor.token";

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    SubscriptionsModule,
    UsersModule,
    PlansModule,
    ConfigModule,
  ],
  controllers: [PaymentsController, TefPayNotificationsController],
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
    TefPayNotificationsService,
  ],
  exports: [PaymentsService, TefpayService, PAYMENT_PROCESSOR_TOKEN],
})
export class PaymentsModule {}
