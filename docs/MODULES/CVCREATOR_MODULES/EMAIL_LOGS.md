# Módulo de Registros de Email (EmailLogs) (dentro de CvCreator)

Este módulo se encarga de registrar los correos electrónicos enviados por el sistema, específicamente aquellos relacionados con la funcionalidad de `CvCreator`. Al igual que otros módulos dentro de `cvcreator/`, se considera parte de una característica modular y no un componente central indispensable de la API base.

## Propósito

- Mantener un historial de los correos electrónicos enviados.
- Registrar el estado de envío de cada correo (pendiente, enviado, fallido, rebotado).
- Facilitar la auditoría y el seguimiento de las comunicaciones por correo electrónico.

## Estructura de Archivos

El módulo se encuentra en `src/cvcreator/emails/email-logs/`:

```
src/
└── cvcreator/
    └── emails/
        └── email-logs/
            ├── dto/
            │   └── email-log.dto.ts
            ├── email-logs.controller.ts
            ├── email-logs.module.ts
            └── email-logs.service.ts
```

## Componentes Clave

### `email-logs.controller.ts`

Actualmente, el controlador `EmailLogsController` está definido de forma básica (`@Controller("email-logs") export class EmailLogsController {}`) y no expone puntos de conexión CRUD explícitos en el código fuente proporcionado. Suponiendo una implementación estándar, podría incluir:

- `GET /email-logs`: Para obtener una lista de todos los registros de email, posiblemente con filtros.
- `GET /email-logs/:id`: Para obtener un registro de email específico.

_(Nota: La implementación actual es un esqueleto y necesitaría desarrollo adicional para ser completamente funcional con puntos de conexión API)._

### `email-logs.service.ts`

De manera similar al controlador, el `EmailLogsService` está definido de forma básica (`@Injectable() export class EmailLogsService {}`). Una implementación completa se encargaría de:

- Crear nuevos registros de email cuando se envían correos.
- Actualizar el estado de los registros de email.
- Consultar registros de email.

_(Nota: La implementación actual es un esqueleto y necesitaría desarrollo adicional para la lógica de negocio)._

### DTOs (Objetos de Transferencia de Datos)

- **`email-log.dto.ts (`EmailLogDto`)`**: Define la estructura de un registro de email. Incluye campos como:
  - `id`: Identificador único del registro.
  - `user_id`: ID del usuario asociado (opcional).
  - `recipient_email`: Dirección de correo del destinatario.
  - `subject`: Asunto del correo.
  - `body`: Cuerpo del correo o ruta a una plantilla (opcional).
  - `status`: Estado del envío (usando el enum `EmailLogStatus`).
  - `sent_at`: Marca de tiempo de cuándo se envió el correo (opcional).
  - `provider`: Proveedor de correo utilizado (opcional).
  - `provider_response`: Respuesta del proveedor (opcional).
  - `error_message`: Mensaje de error si falló el envío (opcional).
  - `createdAt`, `updatedAt`: Marcas de tiempo de creación y actualización del registro.
  - `EmailLogStatus`: Un enum definido dentro de este archivo (`PENDING`, `SENT`, `FAILED`, `BOUNCED`).

### `email-logs.module.ts`

Declara `EmailLogsController` y `EmailLogsService`, y exporta `EmailLogsService`. Este módulo es importado por `CvCreatorModule`.

## Lógica Específica

- **Seguimiento de Estado**: El enum `EmailLogStatus` permite un seguimiento detallado del proceso de envío de correos.
- **Integración Potencial**: Este módulo estaría estrechamente integrado con cualquier servicio de envío de correos que utilice la aplicación.

## Dependencias

- `@nestjs/common`, `@nestjs/swagger` (para DTOs y futura expansión del controlador).
- `../../prisma/prisma.service` (sería necesario para una implementación completa del servicio para interactuar con la base de datos).
- `@prisma/client` (sería necesario para los tipos de Prisma en el servicio).

Este módulo, una vez completamente implementado, proporcionaría una capacidad valiosa para el seguimiento y la auditoría de las comunicaciones por correo electrónico relacionadas con `CvCreator`.
