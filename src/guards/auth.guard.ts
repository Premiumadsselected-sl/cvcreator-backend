import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("Authentication token not provided.");
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>("JWT_API_SECRET"), // Asegúrate que JWT_API_SECRET esté en tus .env
      });
      // Adjunta el payload al objeto request.
      // Define una interfaz extendida para Request si quieres tipado fuerte en request.user
      (request as any).user = payload;
    } catch (error) {
      // Puedes loguear el error o manejar diferentes tipos de errores JWT (TokenExpiredError, JsonWebTokenError)
      throw new UnauthorizedException(
        `Invalid or expired authentication token. (${error.message})`
      );
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
