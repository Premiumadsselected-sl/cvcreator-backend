# Autenticación y Autorización en CV Creator Backend

Este documento detalla el sistema de autenticación y autorización implementado en el backend de CV Creator.

## 1. Autenticación

La autenticación es el proceso de verificar la identidad de un usuario. En esta API, se utiliza un sistema basado en **JSON Web Tokens (JWT)**.

### 1.1. Flujo de Autenticación

1.  **Registro de Usuario (`/auth/register`):**

    - Un nuevo usuario proporciona sus credenciales (ej. email, contraseña).
    - El servicio de autenticación valida los datos, crea un nuevo registro de usuario en la base de datos (con la contraseña hasheada) y puede devolver un JWT para iniciar sesión automáticamente o requerir un inicio de sesión por separado.

2.  **Inicio de Sesión (`/auth/login`):**

    - Un usuario existente proporciona sus credenciales (ej. email, contraseña).
    - El servicio de autenticación verifica las credenciales contra los datos almacenados en la base de datos.
    - Si las credenciales son correctas, el servicio genera un **Access Token** (JWT).
    - Este `access_token` se devuelve al cliente.

3.  **Acceso a Rutas Protegidas:**
    - Para cada solicitud a una ruta protegida, el cliente debe incluir el `access_token` en la cabecera `Authorization` con el esquema `Bearer`.
      ```
      Authorization: Bearer <access_token>
      ```
    - El `AuthGuard` intercepta la solicitud, extrae el token y lo verifica utilizando `JwtService`.
    - Si el token es válido y no ha expirado, se extrae el payload (que generalmente contiene el ID de usuario (`sub`) y otros datos relevantes) y se adjunta al objeto `request` (ej. `request.user`). La solicitud procede al controlador.
    - Si el token es inválido, ha expirado o no se proporciona, el `AuthGuard` lanza una `UnauthorizedException` (401).

### 1.2. JSON Web Tokens (JWT)

- **Estructura:** Un JWT consta de tres partes: Cabecera (Header), Payload y Firma (Signature).
- **Payload:** El payload del JWT emitido por esta API típicamente contiene:
  - `sub` (Subject): El ID del usuario. Es el identificador principal del usuario autenticado.
  - `email` (Opcional): El email del usuario.
  - `role` (Opcional): El rol del usuario, si se incluye directamente en el token.
  - `iat` (Issued At): Marca de tiempo de cuándo se emitió el token.
  - `exp` (Expiration Time): Marca de tiempo de cuándo expirará el token.
- **Secreto JWT (`JWT_API_SECRET`):** Se utiliza una clave secreta (configurada en las variables de entorno como `JWT_API_SECRET`) para firmar y verificar los tokens. Esta clave debe ser compleja y mantenerse segura.
- **Expiración:** Los access tokens tienen un tiempo de vida limitado para mejorar la seguridad. La duración de la expiración se configura en el `AuthModule` al registrar el `JwtModule`.

### 1.3. Refresh Tokens (Consideración Futura)

Actualmente, el flujo principal se centra en los access tokens. Para una experiencia de usuario más fluida y una seguridad mejorada, se podría implementar un sistema de **Refresh Tokens**:

- Al iniciar sesión, se emiten tanto un `access_token` (de corta duración) como un `refresh_token` (de larga duración).
- Cuando el `access_token` expira, el cliente puede usar el `refresh_token` (enviado a un endpoint específico como `/auth/refresh`) para obtener un nuevo `access_token` sin necesidad de que el usuario vuelva a ingresar sus credenciales.
- Los refresh tokens deben almacenarse de forma segura en el cliente y tener mecanismos de invalidación (ej. al cerrar sesión, al detectar actividad sospechosa).

## 2. Autorización

La autorización es el proceso de determinar si un usuario autenticado tiene los permisos necesarios para realizar una acción específica o acceder a un recurso determinado.

La autorización en esta API se implementa principalmente a través de **Guards de NestJS**.

### 2.1. `AuthGuard`

Si bien su función principal es la autenticación (verificar el JWT), también es el primer paso para la autorización, ya que asegura que hay un usuario autenticado. Se aplica a la mayoría de las rutas que requieren que el usuario haya iniciado sesión.

Ubicación: `src/guards/auth.guard.ts`

### 2.2. `AdminGuard`

Este guarda restringe el acceso a ciertas rutas solo a usuarios que tienen el rol de "admin".

- **Lógica:**
  1.  Asegura que `AuthGuard` se haya ejecutado primero y haya un `request.user` con un `sub` (ID de usuario).
  2.  Consulta la base de datos (usando `PrismaService`) para obtener el registro completo del usuario a partir del `user.sub`.
  3.  Verifica si el campo `role` del usuario en la base de datos es igual a "admin".
  4.  Si no es "admin", lanza una `ForbiddenException` (403).
- **Uso:** Se aplica a controladores o rutas específicas que gestionan funcionalidades administrativas.
  `typescript
  @UseGuards(AuthGuard, AdminGuard)
  @Controller('admin-only-routes')
  export class AdminController { /* ... */ }
  `
  Ubicación: `src/guards/admin.guard.ts`

### 2.3. `SubscriptionGuard`

Este guarda verifica si el usuario autenticado tiene una suscripción activa o en un estado válido (ej. "trialing") para acceder a ciertas características o recursos premium.

- **Lógica:**
  1.  Asegura que `AuthGuard` se haya ejecutado primero.
  2.  Utiliza el `user.sub` (ID de usuario) del token para consultar el `SubscriptionsService`.
  3.  El `SubscriptionsService` (a través de un método como `validateSubscription`) verifica el estado de la suscripción del usuario en la base de datos.
  4.  Si el usuario no tiene una suscripción válida (ej. no existe, está "canceled", "expired", "pending" si no se permite), lanza una `ForbiddenException` (403).
- **Uso:** Se aplica a rutas que ofrecen funcionalidades premium o contenido restringido a suscriptores.
  `typescript
  @UseGuards(AuthGuard, SubscriptionGuard)
  @Get('premium-feature')
  getPremiumFeature() { /* ... */ }
  `
  Ubicación: `src/guards/subscription.guard.ts`

### 2.4. Decorador `GetUser` (Placeholder/Implementación Futura)

Para acceder fácilmente al objeto `user` (el payload del JWT) en los controladores, se puede crear un decorador personalizado (ej. `@GetUser()`).

**Ejemplo de implementación (en `src/auth/decorators/get-user.decorator.ts`):**

```typescript
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // Asume que AuthGuard ha poblado request.user
  }
);
```

**Uso en un controlador:**

```typescript
import { GetUser } from '../auth/decorators/get-user.decorator';
// ...
@Post()
async createResource(@Body() createDto: CreateDto, @GetUser() user: UserPayloadInterface) {
  const userId = user.sub;
  // ... lógica del servicio usando userId ...
}
```

Esto proporciona una forma más limpia y con tipado (si se define `UserPayloadInterface`) de acceder a la información del usuario autenticado.

## 3. Flujo de Autorización Típico

1.  El usuario realiza una solicitud a una ruta protegida.
2.  `AuthGuard` verifica el JWT. Si es válido, adjunta el payload del usuario a `request.user`.
3.  Si hay guardas de autorización adicionales (ej. `AdminGuard`, `SubscriptionGuard`):
    - Cada guarda se ejecuta en orden.
    - Utilizan la información de `request.user` (especialmente `user.sub`) para realizar sus comprobaciones específicas (consultar roles en la DB, estado de suscripción, etc.).
    - Si alguna comprobación falla, el guarda correspondiente lanza una `ForbiddenException` y la solicitud se detiene.
4.  Si todos los guardas pasan, la solicitud llega al método del controlador.

## 4. Consideraciones de Seguridad

- **HTTPS:** Siempre usar HTTPS en producción para proteger los tokens JWT y otros datos en tránsito.
- **Secretos Fuertes:** Utilizar secretos JWT largos, aleatorios y únicos para cada entorno.
- **Manejo de Expiración:** Implementar una lógica adecuada en el cliente para manejar la expiración de tokens y solicitar nuevos (idealmente con refresh tokens).
- **Alcance de Permisos (Scopes):** Para una granularidad más fina, se podría considerar la implementación de scopes o permisos más detallados (más allá de roles simples o estado de suscripción), que podrían incluirse en el JWT o consultarse desde la base de datos.
