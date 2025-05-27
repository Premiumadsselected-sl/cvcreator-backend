import { Module, forwardRef } from "@nestjs/common";
import { SubscriptionsService } from "./subscriptions.service";
import { SubscriptionsController } from "./subscriptions.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
    forwardRef(() => PaymentsModule), // Cambiado a forwardRef para PaymentsModule
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
