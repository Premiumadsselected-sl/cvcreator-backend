import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  Res,
  SetMetadata,
} from "@nestjs/common";
import { TefpayNotificationsService } from "./notifications.service";
import { Response } from "express";

export const Public = () => SetMetadata("isPublic", true);

@Controller("payments/tefpay/notifications")
export class TefPayNotificationsController {
  private readonly logger = new Logger(TefPayNotificationsController.name);

  constructor(
    private readonly tefpayNotificationsService: TefpayNotificationsService
  ) {}

  @Public()
  @Post()
  @HttpCode(200)
  async handleTefpayNotification(
    @Body() tefpayRawPayload: Record<string, any>,
    @Res() response: Response
  ): Promise<void> {
    this.logger.log(
      `Received Tefpay notification: ${JSON.stringify(tefpayRawPayload)}`
    );
    try {
      await this.tefpayNotificationsService.processAndStoreIncomingTefpayNotification(
        tefpayRawPayload
      );
      response.send("OK");
    } catch (error) {
      this.logger.error(
        `Error processing Tefpay notification: ${error.message}`,
        error.stack
      );
      response.status(500).send("KO");
    }
  }
}
