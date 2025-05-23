# Módulo de Tokens de API (ApiTokens)

## Introducción

El módulo `ApiTokens` está diseñado para gestionar tokens de API que permitirían a aplicaciones de terceros o scripts interactuar programáticamente con `cvcreator-backend`. Actualmente, la funcionalidad principal de este módulo (controlador y servicio) está pendiente de implementación, pero la estructura de datos (`ApiTokenDto`) y el modelo de base de datos (`ApiToken` en `schema.prisma`) ya están definidos.

## Archivos del Módulo

La estructura del módulo `ApiTokens` es la siguiente:

```
src/
└── api-tokens/
    ├── dto/
    │   └── api-token.dto.ts
    ├── api-tokens.controller.ts
    ├── api-tokens.module.ts
    └── api-tokens.service.ts
```

- `api-tokens.controller.ts`: (Próximamente) Manejará las rutas HTTP para la creación, listado y revocación de tokens de API.
- `api-tokens.service.ts`: (Próximamente) Contendrá la lógica de negocio para generar, almacenar de forma segura (hasheada) y validar tokens de API.
- `api-tokens.module.ts`: Define el módulo `ApiTokensModule` de NestJS.
- `dto/api-token.dto.ts`: Contiene el Data Transfer Object (DTO) que representa un token de API.

## Data Transfer Object (DTO)

### `ApiTokenDto`

Representa la estructura de un token de API cuando se devuelve al usuario (por ejemplo, al listar tokens existentes). El token real solo se mostraría una vez en el momento de la creación por razones de seguridad.

```typescript
// src/api-tokens/dto/api-token.dto.ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUUID,
  IsObject, // Debería ser IsArray y cada elemento un string si permissions es string[]
} from "class-validator";

export class ApiTokenDto {
  @ApiProperty({
    description: "API token unique identifier",
    // example: "tkn_a0eebc99", // El ejemplo debería ser un UUID si el campo es IsUUID
    example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: "User ID associated with the API token",
    example: "user-123", // Debería ser un UUID si user_id es un UUID
  })
  @IsString() // O @IsUUID() si user_id es un UUID
  @IsNotEmpty()
  user_id: string;

  @ApiPropertyOptional({
    description: "Optional name for the API token",
    example: "My App Token",
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description:
      "The API token (hashed in DB, actual token shown once on creation)",
    // Este campo probablemente no debería estar en un DTO de respuesta general,
    // o solo el token en sí (no hasheado) en una respuesta de creación.
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({
    description: "Permissions granted to the token",
    example: ["cv:read", "cv:create"],
    type: [String], // Ayuda a Swagger a entender que es un array de strings
  })
  // @IsArray()
  // @IsString({ each: true })
  @IsObject() // Prisma almacena JSON como 'any'. Para validación, se necesitaría un DTO más específico o validadores custom.
  @IsOptional()
  permissions?: any; // string[] o un DTO específico para permisos.

  @ApiPropertyOptional({
    description: "Timestamp when the token was last used",
  })
  @IsDateString()
  @IsOptional()
  last_used_at?: Date;

  @ApiPropertyOptional({ description: "Timestamp when the token expires" })
  @IsDateString()
  @IsOptional()
  expires_at?: Date;

  @ApiProperty({ description: "Timestamp of token creation" })
  @IsDateString()
  @IsNotEmpty()
  createdAt: Date;

  @ApiProperty({ description: "Timestamp of last token update" })
  @IsDateString()
  @IsNotEmpty()
  updatedAt: Date;
}
```

**Campos Clave:**

- `id` (string, UUID): Identificador único del token.
- `user_id` (string): ID del usuario al que pertenece el token.
- `name` (string, opcional): Nombre descriptivo para el token.
- `token` (string): El valor del token. **Importante**: En la base de datos (`schema.prisma`), este campo debe almacenarse hasheado. El token real solo se muestra al usuario una vez en el momento de su creación.
- `permissions` (any/JSON, opcional): Define qué acciones puede realizar el token (ej. `["cv:read", "cv:create"]`).
- `last_used_at` (Date, opcional): Fecha y hora del último uso del token.
- `expires_at` (Date, opcional): Fecha y hora de expiración del token.
- `createdAt` (Date): Fecha y hora de creación.
- `updatedAt` (Date): Fecha y hora de la última actualización.

## Modelo Prisma (`ApiToken`)

El modelo correspondiente en `prisma/schema.prisma` define cómo se almacenan los tokens de API en la base de datos:

```prisma
// prisma/schema.prisma
model ApiToken {
  id           String    @id @default(cuid())
  user_id      String    @db.VarChar(100)
  name         String?   @db.VarChar(100)
  token        String    @unique @db.VarChar(255) // El token hasheado
  permissions  Json?     @default("[]") // Lista de permisos: e.g., ["cv:read", "cv:create"]
  last_used_at DateTime?
  expires_at   DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)
}
```

**Puntos Importantes del Modelo:**

- `token`: Se almacena como `@unique` y debe ser el hash del token real.
- `permissions`: Almacenado como `Json`.
- Relación con `User`: Un token de API pertenece a un usuario.

## Endpoints de la API (Próximamente)

Una vez implementado, el `ApiTokensController` podría exponer endpoints como:

- `POST /api-tokens`: Para crear un nuevo token de API.
  - Request Body: (ej. `CreateApiTokenDto` con `name`, `permissions`, `expires_at`)
  - Response: `ApiTokenDto` (incluyendo el token real **solo esta vez**).
- `GET /api-tokens`: Para listar los tokens de API del usuario autenticado (sin mostrar el valor del token, solo metadatos).
  - Response: `ApiTokenDto[]` (excluyendo el campo `token` o mostrando solo una parte no sensible).
- `GET /api-tokens/{id}`: Para obtener detalles de un token específico (sin el valor del token).
  - Response: `ApiTokenDto` (excluyendo el campo `token`).
- `PATCH /api-tokens/{id}`: Para actualizar un token (ej. nombre, permisos, fecha de expiración).
  - Request Body: (ej. `UpdateApiTokenDto`)
  - Response: `ApiTokenDto`.
- `DELETE /api-tokens/{id}`: Para revocar (eliminar) un token de API.
  - Response: Confirmación (ej. `204 No Content`).

## Flujo de Creación y Uso (Típico)

1.  **Creación**: Un usuario solicita un nuevo token de API a través de la interfaz de la aplicación.
    - El `ApiTokensService` genera un token seguro y único.
    - Genera un hash del token.
    - Almacena el hash en la base de datos junto con los metadatos (nombre, permisos, user_id, etc.).
    - Devuelve el token original (no hasheado) al usuario. **Esta es la única vez que el usuario verá el token completo.**
2.  **Uso**: La aplicación cliente incluye el token de API en las cabeceras de sus solicitudes (ej. `Authorization: Bearer <api_token>`).
3.  **Validación**: En el backend, un `Guard` o middleware interceptaría la solicitud:
    - Extraería el token de la cabecera.
    - Buscaría en la base de datos un token cuyo hash coincida con el hash del token recibido (esto requiere hashear el token entrante con el mismo método o, más comúnmente, buscar por un prefijo no secreto del token y luego comparar hashes si se almacenan tokens parcialmente visibles).
    - Verificaría que el token no haya expirado y que tenga los permisos necesarios para la operación solicitada.
    - Si todo es válido, permitiría el acceso al recurso.

## Consideraciones de Seguridad

- **Almacenamiento Seguro**: Los tokens de API deben almacenarse hasheados en la base de datos (ej. usando SHA256 o un mecanismo similar, **no bcrypt** ya que los tokens deben ser comparables).
- **Mostrar Solo Una Vez**: El valor real del token solo debe mostrarse al usuario inmediatamente después de su creación.
- **Permisos Granulares**: Implementar un sistema de permisos para restringir lo que cada token puede hacer.
- **Expiración**: Los tokens deberían tener una fecha de expiración.
- **Revocación**: Permitir a los usuarios revocar tokens en cualquier momento.
- **Longitud y Entropía**: Generar tokens largos y con alta entropía para dificultar su adivinación.
- **Transporte Seguro**: Siempre transmitir tokens sobre HTTPS.

## Próximos Pasos

- Implementar la lógica en `ApiTokensController` y `ApiTokensService`.
- Definir DTOs para las operaciones de creación (`CreateApiTokenDto`) y actualización (`UpdateApiTokenDto`).
- Desarrollar la estrategia de generación y hasheo de tokens.
- Integrar con el sistema de autenticación para asegurar que solo los usuarios autenticados puedan gestionar sus tokens.
- Implementar `Guards` para proteger los endpoints que requieren autenticación por token de API.
