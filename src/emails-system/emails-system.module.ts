import { Module } from "@nestjs/common";
import { EmailsSystemService } from "./emails-system.service";
import { ConfigModule } from "@nestjs/config";
import { EmailLogsModule } from "./email-logs/email-logs.module"; // Importar EmailLogsModule
// import { EmailsSystemController } from './emails-system.controller'; // Descomentar si se necesita un controlador

@Module({
  imports: [
    ConfigModule,
    EmailLogsModule, // Añadir EmailLogsModule a los imports
  ],
  // controllers: [EmailsSystemController], // Descomentar si se necesita un controlador
  providers: [EmailsSystemService],
  exports: [EmailsSystemService],
})
export class EmailsSystemModule {}
