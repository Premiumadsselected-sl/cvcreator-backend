import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { CoverLettersService } from "./cover-letters.service";
import { CreateCoverLetterDto } from "./dto/create-cover-letter.dto";
import { UpdateCoverLetterDto } from "./dto/update-cover-letter.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { GetUser } from "../../auth/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { CoverLetterDto } from "./dto/cover-letter.dto";

@ApiTags("CV Creator - Cover Letters")
@ApiBearerAuth() // Aplicar a nivel de controlador si todos los endpoints lo requieren
@UseGuards(JwtAuthGuard) // Aplicar a nivel de controlador si todos los endpoints lo requieren
@Controller("cover-letters")
export class CoverLettersController {
  constructor(private readonly coverLettersService: CoverLettersService) {}

  @Post()
  @ApiOperation({ summary: "Create a new cover letter" })
  @ApiResponse({
    status: 201,
    description: "The cover letter has been successfully created.",
    type: CoverLetterDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  create(
    @Body() createCoverLetterDto: CreateCoverLetterDto,
    @GetUser() user: User
  ) {
    return this.coverLettersService.create(createCoverLetterDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: "Get all cover letters for the authenticated user" })
  @ApiResponse({
    status: 200,
    description: "List of cover letters.",
    type: [CoverLetterDto],
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  findAll(@GetUser() user: User) {
    return this.coverLettersService.findAllByUserId(user.id);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get a specific cover letter by ID for the authenticated user",
  })
  @ApiParam({ name: "id", description: "The ID (UUID) of the cover letter" })
  @ApiResponse({
    status: 200,
    description: "The cover letter.",
    type: CoverLetterDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 404, description: "Cover letter not found." })
  findOne(@Param("id", ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.coverLettersService.findOneByUserId(id, user.id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Update a cover letter by ID for the authenticated user",
  })
  @ApiParam({
    name: "id",
    description: "The ID (UUID) of the cover letter to update",
  })
  @ApiResponse({
    status: 200,
    description: "The cover letter has been successfully updated.",
    type: CoverLetterDto,
  })
  @ApiResponse({ status: 400, description: "Bad Request." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 404, description: "Cover letter not found." })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateCoverLetterDto: UpdateCoverLetterDto,
    @GetUser() user: User
  ) {
    return this.coverLettersService.updateByUserId(
      id,
      updateCoverLetterDto,
      user.id
    );
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Delete a cover letter by ID for the authenticated user",
  })
  @ApiParam({
    name: "id",
    description: "The ID (UUID) of the cover letter to delete",
  })
  @ApiResponse({
    status: 200,
    description: "The cover letter has been successfully deleted.",
    type: CoverLetterDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 404, description: "Cover letter not found." })
  remove(@Param("id", ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.coverLettersService.removeByUserId(id, user.id);
  }
}
