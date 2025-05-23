import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common"; // Added UseGuards
import { AuditLogsService } from "./audit-logs.service";
import { CreateAuditLogDto } from "./dto/create-audit-log.dto";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger"; // Added ApiBearerAuth
import { AuditLog } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"; // Uncommented
import { RolesGuard } from "../auth/guards/roles.guard"; // Uncommented
import { Roles } from "../auth/decorators/roles.decorator"; // Uncommented
import { UserRole } from "../users/dto/user.dto"; // Uncommented

@ApiTags("Audit Logs")
@ApiBearerAuth() // Added to indicate that JWT is required for this controller
@UseGuards(JwtAuthGuard, RolesGuard) // Secure all endpoints in this controller
@Controller("audit-logs")
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  // This endpoint might be restricted to internal use or specific admin roles
  // For now, it's included for completeness but without specific role protection.
  @Post()
  @ApiOperation({
    summary: "Create a new audit log entry (ADMINISTRATORS ONLY)",
  })
  @ApiResponse({
    status: 201,
    description: "The audit log has been successfully created.",
    type: CreateAuditLogDto, // Type should be AuditLog DTO if you have one
  })
  @ApiResponse({ status: 400, description: "Bad Request." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @Roles(UserRole.ADMIN) // Only ADMIN can manually create logs if exposed
  async create(
    @Body() createAuditLogDto: CreateAuditLogDto
  ): Promise<AuditLog> {
    return this.auditLogsService.create(createAuditLogDto);
  }

  @Get()
  @ApiOperation({
    summary: "Retrieve all audit logs (paginated, ADMINISTRATORS ONLY)",
  })
  @ApiResponse({ status: 200, description: "List of audit logs." }) // Consider a paginated response DTO
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @Roles(UserRole.ADMIN) // Only ADMIN can view all logs
  @ApiQuery({
    name: "skip",
    required: false,
    type: Number,
    description: "Number of records to skip",
  })
  @ApiQuery({
    name: "take",
    required: false,
    type: Number,
    description: "Number of records to take",
  })
  // Add more query params for filtering (e.g., userId, action, date range)
  async findAll(
    @Query("skip") skip?: string,
    @Query("take") take?: string
    // @Query('userId') userId?: string, // Example filter
    // @Query('action') action?: string, // Example filter
  ): Promise<AuditLog[]> {
    const queryParams: any = {};
    if (skip) queryParams.skip = parseInt(skip, 10);
    if (take) queryParams.take = parseInt(take, 10);
    // if (userId) queryParams.where = { ...queryParams.where, user_id: userId };
    // if (action) queryParams.where = { ...queryParams.where, action: action };

    return this.auditLogsService.findAll(queryParams);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Retrieve a specific audit log by ID (ADMINISTRATORS ONLY)",
  })
  @ApiResponse({ status: 200, description: "The audit log entry." })
  @ApiResponse({ status: 404, description: "Audit log not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @Roles(UserRole.ADMIN) // Only ADMIN can view specific logs by ID
  async findOne(@Param("id") id: string): Promise<AuditLog | null> {
    return this.auditLogsService.findOne(id);
  }
}
