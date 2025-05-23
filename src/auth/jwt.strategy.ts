import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../users/users.service";

/**
 * Estrategia JWT para Passport. Valida los tokens JWT.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService
  ) {
    const secret = configService.get<string>("JWT_SECRET");
    if (!secret) {
      throw new Error("JWT_SECRET no encontrado en variables de entorno");
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Valida el payload del token JWT.
   * @param payload El payload decodificado del JWT.
   * @returns El objeto de usuario (sin contraseña) si es válido.
   * @throws UnauthorizedException si el token es inválido o el usuario está inactivo.
   */
  async validate(payload: any) {
    const user = await this.usersService.findOne(payload.sub);
    if (!user || user.status === "inactive") {
      throw new UnauthorizedException("Token inválido o usuario inactivo");
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user; // Omite la contraseña.
    return result; // Adjuntado a request.user.
  }
}
