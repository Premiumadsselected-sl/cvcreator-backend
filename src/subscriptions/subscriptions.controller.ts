import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { SubscriptionsService } from "./subscriptions.service";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { SubscriptionDto } from "./dto/subscription.dto";

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
    format: "uuid",
  })
  @ApiResponse({
    status: 200,
    description: "The subscription details.",
    type: SubscriptionDto,
  })
  @ApiResponse({ status: 404, description: "Subscription not found." })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a subscription by ID" })
  @ApiParam({
    name: "id",
    description: "Subscription ID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({
    status: 200,
    description: "The subscription has been successfully updated.",
    type: SubscriptionDto,
  })
  @ApiResponse({ status: 404, description: "Subscription not found." })
  @ApiResponse({ status: 400, description: "Bad Request." })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto
  ) {
    return this.subscriptionsService.update(id, updateSubscriptionDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a subscription by ID" })
  @ApiParam({
    name: "id",
    description: "Subscription ID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({
    status: 204,
    description: "The subscription has been successfully deleted.",
  })
  @ApiResponse({ status: 404, description: "Subscription not found." })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.subscriptionsService.remove(id);
  }
}
