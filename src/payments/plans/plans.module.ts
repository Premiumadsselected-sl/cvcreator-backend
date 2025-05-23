import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { PlansService } from "./plans.service";
// import { PlansController } from './plans.controller'; // Si tienes un controlador

@Module({
  imports: [PrismaModule],
  // controllers: [PlansController], // Si tienes un controlador
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
