import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { PrismaModule } from "../prisma/prisma.module"; // AÑADIDO: Importar PrismaModule

@Module({
  imports: [PrismaModule], // AÑADIDO: Importar PrismaModule aquí
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService], // Export UsersService here
})
export class UsersModule {}
