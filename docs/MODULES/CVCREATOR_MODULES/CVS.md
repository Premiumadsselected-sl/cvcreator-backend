# Módulo de CVs (dentro de CvCreator)

Este módulo es una parte fundamental de la característica `CvCreator` y se encarga de toda la lógica relacionada con la creación, gestión y almacenamiento de los Currículums Vitae (CVs) de los usuarios. Al estar ubicado en `src/cvcreator/cvs/`, se considera un componente específico de la funcionalidad de creación de CVs y no una parte indispensable de la API base general.

## Propósito

- Permitir a los usuarios crear y guardar múltiples CVs.
- Gestionar el contenido de los CVs, que puede ser una estructura JSON compleja.
- Manejar metadatos asociados a cada CV, como nombre, descripción, slug para URL amigables, y estado (borrador, publicado).
- Proporcionar puntos de conexión CRUD para que los usuarios administren sus CVs.
- Asegurar que los usuarios solo puedan acceder y modificar sus propios CVs.

## Estructura de Archivos

El módulo se encuentra en `src/cvcreator/cvs/`:

```
src/
└── cvcreator/
    └── cvs/
        ├── dto/
        │   ├── create-cv.dto.ts
        │   ├── update-cv.dto.ts
        │   └── cv.dto.ts
        ├── cvs.controller.ts
        ├── cvs.module.ts
        └── cvs.service.ts
```

## Componentes Clave

### `cvs.controller.ts`

Define los puntos de conexión de la API para las operaciones con CVs. Requiere autenticación para todas las rutas.

**Puntos de Conexión Principales:**

- `POST /cvs`:
  - Crea un nuevo CV para el usuario autenticado.
  - Body: `CreateCvDto`.
  - Parámetro implícito: `userId` (obtenido a través del decorador `@GetUser()`, que es un placeholder en el código actual y debería ser reemplazado por una implementación real de autenticación).
  - Respuesta: `CvDto`.
- `GET /cvs`:
  - Obtiene todos los CVs pertenecientes al usuario autenticado.
  - Respuesta: `CvDto[]`.
- `GET /cvs/:idOrSlug`:
  - Obtiene un CV específico por su ID (UUID) o por su `slug`.
  - El controlador determina si el parámetro es un UUID para llamar al método de servicio apropiado (`findOne` o `findOneBySlug`).
  - Respuesta: `CvDto`.
- `PATCH /cvs/:id`:
  - Actualiza un CV existente perteneciente al usuario autenticado.
  - Body: `UpdateCvDto`.
  - Respuesta: `CvDto`.
- `DELETE /cvs/:id`:
  - Realiza un borrado lógico (soft delete) de un CV perteneciente al usuario autenticado.
  - Respuesta: `CvDto` (el CV marcado como eliminado).

### `cvs.service.ts`

Contiene la lógica de negocio para la gestión de CVs. Interactúa con la base de datos a través de `PrismaService` y se asegura de que las operaciones estén restringidas al usuario propietario.

_(Nota: El contenido específico de `cvs.service.ts` no fue proporcionado en el último contexto, la siguiente descripción se basa en una implementación típica para los puntos de conexión del controlador)._

**Métodos Principales (esperados):**

- `create(createCvDto: CreateCvDto, userId: string)`: Crea un nuevo CV asociado al `userId`.
- `findAll(userId: string)`: Recupera todos los CVs para un `userId` específico.
- `findOne(id: string, userId: string)`: Encuentra un CV por su ID, verificando que pertenezca al `userId`.
- `findOneBySlug(slug: string, userId: string)`: Encuentra un CV por su `slug`, verificando la pertenencia.
- `update(id: string, updateCvDto: UpdateCvDto, userId: string)`: Actualiza un CV, verificando la pertenencia.
- `remove(id: string, userId: string)`: Realiza un borrado lógico de un CV, verificando la pertenencia.

### DTOs (Objetos de Transferencia de Datos)

_(Nota: El contenido específico de los DTOs no fue proporcionado en el último contexto, la siguiente descripción se basa en nombres de archivo y uso típico)._

- **`cv.dto.ts (`CvDto`)`**: Define la estructura principal de un objeto CV. Probablemente incluye campos como `id`, `user_id`, `name`, `slug`, `description`, `content` (JSON), `status`, `template_id`, `created_at`, `updated_at`, `deleted_at`.
- **`create-cv.dto.ts (`CreateCvDto`)`**: Hereda de `CvDto` (omitiendo campos generados automáticamente como `id`, `user_id`, `created_at`, etc.). Se utiliza para los datos de creación del CV.
- **`update-cv.dto.ts (`UpdateCvDto`)`**: Utiliza `PartialType` para permitir la actualización parcial de campos de `CvDto`.

### `cvs.module.ts`

Declara `CvsController` y `CvsService`, y exporta `CvsService`. Este módulo es importado por `CvCreatorModule`.

## Lógica Específica

- **Pertenencia de Usuario**: Todas las operaciones están (o deberían estar) estrictamente ligadas al `userId` para asegurar que los usuarios solo puedan gestionar sus propios CVs.
- **Búsqueda por ID o Slug**: El controlador permite recuperar CVs tanto por su identificador único como por un `slug` amigable para URLs.
- **Borrado Lógico (Soft Delete)**: Los CVs no se eliminan permanentemente de la base de datos, sino que se marcan como eliminados (probablemente estableciendo un campo `deleted_at`).
- **Autenticación**: El controlador está marcado con `@ApiBearerAuth()` y tiene comentarios para `@UseGuards(JwtAuthGuard)`, indicando que la autenticación es un requisito.
- **Decorador `@GetUser()`**: Se utiliza un placeholder para un decorador que extraería la información del usuario autenticado. En una implementación real, esto provendría de un sistema de autenticación robusto.

## Dependencias

- `@nestjs/common`, `@nestjs/swagger`
- `../../prisma/prisma.service` (esperado para el servicio)
- `../../auth/guards/jwt-auth.guard` (comentado, pero indica dependencia futura)
- `../../auth/decorators/get-user.decorator` (comentado, indica dependencia futura)

Este módulo es central para la funcionalidad de creación de CVs, proporcionando una interfaz completa para que los usuarios gestionen sus documentos.
