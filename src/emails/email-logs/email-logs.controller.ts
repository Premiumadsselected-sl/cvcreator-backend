import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from "@nestjs/common";
import { EmailLogsService } from "./email-logs.service";
import { CreateEmailLogDto } from "./dto/create-email-log.dto";
import { UpdateEmailLogDto } from "./dto/update-email-log.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { RolesGuard } from "../../guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Role } from "../../auth/enums/role.enum";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { EmailLogDto } from "./dto/email-log.dto";

@ApiTags("Email Logs")
@ApiBearerAuth()
@Controller("email-logs")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailLogsController {
  constructor(private readonly emailLogsService: EmailLogsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Create a new email log (Admin only)" })
  @ApiResponse({
    status: 201,
    description: "The email log has been successfully created.",
    type: EmailLogDto,
  })
  @ApiResponse({ status: 403, description: "Forbidden." })
  async create(@Body() createEmailLogDto: CreateEmailLogDto) {
    return this.emailLogsService.create(createEmailLogDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Get all email logs (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "List of all email logs.",
    type: [EmailLogDto],
  })
  @ApiResponse({ status: 403, description: "Forbidden." })
  async findAll(@Query("page") page: string, @Query("limit") limit: string) {
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    return this.emailLogsService.findAll({
      page: pageNumber,
      limit: limitNumber,
    });
  }

  @Get(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Get an email log by ID (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "The email log.",
    type: EmailLogDto,
  })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @ApiResponse({ status: 404, description: "Not Found." })
  async findOne(@Param("id") id: string) {
    return this.emailLogsService.findOne(id);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Update an email log (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "The email log has been successfully updated.",
    type: EmailLogDto,
  })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @ApiResponse({ status: 404, description: "Not Found." })
  async update(
    @Param("id") id: string,
    @Body() updateEmailLogDto: UpdateEmailLogDto
  ) {
    return this.emailLogsService.update(id, updateEmailLogDto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Delete an email log (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "The email log has been successfully deleted.",
  })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @ApiResponse({ status: 404, description: "Not Found." })
  async remove(@Param("id") id: string) {
    return this.emailLogsService.remove(id);
  }
}
