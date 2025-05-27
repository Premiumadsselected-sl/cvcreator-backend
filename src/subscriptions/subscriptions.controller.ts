import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { SubscriptionsService } from "./subscriptions.service";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { SubscriptionDto, SubscriptionStatus } from "./dto/subscription.dto"; // Import DTO status
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { User } from "../users/entities/user.entity";
import { SubscriptionCancellationRequestDto } from "./dto/subscription-cancellation-request.dto";

@ApiTags("Subscriptions")
@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new subscription" })
  @ApiResponse({
    status: 201,
    description: "The subscription has been successfully created.",
    type: SubscriptionDto,
  })
  @ApiResponse({ status: 400, description: "Bad Request." })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(createSubscriptionDto);
  }

  @Get()
  @ApiOperation({ summary: "Retrieve all subscriptions" })
  @ApiResponse({
    status: 200,
    description: "A list of subscriptions.",
    type: [SubscriptionDto],
  })
  findAll() {
    return this.subscriptionsService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Retrieve a subscription by ID" })
  @ApiParam({
    name: "id",
    description: "Subscription ID",
    type: "string",
  })
  @ApiResponse({
    status: 200,
    description: "The subscription details.",
    type: SubscriptionDto,
  })
  @ApiResponse({ status: 404, description: "Subscription not found." })
  findOne(@Param("id") id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a subscription by ID" })
  @ApiParam({
    name: "id",
    description: "Subscription ID",
    type: "string",
  })
  @ApiResponse({
    status: 200,
    description: "The subscription has been successfully updated.",
    type: SubscriptionDto,
  })
  @ApiResponse({ status: 404, description: "Subscription not found." })
  @ApiResponse({ status: 400, description: "Bad Request." })
  update(
    @Param("id") id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto
  ) {
    return this.subscriptionsService.update(id, updateSubscriptionDto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Request to cancel a subscription by ID" })
  @ApiParam({
    name: "id",
    description: "Subscription ID to cancel",
    type: "string",
  })
  @ApiResponse({
    status: 200,
    description:
      "The subscription cancellation has been successfully processed.",
    type: SubscriptionDto,
  })
  @ApiResponse({ status: 404, description: "Subscription not found." })
  @ApiResponse({
    status: 400,
    description: "Bad Request (e.g., subscription not cancellable).",
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param("id") id: string,
    @GetUser() user: User,
    @Body() cancellationRequestDto?: SubscriptionCancellationRequestDto
  ): Promise<SubscriptionDto> {
    try {
      const subscriptionEntity =
        await this.subscriptionsService.requestUserSubscriptionCancellation(
          user.id,
          id,
          cancellationRequestDto?.cancellationReason
        );

      // Manual mapping from Subscription entity to SubscriptionDto
      const subscriptionDto: SubscriptionDto = {
        id: subscriptionEntity.id,
        user_id: subscriptionEntity.user_id,
        plan_id: subscriptionEntity.plan_id,
        status: subscriptionEntity.status.toLowerCase() as SubscriptionStatus, // Map to DTO enum
        trial_start: subscriptionEntity.trial_start ?? undefined,
        trial_end: subscriptionEntity.trial_end ?? undefined,
        current_period_start:
          subscriptionEntity.current_period_start ?? undefined,
        current_period_end: subscriptionEntity.current_period_end ?? undefined,
        cancel_at_period_end:
          subscriptionEntity.cancel_at_period_end ?? undefined,
        canceled_at: subscriptionEntity.canceled_at ?? undefined,
        ended_at: subscriptionEntity.ended_at ?? undefined,
        createdAt: subscriptionEntity.createdAt,
        updatedAt: subscriptionEntity.updatedAt,
        metadata: subscriptionEntity.metadata as any, // Cast metadata if necessary
      };

      return subscriptionDto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get("user/:userId")
  @ApiOperation({ summary: "Retrieve subscriptions by User ID" })
  @ApiParam({
    name: "userId",
    description: "User ID",
    type: "string",
  })
  @ApiResponse({
    status: 200,
    description: "A list of subscriptions for the user.",
    type: [SubscriptionDto],
  })
  @ApiResponse({
    status: 404,
    description: "User not found or no subscriptions for user.",
  })
  findByUserId(@Param("userId") userId: string) {
    return this.subscriptionsService.findAllByUserId(userId);
  }
}
