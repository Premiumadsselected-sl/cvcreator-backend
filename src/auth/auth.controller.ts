import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterUserDto } from "./dto/register-user.dto";
import { LoginUserDto } from "./dto/login-user.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { GetUser } from "./decorators/get-user.decorator";
import { UserDto } from "../users/dto/user.dto"; // DTO para la respuesta del perfil de usuario.
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";

@ApiTags("Auth") // Etiqueta para agrupar endpoints de autenticación en Swagger.
@Controller("auth") // Define el prefijo de ruta para este controlador.
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Registrar un nuevo usuario" })
  @ApiResponse({
    status: 201,
    description: "Usuario registrado exitosamente.",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: "Petición incorrecta." })
  @ApiResponse({
    status: 409,
    description: "Conflicto. Ya existe un usuario con este email.",
  })
  async register(
    @Body() registerUserDto: RegisterUserDto
  ): Promise<AuthResponseDto> {
    return this.authService.register(registerUserDto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK) // Define el código de estado HTTP para respuestas exitosas.
  @ApiOperation({ summary: "Iniciar sesión para un usuario existente" })
  @ApiResponse({
    status: 200,
    description: "Usuario ha iniciado sesión exitosamente.",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "No autorizado. Credenciales inválidas.",
  })
  async login(@Body() loginUserDto: LoginUserDto): Promise<AuthResponseDto> {
    return this.authService.login(loginUserDto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard) // Protege el endpoint, requiere JWT válido.
  @ApiBearerAuth() // Indica en Swagger que se requiere un token Bearer.
  @ApiOperation({ summary: "Obtener el perfil del usuario actual" })
  @ApiResponse({
    status: 200,
    description: "Perfil del usuario obtenido exitosamente.",
    type: UserDto,
  })
  @ApiResponse({
    status: 401,
    description: "No autorizado. Token ausente o inválido.",
  })
  getProfile(@GetUser() user: UserDto): UserDto {
    // El decorador @GetUser extrae el usuario del request (adjuntado por JwtStrategy).
    return user; // Devuelve el objeto de usuario directamente.
  }
}
