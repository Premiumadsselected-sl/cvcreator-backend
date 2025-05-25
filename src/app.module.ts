import { Module } from "@nestjs/common";
import { AppController } from "./app.controller"; // Import AppController
import { PrismaModule } from "./prisma/prisma.module";
import { ConfigModule } from "@nestjs/config";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { EventEmitterModule } from "@nestjs/event-emitter"; // Importar EventEmitterModule
// Los siguientes módulos ahora se gestionan a través de CvCreatorModule:
// import { CvsModule } from "./cvs/cvs.module";
// import { CoverLettersModule from "./cover-letters/cover-letters.module";
// import { TemplatesModule from "./templates/templates.module";
// import { PlansModule from "./cvcreator/plans/plans.module";
// import { EmailLogsModule from "./cvcreator/emails/email-logs/email-logs.module";
// import { ImagesModule from "./cvcreator/images/images.module";
import { PaymentsModule } from "./payments/payments.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { ApiTokensModule } from "./api-tokens/api-tokens.module";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
import { CvCreatorModule } from "./cvcreator/cvcreator.module"; // Módulo que agrupa funcionalidades de creación de CVs.

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Hace que ConfigModule esté disponible globalmente.
      envFilePath: ".env", // Especifica el archivo de variables de entorno.
    }),
    EventEmitterModule.forRoot(), // Añadir EventEmitterModule.forRoot() a los imports
    PrismaModule, // Módulo para la interacción con la base de datos Prisma.
    UsersModule, // Módulo para la gestión de usuarios.
    AuthModule, // Módulo para la autenticación.
    PaymentsModule, // Módulo para la gestión de pagos.
    SubscriptionsModule, // Módulo para la gestión de suscripciones.
    ApiTokensModule, // Módulo para la gestión de tokens de API.
    AuditLogsModule, // Módulo para logs de auditoría.
    CvCreatorModule, // Módulo principal para las funcionalidades de creación de CVs.
  ],
  // Los controladores y proveedores suelen ser proporcionados por sus respectivos módulos importados.
  controllers: [AppController], // Add AppController here
  providers: [],
})
export class AppModule {}
