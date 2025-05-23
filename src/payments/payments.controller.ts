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
  ParseUUIDPipe,
  UseGuards,
} from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { UpdatePaymentDto } from "./dto/update-payment.dto";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { PaymentDto } from "./dto/payment.dto";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";
import { InitiatePaymentResponseDto } from "./dto/initiate-payment-response.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { User } from "../users/entities/user.entity";

@ApiTags("Payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("payment-flow")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Initiate a new payment flow for a plan" })
  @ApiResponse({
    status: 201,
    description:
      "Payment flow initiated successfully, returns data to proceed with Tefpay.",
    type: InitiatePaymentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad Request (e.g., invalid plan, user issue).",
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 404, description: "Plan not found." })
  @ApiResponse({
    status: 409,
    description: "User has an active or trialing subscription.",
  })
  @HttpCode(HttpStatus.CREATED)
  async initiatePaymentFlow(
    @Body() initiatePaymentDto: InitiatePaymentDto,
    @GetUser() user: User
  ): Promise<InitiatePaymentResponseDto> {
    // Pasar user.id (string) en lugar del objeto User completo
    return this.paymentsService.initiatePaymentFlow(
      initiatePaymentDto,
      user.id
    );
  }

  @Post()
  @ApiOperation({ summary: "Create a new payment" })
  @ApiResponse({
    status: 201,
    description: "The payment has been successfully created.",
    type: PaymentDto,
  })
  @ApiResponse({ status: 400, description: "Bad Request." })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Get()
  @ApiOperation({ summary: "Retrieve all payments" })
  @ApiResponse({
    status: 200,
    description: "A list of payments.",
    type: [PaymentDto],
  })
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Retrieve a payment by ID" })
  @ApiParam({
    name: "id",
    description: "Payment ID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({
    status: 200,
    description: "The payment details.",
    type: PaymentDto,
  })
  @ApiResponse({ status: 404, description: "Payment not found." })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a payment by ID" })
  @ApiParam({
    name: "id",
    description: "Payment ID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({
    status: 200,
    description: "The payment has been successfully updated.",
    type: PaymentDto,
  })
  @ApiResponse({ status: 404, description: "Payment not found." })
  @ApiResponse({ status: 400, description: "Bad Request." })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updatePaymentDto: UpdatePaymentDto
  ) {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a payment by ID" })
  @ApiParam({
    name: "id",
    description: "Payment ID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({
    status: 204,
    description: "The payment has been successfully deleted.",
  })
  @ApiResponse({ status: 404, description: "Payment not found." })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.paymentsService.remove(id);
  }
}
