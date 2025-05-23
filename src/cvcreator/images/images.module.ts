import { Module } from "@nestjs/common";
import { ImagesController } from "./images.controller";
import { ImagesService } from "./images.service";
import { SubscriptionsModule } from "../../subscriptions/subscriptions.module";

@Module({
  imports: [SubscriptionsModule],
  controllers: [ImagesController],
  providers: [ImagesService],
  exports: [ImagesService], // Exportar si es necesario en otros módulos
})
export class ImagesModule {}
