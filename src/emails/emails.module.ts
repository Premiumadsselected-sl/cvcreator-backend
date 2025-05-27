import { Module } from "@nestjs/common";
import { EmailsService } from "./emails.service"; // Corregido: EmailsService y la ruta
import { ConfigModule } from "@nestjs/config";
import { EmailLogsModule } from "./email-logs/email-logs.module";
// import { EmailsSystemController } from './emails-system.controller'; // Descomentar si se necesita un controlador

@Module({
  imports: [ConfigModule, EmailLogsModule],
  // controllers: [EmailsSystemController], // Descomentar si se necesita un controlador
  providers: [EmailsService], // Corregido: EmailsService
  exports: [EmailsService], // Corregido: EmailsService
})
export class EmailsSystemModule {}
