import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { UserDto } from "./dto/user.dto";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: "Crear usuario" })
  @ApiResponse({
    status: 201,
    description: "El usuario ha sido creado exitosamente.",
    type: UserDto,
  })
  @ApiResponse({ status: 403, description: "Prohibido." })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: "Obtener todos los usuarios" })
  @ApiResponse({
    status: 200,
    description: "Devuelve todos los usuarios.",
    type: [UserDto],
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener usuario por id" })
  @ApiResponse({
    status: 200,
    description: "Devuelve usuario por id.",
    type: UserDto,
  })
  @ApiResponse({ status: 404, description: "Usuario no encontrado." })
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualizar usuario" })
  @ApiResponse({
    status: 200,
    description: "El usuario ha sido actualizado exitosamente.",
    type: UserDto,
  })
  @ApiResponse({ status: 404, description: "Usuario no encontrado." })
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Eliminar usuario" })
  @ApiResponse({
    status: 200,
    description: "El usuario ha sido eliminado exitosamente.",
  })
  @ApiResponse({ status: 404, description: "Usuario no encontrado." })
  remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }
}
