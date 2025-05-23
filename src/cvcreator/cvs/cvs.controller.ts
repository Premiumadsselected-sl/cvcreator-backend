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
import { CvsService } from "./cvs.service";
import { CreateCvDto } from "./dto/create-cv.dto";
import { UpdateCvDto } from "./dto/update-cv.dto";
import { CvDto } from "./dto/cv.dto";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { GetUser } from "../../auth/decorators/get-user.decorator";
import { UserDto } from "../../users/dto/user.dto";

@ApiTags("CV Creator - CVs")
@Controller("cvs")
export class CvsController {
  constructor(private readonly cvsService: CvsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Crear un nuevo CV" })
  @ApiResponse({
    status: 201,
    description: "El CV ha sido creado exitosamente.",
    type: CvDto,
  })
  @ApiResponse({ status: 400, description: "Petición incorrecta." })
  @ApiResponse({ status: 401, description: "No autorizado." })
  create(@Body() createCvDto: CreateCvDto, @GetUser() user: UserDto) {
    return this.cvsService.create(createCvDto, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener todos los CVs del usuario autenticado" })
  @ApiResponse({
    status: 200,
    description: "Lista de CVs.",
    type: [CvDto],
  })
  @ApiResponse({ status: 401, description: "No autorizado." })
  findAll(@GetUser() user: UserDto) {
    return this.cvsService.findAll(user.id);
  }

  @Get(":idOrSlug")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener un CV específico por ID o slug" })
  @ApiParam({
    name: "idOrSlug",
    description: "El ID (UUID) o slug del CV",
    type: String,
  })
  @ApiResponse({ status: 200, description: "El CV.", type: CvDto })
  @ApiResponse({ status: 401, description: "No autorizado." })
  @ApiResponse({ status: 404, description: "CV no encontrado." })
  async findOne(@Param("idOrSlug") idOrSlug: string, @GetUser() user: UserDto) {
    const isUUID =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        idOrSlug
      );
    if (isUUID) {
      return this.cvsService.findOne(idOrSlug, user.id);
    }
    return this.cvsService.findOneBySlug(idOrSlug, user.id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Actualizar un CV" })
  @ApiParam({ name: "id", description: "El ID (UUID) del CV a actualizar" })
  @ApiResponse({
    status: 200,
    description: "El CV ha sido actualizado exitosamente.",
    type: CvDto,
  })
  @ApiResponse({ status: 400, description: "Petición incorrecta." })
  @ApiResponse({ status: 401, description: "No autorizado." })
  @ApiResponse({ status: 404, description: "CV no encontrado." })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateCvDto: UpdateCvDto,
    @GetUser() user: UserDto
  ) {
    return this.cvsService.update(id, updateCvDto, user.id);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Eliminar un CV (borrado lógico)" })
  @ApiParam({ name: "id", description: "El ID (UUID) del CV a eliminar" })
  @ApiResponse({
    status: 200,
    description: "El CV ha sido marcado como eliminado exitosamente.",
    type: CvDto,
  })
  @ApiResponse({ status: 401, description: "No autorizado." })
  @ApiResponse({ status: 404, description: "CV no encontrado." })
  remove(@Param("id", ParseUUIDPipe) id: string, @GetUser() user: UserDto) {
    return this.cvsService.remove(id, user.id);
  }
}
