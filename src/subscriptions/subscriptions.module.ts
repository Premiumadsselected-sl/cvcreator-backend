import { Module } from "@nestjs/common";
import { SubscriptionsService } from "./subscriptions.service";
import { SubscriptionsController } from "./subscriptions.controller";
import { PrismaModule } from "../prisma/prisma.module"; // Asegúrate que PrismaModule esté exportado y sea global o importado aquí

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService], // Exportar si otros módulos necesitan este servicio
})
export class SubscriptionsModule {}
