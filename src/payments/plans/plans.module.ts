import { Module } from "@nestjs/common";
import { PlansService } from "./plans.service";
import { PlansController } from "./plans.controller";
import { PrismaModule } from "../../prisma/prisma.module"; // Asegúrate que PrismaService esté disponible

@Module({
  imports: [PrismaModule], // Importar PrismaModule si PlansService depende de PrismaService
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService], // Exportar PlansService si otros módulos lo necesitan directamente
})
export class PlansModule {}
