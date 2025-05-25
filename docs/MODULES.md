# Módulos del Backend de CV Creator

Esta sección proporciona una descripción detallada de los principales módulos que componen el backend de CV Creator. Cada archivo Markdown dentro de esta carpeta se enfocará en un módulo específico.

## Estructura General de un Módulo

Un módulo típico en NestJS encapsula un dominio o una característica específica de la aplicación. Generalmente incluye:

- **Módulo (`<module-name>.module.ts`):** Define el módulo, importa otros módulos necesarios, declara controladores y exporta proveedores.
- **Controlador (`<module-name>.controller.ts`):** Maneja las solicitudes HTTP entrantes para las rutas del módulo, interactúa con los servicios y devuelve respuestas.
- **Servicio (`<module-name>.service.ts`):** Contiene la lógica de negocio principal del módulo, interactúa con la base de datos (a través de Prisma) y otros servicios.
- **DTOs (Data Transfer Objects) (en `dto/`):** Clases que definen la estructura de los datos para las solicitudes y respuestas, utilizadas para validación y tipado.
- **Entidades/Interfaces (opcional):** Definiciones de tipos o interfaces específicas del módulo.

## Módulos Principales

A continuación, se listan los módulos clave con una breve descripción. Haz clic en el nombre del módulo para acceder a su documentación detallada (se crearán progresivamente).

- **[USERS.md](./USERS.md):** Gestión de usuarios, perfiles y autenticación (aunque la lógica de autenticación principal reside en `AuthModule`).
- **[CVS.md](./CVS.md):** Creación, gestión y almacenamiento de Currículums Vitae.
- **[COVER_LETTERS.md](./COVER_LETTERS.md):** Creación, gestión y almacenamiento de Cartas de Presentación.
- **[TEMPLATES.md](./TEMPLATES.md):** Gestión de plantillas para CVs y Cartas de Presentación.
- **[SUBSCRIPTIONS.md](./SUBSCRIPTIONS.md):** Manejo de planes de suscripción y el estado de las suscripciones de los usuarios.
- **[PAYMENTS.md](./PAYMENTS.md):** Integración con pasarelas de pago y gestión de transacciones. Incluye la lógica para iniciar pagos y procesar los resultados de las transacciones.
- **[NOTIFICATIONS.md](./NOTIFICATIONS.md):** (Submódulo dentro de Payments/Tefpay) Maneja la recepción y el procesamiento inicial de notificaciones de pasarelas de pago externas, como Tefpay. Emite eventos para que otros servicios (ej. `PaymentsService`) procesen estas notificaciones.
- **[AUTH.md](./AUTH.md):** (Aunque no es un módulo de "recurso" per se, es crucial) Se encarga del registro, inicio de sesión y la estrategia JWT.
- **[PRISMA.md](./PRISMA.md):** (Módulo de utilidad) Proporciona el `PrismaService` para la interacción con la base de datos.
- **[API_TOKENS.md](./API_TOKENS.md):** Gestión de tokens de API para acceso programático.
- **[AUDIT_LOGS.md](./AUDIT_LOGS.md):** Registro de acciones importantes en el sistema, incluyendo la recepción y procesamiento de notificaciones de pago.
- **[EMAIL_LOGS.md](./EMAIL_LOGS.md):** Seguimiento de correos electrónicos enviados por el sistema.
- **[IMAGES.md](./IMAGES.md):** Gestión de la subida y almacenamiento de imágenes (ej. fotos de perfil).
- **[PLANS.md](./PLANS.md):** Gestión de los diferentes planes de suscripción que se ofrecen.

_Nota: La documentación detallada para cada módulo se irá añadiendo progresivamente._
