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
import { CreateUserDto } from "../users/dto/create-user.dto"; // Importación añadida
import { AuditLogsService } from "../audit-logs/audit-logs.service"; // Importar AuditLogsService
import { AuditAction } from "../audit-logs/dto/audit-action.enum"; // Importar AuditAction

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService // Inyectar AuditLogsService
  ) {}

  /**
   * Registra un nuevo usuario.
   * @param registerUserDto Datos para el registro.
   * @returns Promesa con AuthResponseDto (token y datos del usuario).
   */
  async register(registerUserDto: RegisterUserDto): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName, username, locale } =
      registerUserDto; // Añadir locale
    let userIdForAudit: string | undefined = undefined;
    let calculatedUserName: string | undefined = username;

    // Calcular username aquí para que esté disponible en el log de error si es necesario
    if (!calculatedUserName) {
      if (firstName && lastName) {
        calculatedUserName = `${firstName.toLowerCase().replace(/\s+/g, "")}${lastName.toLowerCase().replace(/\s+/g, "")}`;
      } else if (firstName) {
        calculatedUserName = firstName.toLowerCase().replace(/\s+/g, "");
      } else if (lastName) {
        calculatedUserName = lastName.toLowerCase().replace(/\s+/g, "");
      } else if (email) {
        // Asegurarse de que email exista antes de usarlo
        calculatedUserName = email
          .split("@")[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
      }
    }

    try {
      const existingUser = await this.usersService.findByEmail(email);
      if (existingUser) {
        userIdForAudit = existingUser.id;
        throw new ConflictException("Ya existe un usuario con este email");
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      if (!calculatedUserName) {
        if (firstName && lastName) {
          calculatedUserName = `${firstName.toLowerCase().replace(/\s+/g, "")}${lastName.toLowerCase().replace(/\s+/g, "")}`;
        } else if (firstName) {
          calculatedUserName = firstName.toLowerCase().replace(/\s+/g, "");
        } else if (lastName) {
          calculatedUserName = lastName.toLowerCase().replace(/\s+/g, "");
        } else {
          calculatedUserName = email
            .split("@")[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
        }
      }

      const userDataPayload: Record<string, any> = {};
      if (firstName) {
        userDataPayload.firstName = firstName;
      }
      if (lastName) {
        userDataPayload.lastName = lastName;
      }

      const createUserPayload: any = {
        email,
        password: hashedPassword,
        locale: locale || "es", // Establecer locale, por defecto 'es'
      };

      if (calculatedUserName) {
        createUserPayload.user_name = calculatedUserName; // Corregido de username a user_name
      }

      if (Object.keys(userDataPayload).length > 0) {
        createUserPayload.user_data = userDataPayload;
      }

      const newUser = await this.usersService.create(
        createUserPayload as CreateUserDto
      );
      userIdForAudit = newUser.id; // Asignar el ID del nuevo usuario para el log

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userPayloadForToken } = newUser;
      const accessToken = this.jwtService.sign({
        sub: newUser.id,
        email: newUser.email,
      });

      await this.auditLogsService.create({
        user_id: newUser.id,
        action: AuditAction.USER_REGISTERED, // Corregido: Usar USER_REGISTERED para éxito
        target_type: "User",
        target_id: newUser.id,
        details: JSON.stringify({
          email,
          username: calculatedUserName,
          locale,
        }), // Añadir locale al log
      });

      return {
        accessToken,
        user: userPayloadForToken as UserDto,
      };
    } catch (error) {
      await this.auditLogsService.create({
        user_id: userIdForAudit, // Puede ser undefined si el usuario no se encontró o creó
        action: AuditAction.USER_REGISTERED_FAILED,
        target_type: "User",
        details: JSON.stringify({
          attemptedEmail: email, // Cambiado de 'email' a 'attemptedEmail'
          username: calculatedUserName, // Añadir username si está disponible
          locale, // Añadir locale al log de error
          error: error.message,
        }),
      });
      throw error; // Re-lanzar el error original
    }
  }

  /**
   * Autentica a un usuario existente.
   * @param loginUserDto Credenciales de login.
   * @returns Promesa con AuthResponseDto.
   */
  async login(loginUserDto: LoginUserDto): Promise<AuthResponseDto> {
    const { email, password } = loginUserDto;
    const user = await this.usersService.findByEmail(email); // Cambiado a const
    let userIdForAudit: string | undefined = user?.id;

    try {
      if (!user) {
        userIdForAudit = undefined; // Asegurar que es undefined si el usuario no existe
        throw new UnauthorizedException(
          "Credenciales inválidas - usuario no encontrado"
        );
      }
      userIdForAudit = user.id; // Asegurar que el ID está disponible para el log de fallo de contraseña

      const isPasswordMatching = await bcrypt.compare(password, user.password);
      if (!isPasswordMatching) {
        throw new UnauthorizedException(
          "Credenciales inválidas - contraseña incorrecta"
        );
      }

      if (
        user.status === "inactive" ||
        user.status === "pending_verification"
      ) {
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

      await this.auditLogsService.create({
        user_id: user.id,
        action: AuditAction.USER_LOGIN, // Corregido: Usar USER_LOGIN para éxito
        target_type: "User",
        target_id: user.id,
        details: JSON.stringify({ email }),
      });

      return {
        accessToken,
        user: userPayload as UserDto,
      };
    } catch (error) {
      await this.auditLogsService.create({
        user_id: userIdForAudit, // ID del usuario si se encontró, sino undefined
        action: AuditAction.USER_LOGIN_FAILED,
        target_type: "User",
        target_id: userIdForAudit, // Establecer target_id si el usuario fue encontrado
        details: JSON.stringify({
          attemptedEmail: email, // Cambiado de 'email' a 'attemptedEmail'
          error: error.message,
        }),
      });
      throw error; // Re-lanzar el error original
    }
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
