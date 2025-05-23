import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { UserDto } from "../../users/dto/user.dto"; // Asegurar que la ruta al DTO del usuario sea correcta.

/**
 * Decorador de parámetro para extraer el objeto `user` del request.
 * Asume que `JwtAuthGuard` y `JwtStrategy` han adjuntado el usuario al request.
 * @param data Datos opcionales pasados al decorador (no usados aquí).
 * @param ctx El contexto de ejecución de la petición.
 * @returns El objeto UserDto adjunto al request.
 */
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserDto => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as UserDto; // `request.user` es poblado por Passport después de la validación del JWT.
  }
);
