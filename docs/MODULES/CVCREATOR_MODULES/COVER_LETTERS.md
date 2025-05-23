# Módulo de Cartas de Presentación (CoverLetters) (dentro de CvCreator)

Este módulo, parte de la característica `CvCreator`, gestiona la creación, almacenamiento y administración de las cartas de presentación de los usuarios. Al igual que el módulo de CVs, se encuentra en `src/cvcreator/cover-letters/` y es específico de la funcionalidad de creación de documentos de solicitud de empleo, no siendo un componente central de la API base.

## Propósito

- Permitir a los usuarios crear y guardar múltiples cartas de presentación.
- Gestionar el contenido de las cartas, que podría ser texto enriquecido o una estructura JSON.
- Manejar metadatos asociados a cada carta, como título, para quién va dirigida, y estado.
- Proporcionar puntos de conexión CRUD para que los usuarios administren sus cartas de presentación.
- Asegurar que los usuarios solo puedan acceder y modificar sus propias cartas.

## Estructura de Archivos

El módulo se encuentra en `src/cvcreator/cover-letters/`:

```
src/
└── cvcreator/
    └── cover-letters/
        ├── dto/
        │   ├── create-cover-letter.dto.ts
        │   ├── update-cover-letter.dto.ts
        │   └── cover-letter.dto.ts
        ├── cover-letters.controller.ts
        ├── cover-letters.module.ts
        └── cover-letters.service.ts
```

## Componentes Clave

_(La descripción de los componentes se basa en una estructura y funcionalidad análogas al módulo de CVs, ya que el código específico no fue proporcionado en detalle en el último contexto. Se asume una implementación estándar de NestJS para un recurso CRUD con autenticación y pertenencia de usuario.)_

### `cover-letters.controller.ts`

Definiría los puntos de conexión de la API para las operaciones con cartas de presentación. Requeriría autenticación.

**Puntos de Conexión Principales (esperados):**

- `POST /cover-letters`: Crear una nueva carta de presentación.
- `GET /cover-letters`: Obtener todas las cartas del usuario autenticado.
- `GET /cover-letters/:id`: Obtener una carta específica por ID.
- `PATCH /cover-letters/:id`: Actualizar una carta existente.
- `DELETE /cover-letters/:id`: Eliminar (posiblemente borrado lógico) una carta.

### `cover-letters.service.ts`

Contendría la lógica de negocio, interactuando con la base de datos y asegurando la pertenencia de usuario.

**Métodos Principales (esperados):**

- `create(createDto, userId)`
- `findAll(userId)`
- `findOne(id, userId)`
- `update(id, updateDto, userId)`
- `remove(id, userId)`

### DTOs (Objetos de Transferencia de Datos)

- **`cover-letter.dto.ts (`CoverLetterDto`)`**: Estructura principal de una carta de presentación (ej. `id`, `user_id`, `title`, `recipient_info`, `content`, `status`, `created_at`, `updated_at`).
- **`create-cover-letter.dto.ts (`CreateCoverLetterDto`)`**: Para la creación.
- **`update-cover-letter.dto.ts (`UpdateCoverLetterDto`)`**: Para actualizaciones parciales.

### `cover-letters.module.ts`

Declararía el controlador y el servicio, y se importaría en `CvCreatorModule`.

## Lógica Específica (esperada)

- Pertenencia de Usuario.
- Borrado Lógico (Soft Delete) si aplica.
- Autenticación para todos los puntos de conexión.

## Dependencias (esperadas)

- `@nestjs/common`, `@nestjs/swagger`
- `../../prisma/prisma.service`
- Módulos y decoradores de autenticación.

Este módulo complementa la funcionalidad de CVs, permitiendo a los usuarios gestionar otro documento crucial en el proceso de búsqueda de empleo.
