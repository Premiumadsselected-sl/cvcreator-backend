# Módulo de Autenticación (Auth)

## Introducción

El módulo `Auth` es responsable de gestionar la autenticación de usuarios en la aplicación `cvcreator-backend`. Esto incluye el registro de nuevos usuarios, el inicio de sesión de usuarios existentes y la gestión de tokens de acceso.

Actualmente, la lógica principal del controlador (`AuthController`) y del servicio (`AuthService`) está pendiente de implementación. Sin embargo, las estructuras de datos (DTOs) para las operaciones de autenticación ya están definidas.

## Archivos del Módulo

La estructura del módulo `Auth` es la siguiente:

```
src/
└── auth/
    ├── dto/
    │   ├── auth-response.dto.ts
    │   ├── auth-subscription.dto.ts
    │   ├── login-user.dto.ts
    │   └── register-user.dto.ts
    ├── auth.controller.ts
    ├── auth.module.ts
    └── auth.service.ts
```

- `auth.controller.ts`: (Próximamente) Manejará las rutas HTTP relacionadas con la autenticación (ej. `/auth/register`, `/auth/login`).
- `auth.service.ts`: Contendrá la lógica de negocio para el registro, inicio de sesión y gestión de tokens.
- `auth.module.ts`: Define el módulo `AuthModule` de NestJS, encapsulando todos los componentes relacionados con la autenticación.
- `dto/`: Contiene los Data Transfer Objects (DTOs) utilizados para la validación y estructuración de datos en las solicitudes y respuestas de autenticación.

## Pruebas

Se han implementado pruebas unitarias y de integración para el módulo de autenticación:

- **Pruebas Unitarias (`test/unit/auth/auth.service.spec.ts`):**

  - Prueban la lógica de negocio de `AuthService` de forma aislada.
  - Mockean dependencias como `UsersService` y `JwtService`.
  - Cubren escenarios de éxito y error para los métodos `register`, `login`, `validateUserById` y `getProfile`.

- **Pruebas de Integración (`test/integration/auth/auth.module.spec.ts`):**
  - Prueban la correcta instanciación y configuración del `AuthModule`.
  - Verifican que los proveedores principales como `AuthService` y `JwtService` se puedan resolver correctamente dentro del contexto del módulo.
  - Aseguran la correcta importación de módulos dependientes como `UsersModule` y la disponibilidad de sus servicios exportados.

Para ejecutar estas pruebas, consulta la sección de [Pruebas](../../TESTING.md).

## Data Transfer Objects (DTOs)

### 1. `RegisterUserDto`

Utilizado para el registro de un nuevo usuario.

```typescript
// src/auth/dto/register-user.dto.ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
} from "class-validator";

export class RegisterUserDto {
  @ApiProperty({
    description: "Users email address. Must be a valid email format.",
    example: "test@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Users password. Minimum 8 characters.",
    example: "P@sswOrd123",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: "Users first name.",
    example: "John",
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: "Users last name.",
    example: "Doe",
  })
  @IsString()
  @IsOptional()
  lastName?: string;
}
```

**Campos:**

- `email` (string, obligatorio): Dirección de correo electrónico del usuario. Debe tener un formato de email válido.
- `password` (string, obligatorio): Contraseña del usuario. Mínimo 8 caracteres.
- `firstName` (string, opcional): Nombre del usuario.
- `lastName` (string, opcional): Apellido del usuario.

### 2. `LoginUserDto`

Utilizado para el inicio de sesión de un usuario existente.

```typescript
// src/auth/dto/login-user.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginUserDto {
  @ApiProperty({
    description: "Users email address.",
    example: "test@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Users password.",
    example: "P@sswOrd123",
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
```

**Campos:**

- `email` (string, obligatorio): Dirección de correo electrónico del usuario.
- `password` (string, obligatorio): Contraseña del usuario.

### 3. `AuthResponseDto`

Representa la respuesta devuelta tras un inicio de sesión o registro exitoso.

```typescript
// src/auth/dto/auth-response.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import { UserDto } from "../../users/dto/user.dto";
import { IsNotEmpty, IsString } from "class-validator";

export class AuthResponseDto {
  @ApiProperty({
    description: "JWT Access Token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({
    description: "Authenticated user details",
    type: () => UserDto, // Using a factory function for Swagger to handle circular dependencies
  })
  user: UserDto;
}
```

**Campos:**

- `accessToken` (string): Token de acceso JWT generado para el usuario.
- `user` (`UserDto`): Detalles del usuario autenticado (ver `USERS.md` para la estructura de `UserDto`).

### 4. `AuthSubscriptionDto`

DTO para gestionar la información de suscripción relacionada con la autenticación o el perfil del usuario. Podría usarse para actualizar o mostrar el plan de suscripción de un usuario.

```typescript
// src/auth/dto/auth-subscription.dto.ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUUID,
} from "class-validator";

export enum SubscriptionPlanType {
  FREE = "free",
  BASIC = "basic",
  PREMIUM = "premium",
}

export class AuthSubscriptionDto {
  @ApiProperty({
    description: "User ID for the subscription. Must be a valid UUID.",
    example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: "Subscription plan type.",
    enum: SubscriptionPlanType,
    example: SubscriptionPlanType.PREMIUM,
  })
  @IsEnum(SubscriptionPlanType)
  @IsNotEmpty()
  plan: SubscriptionPlanType;

  @ApiPropertyOptional({
    description: "Subscription status (e.g., active, inactive, canceled).",
    example: "active",
  })
  @IsString()
  @IsOptional()
  status?: string;
}
```

**Campos:**

- `userId` (string, obligatorio): ID del usuario (UUID) al que pertenece la suscripción.
- `plan` (`SubscriptionPlanType`, obligatorio): Tipo de plan de suscripción (ej. `free`, `basic`, `premium`).
- `status` (string, opcional): Estado de la suscripción (ej. `active`, `inactive`, `canceled`). Se sugiere usar un enum para este campo en el futuro.

## Endpoints de la API (Próximamente)

Una vez implementado, el `AuthController` expondrá endpoints como:

- `POST /auth/register`: Para registrar un nuevo usuario.
  - Request Body: `RegisterUserDto`
  - Response: `AuthResponseDto` (o un subconjunto si el login es un paso separado)
- `POST /auth/login`: Para iniciar sesión.
  - Request Body: `LoginUserDto`
  - Response: `AuthResponseDto`
- `GET /auth/me` (o similar, protegido): Para obtener los detalles del usuario autenticado actualmente.
  - Response: `UserDto`

## Flujo de Autenticación (Típico)

1.  **Registro**: El usuario envía sus datos (email, contraseña, etc.) al endpoint `/auth/register`.
    - El `AuthService` valida los datos.
    - Crea una nueva entrada de usuario en la base de datos (usualmente con la contraseña hasheada).
    - (Opcional) Puede iniciar sesión automáticamente al usuario y devolver un `AuthResponseDto`.
2.  **Inicio de Sesión**: El usuario envía sus credenciales (email, contraseña) al endpoint `/auth/login`.
    - El `AuthService` verifica las credenciales contra la base de datos.
    - Si son válidas, genera un JWT (`accessToken`).
    - Devuelve el `AuthResponseDto` conteniendo el token y los datos del usuario.
3.  **Acceso a Rutas Protegidas**: Para acceder a recursos protegidos, el cliente debe incluir el `accessToken` en la cabecera `Authorization` de sus solicitudes (normalmente como `Bearer <token>`).
    - Se utilizarán Guards de NestJS (ej. `AuthGuard('jwt')`) para proteger las rutas.

## Consideraciones de Seguridad

- **Hashing de Contraseñas**: Las contraseñas deben ser almacenadas siempre hasheadas (ej. usando bcrypt).
- **JWT**: Los JSON Web Tokens son el método estándar para manejar sesiones en APIs stateless.
  - Deben tener una expiración corta.
  - Considerar el uso de refresh tokens para una mayor seguridad y mejor experiencia de usuario.
- **Validación de Entrada**: Todos los datos de entrada deben ser validados usando `class-validator` y DTOs.
- **HTTPS**: La comunicación debe ser siempre sobre HTTPS en producción.

## Próximos Pasos

- Implementar la lógica en `AuthController` y `AuthService`.
- Integrar con el `UsersService` para la creación y búsqueda de usuarios.
- Configurar la estrategia JWT (ej. `passport-jwt`) y los `AuthGuard`.
- Añadir manejo de errores y respuestas HTTP adecuadas.
