/* filepath: /Users/arcademan/Documents/Projects/ADSDIGITAL/cvcreator-backend/src/images/images.controller.ts */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Patch,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
// Asumiremos que este controlador podría usar un servicio de imágenes genérico o uno específico.
// Por ahora, lo dejaremos sin un servicio específico hasta que se defina su propósito exacto.
// import { ImagesService } from './images.service'; // Descomentar si se crea un ImagesService aquí
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "../auth/enums/role.enum";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { User } from "../users/entities/user.entity";
import {
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";

// DTOs genéricos para este controlador, podrían ser diferentes a los de cvcreator/images
class CreateGenericImageDto {
  // Podría tener campos como 'context', 'altText', etc.
  // @ApiProperty({ type: 'string', format: 'binary', required: true })
  // file: Express.Multer.File; // Swagger no maneja bien Express.Multer.File directamente en DTOs para multipart
}

class UpdateGenericImageDto {
  // altText?: string;
}

@ApiTags("General Images")
@ApiBearerAuth()
@Controller("images") // Ruta base para imágenes generales
@UseGuards(JwtAuthGuard) // Proteger todas las rutas por defecto
export class ImagesController {
  // constructor(private readonly imagesService: ImagesService) {} // Descomentar si se usa un servicio

  @Post()
  @UseInterceptors(FileInterceptor("file"))
  @Roles(Role.ADMIN, Role.USER) // Corregido: Role.ADMIN, Role.USER
  @UseGuards(RolesGuard) // Aplicar RolesGuard específicamente aquí
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "Image file for general purpose",
    // schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } // Forma alternativa para Swagger
    type: CreateGenericImageDto, // Usar un DTO si se envían más datos
  })
  @ApiOperation({ summary: "Upload a new general-purpose image" })
  @ApiResponse({
    status: 201,
    description: "The image has been successfully uploaded.",
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  uploadGeneralImage(
    @Body() createImageDto: CreateGenericImageDto, // Usar si hay más datos que el archivo
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }), // 10MB para imágenes generales
          new FileTypeValidator({ fileType: "image/(jpeg|png|gif|webp)" }),
        ],
      })
    )
    file: Express.Multer.File,
    @GetUser() user: User
  ) {
    console.log(
      "Uploaded general image:",
      file.originalname,
      "by user:",
      user.id
    );
    // Aquí iría la lógica para guardar la imagen, posiblemente usando un servicio.
    // Por ejemplo: return this.imagesService.upload(file, user.id, createImageDto);
    return {
      message: "Image uploaded successfully (simulated)",
      filename: file.originalname,
    };
  }

  @Get()
  @Roles(Role.ADMIN) // Corregido: Role.ADMIN
  @UseGuards(RolesGuard) // Aplicar RolesGuard específicamente aquí si JwtAuthGuard ya está a nivel de controlador
  @ApiOperation({ summary: "Get all general-purpose images (Admin only)" })
  @ApiResponse({ status: 200, description: "List of general images." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  findAllGeneralImages() {
    // Lógica para obtener todas las imágenes generales
    // Por ejemplo: return this.imagesService.findAll();
    return { message: "List of all general images (simulated)" };
  }

  @Get(":id")
  // Podría ser público o restringido a usuarios/admins dependiendo del caso de uso
  @ApiOperation({ summary: "Get a specific general-purpose image by ID" })
  @ApiResponse({ status: 200, description: "The image." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 404, description: "Not Found." })
  findGeneralImageById(@Param("id") id: string, @GetUser() user: User) {
    console.log("Fetching general image with id:", id, "for user:", user.id);
    // Lógica para obtener una imagen general por ID, verificando permisos si es necesario
    // Por ejemplo: return this.imagesService.findById(id, user);
    return { message: `Details for general image ${id} (simulated)` };
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.USER) // Corregido: Role.ADMIN, Role.USER
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Update general-purpose image data by ID" })
  @ApiResponse({
    status: 200,
    description: "The image data has been successfully updated.",
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @ApiResponse({ status: 404, description: "Not Found." })
  updateGeneralImage(
    @Param("id") id: string,
    @Body() updateImageDto: UpdateGenericImageDto,
    @GetUser() user: User
  ) {
    console.log(
      "Updating general image with id:",
      id,
      "by user:",
      user.id,
      "with data:",
      updateImageDto
    );
    // Lógica para actualizar metadatos de la imagen, verificando permisos
    // Por ejemplo: return this.imagesService.update(id, updateImageDto, user);
    return { message: `General image ${id} updated (simulated)` };
  }

  @Delete(":id")
  @Roles(Role.ADMIN, Role.USER) // Corregido: Role.ADMIN, Role.USER
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Delete a general-purpose image by ID" })
  @ApiResponse({
    status: 200,
    description: "The image has been successfully deleted.",
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @ApiResponse({ status: 404, description: "Not Found." })
  removeGeneralImage(@Param("id") id: string, @GetUser() user: User) {
    console.log("Deleting general image with id:", id, "by user:", user.id);
    // Lógica para eliminar la imagen, verificando permisos
    // Por ejemplo: return this.imagesService.remove(id, user);
    return { message: `General image ${id} deleted (simulated)` };
  }
}
