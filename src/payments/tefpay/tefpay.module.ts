import { Module, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config"; // AÑADIDO ConfigModule
import { TefpayService } from "./tefpay.service";
import { PaymentProcessorRegistryService } from "../payment-processor-registry.service";
import { HttpModule } from "@nestjs/axios";
// Importar NotificationsModule si TefpayNotificationsService se mueve aquí
// import { TefpayNotificationsService } from './notifications/notifications.service';
// import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule, // AÑADIDO: Para asegurar que ConfigService esté disponible
    // PaymentProcessorRegistryService será inyectado porque PaymentsModule lo provee y exporta (o es global)
    // Si NotificationsModule y TefpayNotificationsService son específicos y solo usados por TefpayService,
    // podrían importarse/proveerse aquí.
    // Ejemplo: NotificationsModule,
  ],
  providers: [
    TefpayService,
    Logger,
    // PaymentProcessorRegistryService, // No es necesario proveerlo aquí si ya está en un módulo importado o es global
    // TefpayNotificationsService, // Si se decide que este servicio pertenece aquí
  ],
  exports: [TefpayService],
})
export class TefpayModule implements OnModuleInit {
  private readonly logger = new Logger(TefpayModule.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly registryService: PaymentProcessorRegistryService,
    private readonly tefpayService: TefpayService
  ) {}

  onModuleInit() {
    const tefpayEnabled =
      this.configService.get<string>("TEFPAY_ENABLED") === "true";
    this.logger.log(`Tefpay enabled: ${tefpayEnabled}`);
    if (tefpayEnabled) {
      this.registryService.register("tefpay", this.tefpayService);
      this.logger.log(
        "TefpayService registered successfully with PaymentProcessorRegistryService."
      );
    } else {
      this.logger.log(
        "Tefpay integration is disabled via TEFPAY_ENABLED flag."
      );
    }
  }
}
