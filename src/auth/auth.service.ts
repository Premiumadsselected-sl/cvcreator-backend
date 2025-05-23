import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { LoginUserDto } from "./dto/login-user.dto";
import { RegisterUserDto } from "./dto/register-user.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { UserDto } from "../users/dto/user.dto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Registra un nuevo usuario.
   * @param registerUserDto Datos para el registro.
   * @returns Promesa con AuthResponseDto (token y datos del usuario).
   */
  async register(registerUserDto: RegisterUserDto): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName } = registerUserDto;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException("Ya existe un usuario con este email");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.usersService.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userPayload } = newUser;
    const accessToken = this.jwtService.sign({
      sub: newUser.id,
      email: newUser.email,
    });

    return {
      accessToken,
      user: userPayload as UserDto,
    };
  }

  /**
   * Autentica a un usuario existente.
   * @param loginUserDto Credenciales de login.
   * @returns Promesa con AuthResponseDto.
   */
  async login(loginUserDto: LoginUserDto): Promise<AuthResponseDto> {
    const { email, password } = loginUserDto;
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException(
        "Credenciales inválidas - usuario no encontrado"
      );
    }

    const isPasswordMatching = await bcrypt.compare(password, user.password);
    if (!isPasswordMatching) {
      throw new UnauthorizedException(
        "Credenciales inválidas - contraseña incorrecta"
      );
    }

    if (user.status === "inactive" || user.status === "pending_verification") {
      throw new UnauthorizedException(
        "Cuenta de usuario inactiva o pendiente de verificación."
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userPayload } = user;
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      accessToken,
      user: userPayload as UserDto,
    };
  }

  /**
   * Valida un usuario por su ID.
   * @param userId ID del usuario.
   * @returns Promesa con el objeto User.
   */
  async validateUserById(userId: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }
    return user;
  }

  /**
   * Obtiene el perfil de un usuario por su ID.
   * @param userId ID del usuario.
   * @returns Promesa con UserDto.
   */
  async getProfile(userId: string): Promise<UserDto> {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException("Usuario no encontrado para el perfil");
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userProfile } = user;
    return userProfile as UserDto;
  }
}
