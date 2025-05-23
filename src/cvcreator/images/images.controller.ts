import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UseGuards,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ImagesService } from "./images.service";
import { CreateImageDto } from "./dto/create-image.dto";
import { UpdateImageDto } from "./dto/update-image.dto";
import { ImageDto } from "./dto/image.dto";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Express } from "express";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { GetUser } from "../../auth/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import { Roles } from "../../auth/decorators/roles.decorator";
import { RolesGuard } from "../../guards/roles.guard";
import { SubscriptionStatusGuard } from "../../guards/subscription-status.guard";
import { Role } from "../../auth/enums/role.enum";

@ApiTags("CV Creator - Images")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStatusGuard)
@Roles(Role.SUSCRIBER)
@Controller("cvcreator/images")
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload and create image" })
  @ApiBody({
    description: "Image file and metadata",
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
        type: { type: "string", enum: ["profile", "cv_asset"] },
        image_name: { type: "string" },
      },
      required: ["file", "image_name"],
    },
  })
  @ApiResponse({
    status: 201,
    description: "The image has been successfully created.",
    type: ImageDto,
  })
  @ApiResponse({ status: 400, description: "Bad request." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async create(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB
          new FileTypeValidator({ fileType: "image/(jpeg|png|gif|webp)" }),
        ],
      })
    )
    file: Express.Multer.File,
    @Body() createImageDto: Omit<CreateImageDto, "user_id">,
    @GetUser() user: User
  ) {
    const imageDtoWithUser: CreateImageDto = {
      ...createImageDto,
      user_id: user.id,
    };
    return await this.imagesService.create(imageDtoWithUser, file);
  }

  @Get()
  @ApiOperation({ summary: "Get all images for the authenticated user" })
  @ApiResponse({
    status: 200,
    description: "Return all images for the user.",
    type: [ImageDto],
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async findAll(@GetUser() user: User) {
    return await this.imagesService.findAllByUserId(user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get image by id for the authenticated user" })
  @ApiResponse({
    status: 200,
    description: "Return image by id.",
    type: ImageDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 404, description: "Image not found." })
  async findOne(@Param("id") id: string, @GetUser() user: User) {
    return await this.imagesService.findOneByUserId(id, user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update image metadata for the authenticated user" })
  @ApiResponse({
    status: 200,
    description: "The image has been successfully updated.",
    type: ImageDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 404, description: "Image not found." })
  async update(
    @Param("id") id: string,
    @Body() updateImageDto: UpdateImageDto,
    @GetUser() user: User
  ) {
    return await this.imagesService.updateByUserId(id, updateImageDto, user.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete image for the authenticated user" })
  @ApiResponse({
    status: 200,
    description: "The image has been successfully deleted.",
    type: ImageDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 404, description: "Image not found." })
  async remove(@Param("id") id: string, @GetUser() user: User) {
    return await this.imagesService.removeByUserId(id, user.id);
  }
}
