# Esquema de la Base de Datos (Prisma)

Este documento proporciona una visión general del esquema de la base de datos utilizado por el backend de CV Creator. El esquema está definido y gestionado utilizando Prisma ORM.

El archivo fuente principal para el esquema de Prisma es `prisma/schema.prisma`.

## Modelos Principales

A continuación, se describen los modelos de datos más importantes definidos en `schema.prisma`. Para obtener la definición completa y actualizada, consulta directamente el archivo `schema.prisma`.

### 1. `User`

Representa a un usuario registrado en el sistema.

- **Campos Clave (ejemplos):**
  - `id`: Identificador único (String, CUID).
  - `email`: Dirección de correo electrónico única del usuario (String).
  - `password`: Contraseña hasheada del usuario (String).
  - `role`: Rol del usuario (ej. "subscriber", "admin") (String, opcional).
  - `user_name`: Nombre de usuario (String, opcional).
  - `status`: Estado de la cuenta (ej. "active", "inactive", "pending_verification") (String, opcional).
  - `createdAt`, `updatedAt`, `deletedAt`: Marcas de tiempo para el ciclo de vida del registro.
- **Relaciones:**
  - Uno a muchos con `Cv`, `CoverLetter`, `Subscription`, `Payment`, `Image`, `ApiToken`.

### 2. `Cv`

Representa un currículum vitae creado por un usuario.

- **Campos Clave (ejemplos):**
  - `id`: Identificador único (String, CUID).
  - `user_id`: ID del usuario propietario (String, relación con `User`).
  - `title`: Título del CV (String).
  - `slug`: Slug único para URLs amigables (String, opcional).
  - `content`: Estructura JSON del contenido del CV (Json). Este campo almacena todas las secciones y sus datos (ej. información de contacto, experiencia, educación, habilidades).
  - `template_id`: ID de la plantilla utilizada (String, opcional, relación con `Template`).
  - `settings`: Configuración específica del CV (ej. colores, fuentes) (Json, opcional).
  - `is_public`: Booleano para indicar si el CV es públicamente accesible.
  - `createdAt`, `updatedAt`, `deletedAt`: Marcas de tiempo.
- **Relaciones:**
  - Muchos a uno con `User`.
  - Muchos a uno con `Template` (opcional).

### 3. `CoverLetter`

Representa una carta de presentación creada por un usuario.

- **Campos Clave (ejemplos):**
  - `id`: Identificador único (String, CUID).
  - `user_id`: ID del usuario propietario (String, relación con `User`).
  - `title`: Título de la carta (String).
  - `slug`: Slug único (String, opcional).
  - `content`: Estructura JSON del contenido de la carta (Json).
  - `template_id`: ID de la plantilla utilizada (String, opcional, relación con `Template`).
  - `settings`: Configuración específica (Json, opcional).
  - `createdAt`, `updatedAt`, `deletedAt`: Marcas de tiempo.
- **Relaciones:**
  - Muchos a uno con `User`.
  - Muchos a uno con `Template` (opcional).

### 4. `Template`

Representa una plantilla de diseño para CVs o cartas de presentación.

- **Campos Clave (ejemplos):**
  - `id`: Identificador único (String, CUID).
  - `name`: Nombre único de la plantilla (String).
  - `type`: Tipo de plantilla (ej. "cv", "cover_letter") (String).
  - `description`: Descripción de la plantilla (String, opcional).
  - `preview_image_url`: URL de una imagen de vista previa (String, opcional).
  - `structure`: Estructura JSON base de la plantilla (Json). Define los marcadores de posición y la disposición general.
  - `category`: Categoría de la plantilla (ej. "modern", "classic") (String, opcional).
  - `is_premium`: Booleano para indicar si es una plantilla premium.
  - `usage_count`: Contador de cuántas veces se ha utilizado la plantilla (Int).
  - `createdAt`, `updatedAt`: Marcas de tiempo.
- **Relaciones:**
  - Uno a muchos con `Cv`, `CoverLetter`.

### 5. `Subscription`

Representa la suscripción de un usuario a un plan.

- **Campos Clave (ejemplos):**
  - `id`: Identificador único (String, CUID).
  - `user_id`: ID del usuario suscrito (String, relación con `User`, único).
  - `plan_id`: ID del plan al que está suscrito (String, relación con `Plan`).
  - `status`: Estado de la suscripción (ej. "active", "inactive", "trialing", "pending", "cancelled") (String).
  - `current_period_start`, `current_period_end`: Fechas del período de facturación actual.
  - `trial_start`, `trial_end`: Fechas del período de prueba (opcional).
  - `tefpay_transaction_id`: ID de la transacción de Tefpay asociada (String, opcional).
  - `createdAt`, `updatedAt`: Marcas de tiempo.
- **Relaciones:**
  - Muchos a uno con `User`.
  - Muchos a uno con `Plan`.
  - Uno a muchos con `Payment`, `TefPayNotification`.

### Tabla `Subscription`

| Campo                     | Tipo                          | Descripción                                                                                                 | Notas                                 |
| :------------------------ | :---------------------------- | :---------------------------------------------------------------------------------------------------------- | :------------------------------------ |
| `id`                      | `String @id @default(cuid())` | Identificador único de la suscripción.                                                                      |                                       |
| `user_id`                 | `String`                      | ID del usuario suscrito.                                                                                    | Relación con el modelo `User`.        |
| `plan_id`                 | `String`                      | ID del plan al que está suscrito el usuario.                                                                | Relación con el modelo `Plan`.        |
| `status`                  | `String`                      | Estado de la suscripción (ej. "active", "inactive").                                                        |                                       |
| `current_period_start`    | `DateTime`                    | Fecha de inicio del período de facturación actual.                                                          |                                       |
| `current_period_end`      | `DateTime`                    | Fecha de fin del período de facturación actual.                                                             |                                       |
| `trial_start`             | `DateTime?`                   | Fecha de inicio del período de prueba (opcional).                                                           |                                       |
| `trial_end`               | `DateTime?`                   | Fecha de fin del período de prueba (opcional).                                                              |                                       |
| `processorSubscriptionId` | `String?`                     | ID de la suscripción en el sistema del procesador de pagos (ej. ID de suscripción de Tefpay).               | Anteriormente `tefpaySubscriptionId`. |
| `processorCustomerId`     | `String?`                     | ID del cliente en el sistema del procesador de pagos (ej. ID de cliente de Tefpay).                         | Anteriormente `tefpayCustomerId`.     |
| `paymentMethod`           | `String?`                     | Método de pago utilizado para la suscripción (ej. `card`, `paypal`, etc., según lo devuelva el procesador). |                                       |
| `createdAt`               | `DateTime @default(now())`    | Marca de tiempo de creación de la suscripción.                                                              |                                       |
| `updatedAt`               | `DateTime @updatedAt`         | Marca de tiempo de la última actualización de la suscripción.                                               |                                       |

### Cambios Recientes en el Esquema

Se refactorizó la tabla `Subscription` para que sea agnóstica al procesador de pagos:

- `tefpaySubscriptionId` se renombró a `processorSubscriptionId`.
- `tefpayCustomerId` se renombró a `processorCustomerId`.

Estos cambios permiten almacenar identificadores de diferentes procesadores de pago en los mismos campos.

### 6. `Plan`

Define los diferentes planes de suscripción ofrecidos.

- **Campos Clave (ejemplos):**
  - `id`: Identificador único (String, CUID).
  - `name`: Nombre único del plan (String).
  - `price`: Precio del plan (Float).
  - `currency`: Moneda del precio (String, ej. "EUR").
  - `billing_interval`: Intervalo de facturación (ej. "month", "year") (String).
  - `features`: Lista de características del plan (Json, opcional).
  - `active`: Booleano para indicar si el plan está activo.
  - `createdAt`, `updatedAt`: Marcas de tiempo.
- **Relaciones:**
  - Uno a muchos con `Subscription`.

### 7. `Payment`

Registra las transacciones de pago.

- **Campos Clave (ejemplos):**
  - `id`: Identificador único (String, CUID).
  - `user_id`: ID del usuario que realiza el pago (String, relación con `User`).
  - `subscription_id`: ID de la suscripción asociada (String, opcional, relación con `Subscription`).
  - `amount`: Monto del pago (Float).
  - `currency`: Moneda (String).
  - `status`: Estado del pago (ej. "pending", "succeeded", "failed") (String).
  - `processor`: Procesador de pago utilizado (ej. "tefpay") (String).
  - `processor_payment_id`: ID del pago en el procesador (String, único, opcional).
  - `createdAt`, `updatedAt`: Marcas de tiempo.
- **Relaciones:**
  - Muchos a uno con `User`.
  - Muchos a uno con `Subscription` (opcional).
  - Uno a muchos con `TefPayNotification`.

### 8. `TefPayNotification`

Almacena las notificaciones recibidas de la pasarela de pago Tefpay.

- **Campos Clave (ejemplos):**
  - `id`: Identificador único (String, CUID).
  - `ds_Order`: Número de pedido de Tefpay (String, opcional).
  - `ds_Code`: Código de resultado de la operación de Tefpay (String, opcional).
  - `raw_notification`: Notificación completa en formato JSON (Json).
  - `status`: Estado de procesamiento de la notificación (ej. "received", "processed", "error") (String).
  - `payment_id`: ID del pago asociado (String, opcional, relación con `Payment`).
  - `subscription_id`: ID de la suscripción asociada (String, opcional, relación con `Subscription`).
  - `createdAt`, `updatedAt`: Marcas de tiempo.
- **Relaciones:**
  - Muchos a uno con `Payment` (opcional).
  - Muchos a uno con `Subscription` (opcional).

### Otros Modelos

El esquema puede incluir otros modelos como:

- `Image`: Para almacenar información sobre imágenes subidas por los usuarios.
- `ApiToken`: Para gestionar tokens de API para acceso programático.
- `AuditLog`: Para registrar acciones importantes en el sistema.
- `EmailLog`: Para rastrear los correos electrónicos enviados.

## Relaciones

Prisma permite definir relaciones claras entre los modelos (uno a uno, uno a muchos, muchos a muchos). Estas relaciones se especifican en `schema.prisma` y son cruciales para mantener la integridad de los datos y facilitar consultas complejas.

## Migraciones

Cualquier cambio en el `schema.prisma` (añadir modelos, campos, relaciones, o modificar tipos) requiere la creación y aplicación de una migración para actualizar la estructura de la base de datos. Esto se gestiona con los comandos de Prisma Migrate:

- `pnpm prisma migrate dev`: Crea una nueva migración basada en los cambios del esquema y la aplica a la base de datos de desarrollo.
- `pnpm prisma migrate deploy`: Aplica las migraciones pendientes a una base de datos de producción o staging.

## Consideraciones sobre el Tipo `Json`

Los campos de tipo `Json` (como `content` en `Cv` y `CoverLetter`, o `structure` en `Template`) ofrecen flexibilidad para almacenar datos no estructurados o semi-estructurados. Sin embargo, es importante tener en cuenta:

- **Validación:** La validación de la estructura interna de estos campos JSON debe ser manejada a nivel de aplicación (ej. usando DTOs y `class-validator` antes de guardar los datos).
- **Consultas:** Consultar datos dentro de campos JSON puede ser menos eficiente y más complejo que consultar campos relacionales estándar. Prisma ofrece algunas capacidades para filtrar por campos JSON, pero deben usarse con consideración.

## Nota sobre Revisión Pendiente

**Importante**: Existe una revisión pendiente exhaustiva del sistema de pagos, notificaciones (especialmente Tefpay), y la lógica de suscripciones y planes. Consultar el `CHANGE_LOG-2025-05-24.md` para más detalles sobre los puntos específicos que requieren atención y validación para asegurar la robustez y correcto funcionamiento del sistema de monetización.

Esta descripción general debería proporcionar una buena comprensión del esquema de la base de datos. Para detalles más precisos, siempre consulta el archivo `prisma/schema.prisma`.
