import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../../../prisma/prisma.module";
import { TefpayNotificationsService } from "./notifications.service";
import { TefPayNotificationsController } from "./notifications.controller";
import { PaymentsModule } from "../../payments.module";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { AuditLogsModule } from "../../../audit-logs/audit-logs.module";

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    EventEmitterModule,
    forwardRef(() => PaymentsModule),
    AuditLogsModule,
  ],
  controllers: [TefPayNotificationsController],
  providers: [TefpayNotificationsService],
  exports: [TefpayNotificationsService],
})
export class NotificationsModule {}
