# Módulo de Plantillas (Templates) (dentro de CvCreator)

Este módulo, ubicado en `src/cvcreator/templates/`, es responsable de gestionar las plantillas que los usuarios pueden utilizar para formatear sus CVs y, potencialmente, sus cartas de presentación. Como parte de `CvCreator`, este módulo es específico para la funcionalidad de creación de documentos y no se considera un componente central de la API base.

## Propósito

- Almacenar y gestionar una colección de plantillas de diseño para CVs y cartas de presentación.
- Permitir a los administradores (o potencialmente a usuarios con ciertos roles) crear, actualizar y eliminar plantillas.
- Permitir a los usuarios listar y seleccionar plantillas para aplicar a sus documentos.
- Cada plantilla podría tener metadatos como nombre, descripción, una vista previa (imagen o referencia), y la estructura o estilos que define.

## Estructura de Archivos

El módulo se encuentra en `src/cvcreator/templates/`:

```
src/
└── cvcreator/
    └── templates/
        ├── dto/
        │   ├── create-template.dto.ts
        │   ├── update-template.dto.ts
        │   └── template.dto.ts
        ├── templates.controller.ts
        ├── templates.module.ts
        └── templates.service.ts
```

## Componentes Clave

_(La descripción de los componentes se basa en una estructura y funcionalidad típicas para un módulo de gestión de plantillas. El código específico no fue proporcionado en detalle en el último contexto.)_

### `templates.controller.ts`

Definiría los puntos de conexión de la API para las operaciones con plantillas.

**Puntos de Conexión Principales (esperados):**

- `POST /templates` (Potencialmente protegido por roles de administrador): Crear una nueva plantilla.
- `GET /templates`: Obtener una lista de todas las plantillas disponibles para los usuarios.
- `GET /templates/:id`: Obtener una plantilla específica por ID.
- `PATCH /templates/:id` (Potencialmente protegido): Actualizar una plantilla existente.
- `DELETE /templates/:id` (Potencialmente protegido): Eliminar una plantilla.

### `templates.service.ts`

Contendría la lógica de negocio, interactuando con la base de datos.

**Métodos Principales (esperados):**

- `create(createDto)`
- `findAll()`
- `findOne(id)`
- `update(id, updateDto)`
- `remove(id)`

### DTOs (Objetos de Transferencia de Datos)

- **`template.dto.ts (`TemplateDto`)`**: Estructura principal de una plantilla (ej. `id`, `name`, `description`, `type` (CV, Cover Letter), `preview_image_url`, `structure_json` o `style_css`, `created_at`, `updated_at`).
- **`create-template.dto.ts (`CreateTemplateDto`)`**: Para la creación.
- **`update-template.dto.ts (`UpdateTemplateDto`)`**: Para actualizaciones parciales.

### `templates.module.ts`

Declararía el controlador y el servicio, y se importaría en `CvCreatorModule`.

## Lógica Específica (esperada)

- **Tipos de Plantilla**: Podría diferenciar entre plantillas para CVs y plantillas para cartas de presentación.
- **Gestión de Contenido de Plantilla**: El contenido real de la plantilla (HTML, CSS, JSON de estructura) necesitaría ser almacenado y gestionado.
- **Control de Acceso**: Algunas operaciones (crear, actualizar, eliminar) podrían estar restringidas a roles específicos.

## Dependencias (esperadas)

- `@nestjs/common`, `@nestjs/swagger`
- `../../prisma/prisma.service`
- Módulos y decoradores de autenticación/autorización si se implementa control de acceso basado en roles.

Este módulo es crucial para ofrecer personalización y variedad en la apariencia de los documentos generados por `CvCreator`.
