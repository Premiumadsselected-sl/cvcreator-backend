import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UseGuards,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { TemplatesService } from "./templates.service";
import {
  CreateTemplateDto,
  TemplateDesignType,
} from "./dto/create-template.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";
import { TemplateDto } from "./dto/template.dto";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { RolesGuard } from "../../guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Role } from "../../auth/enums/role.enum";
import { GetUser } from "../../auth/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";

@ApiTags("CV Creator - Templates")
@Controller("templates")
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new template (Admin only)" })
  @ApiResponse({
    status: 201,
    description: "The template has been successfully created.",
    type: TemplateDto,
  })
  @ApiResponse({ status: 400, description: "Bad Request." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  create(@Body() createTemplateDto: CreateTemplateDto) {
    return this.templatesService.create(createTemplateDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all templates, optionally filtered by type" })
  @ApiQuery({
    name: "type",
    enum: TemplateDesignType,
    required: false,
    description: "Filter templates by type (cv, cover_letter)",
  })
  @ApiResponse({
    status: 200,
    description: "List of templates.",
    type: [TemplateDto],
  })
  findAll(@Query("type") type?: TemplateDesignType) {
    return this.templatesService.findAll(type);
  }

  @Get("premium")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get all premium templates (Premium Users & Admins)",
  })
  @ApiQuery({
    name: "type",
    enum: TemplateDesignType,
    required: false,
    description: "Filter premium templates by type",
  })
  @ApiResponse({
    status: 200,
    description: "List of premium templates.",
    type: [TemplateDto],
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  findPremiumTemplates(@Query("type") type?: TemplateDesignType) {
    return this.templatesService.findAllPremium(type);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a specific template by ID" })
  @ApiParam({ name: "id", description: "The ID (UUID) of the template" })
  @ApiResponse({ status: 200, description: "The template.", type: TemplateDto })
  @ApiResponse({ status: 404, description: "Template not found." })
  @ApiResponse({
    status: 401,
    description:
      "Unauthorized (if template is premium and user is not authenticated/authorized).",
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden (if template is premium and user role is not sufficient).",
  })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @GetUser() user?: User
  ) {
    const template = await this.templatesService.findOne(id);
    if (template && template.is_premium) {
      if (!user) {
        throw new UnauthorizedException(
          "Authentication required to access this premium template."
        );
      }
      const isPremiumUser = user.roles?.includes(Role.PREMIUM_USER);
      const isAdmin = user.roles?.includes(Role.ADMIN);
      if (!isPremiumUser && !isAdmin) {
        throw new ForbiddenException(
          "You do not have permission to access this premium template."
        );
      }
    }
    return template;
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a template (Admin only)" })
  @ApiParam({
    name: "id",
    description: "The ID (UUID) of the template to update",
  })
  @ApiResponse({
    status: 200,
    description: "The template has been successfully updated.",
    type: TemplateDto,
  })
  @ApiResponse({ status: 400, description: "Bad Request." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @ApiResponse({ status: 404, description: "Template not found." })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateTemplateDto: UpdateTemplateDto
  ) {
    return this.templatesService.update(id, updateTemplateDto);
  }

  @Post(":id/increment-usage")
  @ApiOperation({ summary: "Increment the usage counter for a template" })
  @ApiParam({ name: "id", description: "The ID (UUID) of the template" })
  @ApiResponse({
    status: 200,
    description: "Usage count incremented.",
    type: TemplateDto,
  })
  @ApiResponse({ status: 404, description: "Template not found." })
  incrementUsage(@Param("id", ParseUUIDPipe) id: string) {
    return this.templatesService.incrementUsage(id);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a template (Admin only)" })
  @ApiParam({
    name: "id",
    description: "The ID (UUID) of the template to delete",
  })
  @ApiResponse({
    status: 200,
    description: "The template has been successfully deleted.",
    type: TemplateDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @ApiResponse({ status: 404, description: "Template not found." })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.templatesService.remove(id);
  }
}
