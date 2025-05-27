import { Module, forwardRef, Global } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";
import { PlansModule } from "./plans/plans.module";
import { ConfigModule } from "@nestjs/config"; // ConfigService se inyecta donde se necesita
import { AuditLogsModule } from "../audit-logs/audit-logs.module";
import { NotificationsModule } from "./tefpay/notifications/notifications.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { PaymentProcessorRegistryService } from "./payment-processor-registry.service"; // AÑADIDO
import { TefpayModule } from "./tefpay/tefpay.module"; // AÑADIDO

@Global()
@Module({
  imports: [
    PrismaModule,
    HttpModule,
    UsersModule,
    PlansModule,
    ConfigModule,
    AuditLogsModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => SubscriptionsModule),
    TefpayModule, // AÑADIDO: Para que TefpayModule se cargue y se auto-registre
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentProcessorRegistryService, // AÑADIDO: Hacer el registro disponible
    // TefpayNotificationsService se provee dentro de NotificationsModule o aquí si es un servicio central de Payments.
    // Si TefpayNotificationsService es específico de Tefpay y se usa solo cuando Tefpay está activo,
    // podría ser parte de TefpayModule o instanciado dinámicamente.
    // Por ahora, asumimos que NotificationsModule lo gestiona o se añade aquí si es genérico.
    // Si TefpayNotificationsService es un servicio que debe estar siempre disponible para el PaymentsService,
    // incluso si Tefpay está deshabilitado (quizás para manejar notificaciones antiguas o errores),
    // entonces debe permanecer aquí. Dado su nombre, parece específico de Tefpay.
    // Lo mantenemos si es necesario para la lógica de `handleTefpayNotificationEvent` incluso si Tefpay está deshabilitado.
    // Sin embargo, `handleTefpayNotificationEvent` ahora obtiene TefpayService del registro.
    // Si TefpayNotificationsService es usado por PaymentsService directamente, debe estar aquí.
    // Si es parte de la lógica interna de Tefpay, TefpayModule debería proveerlo y usarlo.
    // Revisando `payments.service.ts`, `TefpayNotificationsService` se inyecta.
    // Si `TefpayNotificationsService` es el que *recibe* y *parsea* las notificaciones antes del evento,
    // entonces debe estar disponible. Si `TefpayModule` lo necesita, debe importarlo o tenerlo en sus providers.
    // Por ahora, lo dejamos aquí, asumiendo que es un receptor general de notificaciones Tefpay.
    // Considerar si TefpayNotificationsService debe ser parte de TefpayModule.
  ],
  // Solo exportar PaymentsService y el Registry si otros módulos fuera de Payments necesitan acceder a ellos.
  // TefpayService ya no se exporta desde aquí.
  exports: [PaymentsService, PaymentProcessorRegistryService], // MODIFICADO
})
export class PaymentsModule {}
