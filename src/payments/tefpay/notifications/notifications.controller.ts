import { Controller, Post, Body, HttpCode, Res, Logger } from "@nestjs/common";
import { TefPayNotificationsService } from "./notifications.service";
import { TefPayNotificationDto } from "./dto/notification.dto";
import { Response } from "express";

@Controller("tefpay/notify") // Changed path to be more specific as per common practices
export class TefPayNotificationsController {
  private readonly logger = new Logger(TefPayNotificationsController.name);

  constructor(
    private readonly notificationsService: TefPayNotificationsService
  ) {}

  @Post()
  @HttpCode(200) // Tefpay expects HTTP 200 for both success and error acknowledgements
  async handleTefpayNotification(
    @Body() notificationDto: TefPayNotificationDto,
    @Res() response: Response
  ): Promise<void> {
    this.logger.log(
      "Received Tefpay notification DTO:",
      JSON.stringify(notificationDto, null, 2)
    );

    if (Object.keys(notificationDto).length === 0) {
      this.logger.warn(
        "Received empty notification body. This might indicate a parsing issue or an empty request from Tefpay."
      );
      response.send("*error*");
      return;
    }

    // Use Ds_Merchant_MatchingData as the order identifier for logging, as per the DTO definition.
    const orderIdentifier =
      notificationDto.Ds_Merchant_MatchingData || "UNKNOWN_ORDER";

    try {
      await this.notificationsService.handleNotification(notificationDto);
      this.logger.log(
        `Successfully processed notification for order: ${orderIdentifier}`
      );
      response.send("*ok*");
    } catch (error) {
      this.logger.error(
        `Error processing Tefpay notification for order ${orderIdentifier}:`,
        error
      );
      response.send("*error*");
    }
  }
}
