import { Module } from "@nestjs/common";
import { SubscriptionsService } from "./subscriptions.service";
import { SubscriptionsController } from "./subscriptions.controller";
import { PrismaModule } from "../prisma/prisma.module"; // Asegúrate que PrismaModule esté exportado y sea global o importado aquí
import { AuditLogsModule } from "../audit-logs/audit-logs.module"; // Añadir importación

@Module({
  imports: [PrismaModule, AuditLogsModule], // Añadir AuditLogsModule a los imports
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
