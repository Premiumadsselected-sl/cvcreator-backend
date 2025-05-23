import { SetMetadata } from "@nestjs/common";

/**
 * Clave para almacenar metadatos de roles.
 */
export const ROLES_KEY = "roles";

/**
 * Decorador para asignar roles requeridos a un controlador o ruta.
 * @param roles - Lista de roles permitidos para acceder al recurso.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
