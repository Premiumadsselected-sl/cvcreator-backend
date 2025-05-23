# Módulo de Usuarios

El módulo de usuarios es responsable de gestionar toda la información y operaciones relacionadas con los usuarios de la aplicación.

## Propósito

- Crear, leer, actualizar y eliminar (CRUD) usuarios.
- Gestionar los perfiles de usuario.
- Manejar la información de autenticación (aunque la lógica de autenticación principal puede residir en el módulo `AUTH`).

## Estructura de Archivos

El módulo de usuarios normalmente se encuentra en `src/users/` y sigue una estructura estándar de NestJS:

```
src/
└── users/
    ├── dto/
    │   ├── create-user.dto.ts
    │   ├── update-user.dto.ts
    │   └── user.dto.ts
    ├── users.controller.ts
    ├── users.module.ts
    └── users.service.ts
```

## Componentes Clave

### `users.controller.ts`

Este archivo define los puntos de conexión de la API para las operaciones de usuario. Utiliza decoradores de NestJS para manejar las solicitudes HTTP (GET, POST, PATCH, DELETE) y la validación de datos de entrada a través de DTOs. También utiliza Swagger para la documentación de la API.

**Puntos de Conexión Principales:**

- `POST /users`: Crea un nuevo usuario.
  - Body: `CreateUserDto`
  - Respuesta: `UserDto`
- `GET /users`: Obtiene una lista de todos los usuarios.
  - Respuesta: `UserDto[]`
- `GET /users/:id`: Obtiene un usuario específico por su ID.
  - Respuesta: `UserDto`
- `PATCH /users/:id`: Actualiza un usuario existente.
  - Body: `UpdateUserDto`
  - Respuesta: `UserDto`
- `DELETE /users/:id`: Elimina un usuario.

### `users.service.ts`

Contiene la lógica de negocio para las operaciones de usuario. Interactúa con la base de datos (a través del servicio Prisma) para realizar operaciones CRUD.

**Métodos Principales:**

- `create(createUserDto: CreateUserDto)`: Crea un nuevo usuario en la base de datos.
- `findAll()`: Recupera todos los usuarios.
- `findOne(id: string)`: Encuentra un usuario por su ID. Lanza `NotFoundException` si el usuario no se encuentra.
- `update(id: string, updateUserDto: UpdateUserDto)`: Actualiza la información de un usuario. Lanza `NotFoundException` si el usuario no se encuentra.
- `remove(id: string)`: Elimina un usuario de la base de datos. Lanza `NotFoundException` si el usuario no se encuentra.

### DTOs (Objetos de Transferencia de Datos)

Los DTOs se utilizan para definir la forma de los datos para las solicitudes y respuestas de la API, y para la validación.

- **`user.dto.ts (`UserDto`)`**: Define la estructura principal de un objeto de usuario, incluyendo campos como `id`, `email`, `firstName`, `lastName`. Utiliza decoradores `class-validator` para las reglas de validación y `@nestjs/swagger` para la documentación de la API.
- **`create-user.dto.ts (`CreateUserDto`)`**: Hereda de `UserDto` (omitiendo `id`) y añade el campo `password`, que es obligatorio para la creación de usuarios.
- **`update-user.dto.ts (`UpdateUserDto`)`**: Utiliza `PartialType` y `PickType` de `@nestjs/swagger` para permitir la actualización parcial de campos seleccionados de `UserDto` (por ejemplo, `email`, `firstName`, `lastName`, `password`).

## Lógica Específica o Puntos de Conexión de la API

- **Validación:** Los DTOs utilizan `class-validator` para asegurar que los datos de entrada cumplen con los criterios definidos (por ejemplo, formato de email, longitud mínima de la contraseña).
- **Manejo de Errores:** El `UsersService` lanza `NotFoundException` cuando se intenta acceder o modificar un usuario que no existe.
- **Seguridad:** Aunque no se detalla explícitamente en el código proporcionado, la creación de usuarios (`create` en `UsersService`) tiene un TODO para el hash de contraseñas, lo cual es una práctica de seguridad crucial.
- **Documentación de la API:** El `UsersController` está decorado con `@ApiTags`, `@ApiOperation` y `@ApiResponse` de `@nestjs/swagger` para generar automáticamente una documentación detallada de la API.

## Dependencias

- `@nestjs/common`: Funcionalidad principal de NestJS.
- `@nestjs/swagger`: Para la generación de documentación de la API.
- `@prisma/client`: Cliente Prisma para la interacción con la base de datos.
- `../prisma/prisma.service`: Servicio personalizado para encapsular la lógica de Prisma.
- `class-validator`: Para la validación de DTOs.

Este módulo sienta las bases para la gestión de usuarios dentro de la aplicación `cvcreator-backend`.
