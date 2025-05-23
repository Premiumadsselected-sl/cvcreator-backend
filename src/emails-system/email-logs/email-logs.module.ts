import { Module } from "@nestjs/common";
import { EmailLogsService } from "./email-logs.service";
import { EmailLogsController } from "./email-logs.controller"; // Asegúrate de que esta línea esté
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [EmailLogsController], // Asegúrate de que EmailLogsController esté aquí
  providers: [EmailLogsService],
  exports: [EmailLogsService],
})
export class EmailLogsModule {}
