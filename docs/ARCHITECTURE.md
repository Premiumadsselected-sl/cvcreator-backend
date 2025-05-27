# Arquitectura del Sistema

Este documento describe la arquitectura general del backend de CV Creator. El sistema está diseñado siguiendo los principios de una arquitectura modular y orientada a servicios, utilizando NestJS como marco de trabajo principal.

## 1. Visión General

El backend de CV Creator es una aplicación NestJS que expone una API RESTful. Utiliza Prisma como ORM para interactuar con una base de datos PostgreSQL. La arquitectura se centra en la separación de responsabilidades a través de módulos, controladores, servicios y DTOs (Data Transfer Objects).

```mermaid
graph TD
    A[Cliente (Frontend/Móvil)] -->|HTTPS/REST API| B(NestJS Backend)
    B --> C{Controladores}
    C --> D{Guards (Autenticación/Autorización)}
    C --> E{Servicios}
    E --> F(Prisma ORM)
    F --> G[(Base de Datos PostgreSQL)]
    E --> H[Otros Servicios Externos (ej. Email, Pasarela de Pago)]

    subgraph NestJS Backend
        C
        D
        E
        F
    end
```

## 2. Componentes Principales

### 2.1. NestJS Framework

NestJS proporciona la estructura fundamental de la aplicación. Sus características clave utilizadas incluyen:

- **Módulos (`@Module`)**: Encapsulan la lógica relacionada (ej. `UsersModule`, `CvsModule`). Cada módulo puede tener sus propios controladores, servicios y proveedores.
- **Controladores (`@Controller`)**: Manejan las solicitudes HTTP entrantes, las validan (usando Pipes y DTOs) y delegan la lógica de negocio a los servicios. Definen las rutas de la API.
- **Servicios (`@Injectable`)**: Contienen la lógica de negocio principal. Interactúan con la base de datos (a través de Prisma), realizan cálculos, validaciones complejas y se comunican con otros servicios.
- **Pipes (`@PipeTransform`)**: Se utilizan para la transformación y validación de datos de entrada (ej. `ValidationPipe` para DTOs).
- **Guards (`@CanActivate`)**: Implementan la lógica de autenticación y autorización, protegiendo las rutas.
- **DTOs (Data Transfer Objects)**: Clases simples que definen la estructura de los datos que se transfieren entre el cliente y el servidor, y entre las capas de la aplicación. Se utilizan con `class-validator` y `class-transformer` para la validación y transformación automática.

### 2.2. Prisma ORM

Prisma se utiliza como el Object-Relational Mapper (ORM) para interactuar con la base de datos PostgreSQL. Sus componentes principales en este proyecto son:

- **`schema.prisma`**: Define los modelos de datos, relaciones y la conexión a la base de datos.
- **Prisma Client**: Cliente de base de datos generado automáticamente y con tipado seguro, utilizado por los servicios para realizar operaciones CRUD y consultas complejas.
- **Prisma Migrate**: Herramienta para gestionar las migraciones del esquema de la base de datos.

### 2.3. Base de Datos PostgreSQL

PostgreSQL es el sistema de gestión de bases de datos relacional elegido para almacenar todos los datos persistentes de la aplicación, como información de usuarios, CVs, plantillas, suscripciones, etc.

### 2.4. Autenticación y Autorización

- **JWT (JSON Web Tokens)**: Se utiliza para la autenticación basada en tokens. Tras un inicio de sesión exitoso, se emite un JWT al cliente.
- **Guards de NestJS**: `AuthGuard` verifica la validez de los JWTs en las solicitudes entrantes. Otros guardas como `AdminGuard` o `SubscriptionGuard` implementan lógica de autorización específica basada en roles o estado de suscripción.

## 3. Estructura Modular

El backend está organizado en módulos funcionales para promover la cohesión y el bajo acoplamiento. Algunos de los módulos clave incluyen:

- **`AppModule`**: Módulo raíz de la aplicación.
- **`AuthModule`**: Gestiona la autenticación (registro, inicio de sesión, generación de JWT).
- **`UsersModule`**: Gestiona la información y operaciones relacionadas con los usuarios.
- **`PrismaModule`**: Proporciona el `PrismaService` para la interacción con la base de datos.
- **Módulos de `cvcreator` (`CvsModule`, `CoverLettersModule`, `TemplatesModule`)**: Contienen la lógica central para la creación y gestión de documentos.
- **`SubscriptionsModule`**: Maneja la lógica de suscripciones y planes.
- **`PaymentsModule`**: Se encarga de la integración con pasarelas de pago.

Cada módulo típicamente contiene:

- Un archivo de módulo (`*.module.ts`)
- Controladores (`*.controller.ts`)
- Servicios (`*.service.ts`)
- DTOs (en una subcarpeta `dto/`)
- Opcionalmente, entidades o interfaces específicas del módulo.

## 4. Flujo de una Solicitud Típica

1.  Un cliente envía una solicitud HTTP a un endpoint de la API.
2.  La solicitud llega al controlador de NestJS correspondiente a la ruta.
3.  Si la ruta está protegida, los Guards (ej. `AuthGuard`) se ejecutan para verificar la autenticación y autorización.
4.  Los Pipes (ej. `ValidationPipe`) validan y transforman los datos del cuerpo de la solicitud (payload) utilizando los DTOs definidos.
5.  El controlador llama al método apropiado en el servicio correspondiente, pasando los datos validados.
6.  El servicio ejecuta la lógica de negocio. Esto puede implicar:
    - Interactuar con la base de datos a través de `PrismaService`.
    - Llamar a otros servicios.
    - Realizar cálculos o transformaciones de datos.
7.  El servicio devuelve el resultado al controlador.
8.  El controlador construye la respuesta HTTP y la envía de vuelta al cliente.

## 5. Consideraciones de Diseño

- **Escalabilidad**: La arquitectura modular de NestJS y el uso de un ORM eficiente como Prisma están diseñados para facilitar la escalabilidad.
- **Mantenibilidad**: La separación de responsabilidades y el uso de TypeScript mejoran la mantenibilidad del código.
- **Seguridad**: Se presta atención a la seguridad a través de la validación de entradas, la autenticación basada en JWT y la protección contra vulnerabilidades comunes.
- **Testeabilidad**: La estructura facilita la escritura de pruebas unitarias para servicios y controladores, así como pruebas E2E.

## Módulo de Pagos (`PaymentsModule`)

El `PaymentsModule` es responsable de gestionar la integración con las pasarelas de pago y procesar las transacciones financieras. Sus componentes principales son:

- **`PaymentsController`**: Expone los endpoints para iniciar pagos, recibir notificaciones de webhooks, etc.
- **`PaymentsService`**: Contiene la lógica de negocio para procesar pagos, validar respuestas de las pasarelas, etc.
- **`TefpayService`**: Implementa la lógica específica para interactuar con la pasarela de pago Tefpay.

### Abstracción del Procesador de Pagos

Para permitir la integración de múltiples procesadores de pago (como Tefpay, Stripe, etc.) de una manera flexible, se ha introducido la interfaz `IPaymentProcessor`.

- **`IPaymentProcessor`**: Define un contrato común para todas las operaciones relacionadas con pagos que un procesador debe implementar (ej. `preparePaymentParameters`, `handleWebhookNotification`, `requestSubscriptionCancellation`, `verifySignature`).
- **`PAYMENT_PROCESSOR_TOKEN`**: Un token de NestJS que se utiliza para inyectar la implementación activa del `IPaymentProcessor`.
- **Implementaciones Concretas**: Servicios como `TefpayService` implementan `IPaymentProcessor`. En `PaymentsModule`, se especifica qué servicio se usará para `PAYMENT_PROCESSOR_TOKEN`.

Esto desacopla servicios como `SubscriptionsService` y `PaymentsService` de implementaciones específicas de procesadores de pago.

### Inyección de Dependencias y Circularidad

- `PaymentsModule` se ha marcado como `@Global()` para que el `PAYMENT_PROCESSOR_TOKEN` (y por ende, la implementación de `IPaymentProcessor`) esté disponible para ser inyectado en toda la aplicación sin necesidad de importar `PaymentsModule` explícitamente en cada módulo que lo necesite (como `SubscriptionsModule`).
- Se utiliza `forwardRef()` en las importaciones de `PaymentsModule` y `SubscriptionsModule` para resolver dependencias circulares que surgieron debido a que ambos módulos dependen entre sí.

## Módulo de Suscripciones (`SubscriptionsModule`)

El `SubscriptionsModule` gestiona la lógica relacionada con las suscripciones de los usuarios a diferentes planes de pago. Sus componentes principales son:

- **`SubscriptionsController`**: Expone los endpoints para crear, actualizar y cancelar suscripciones.
- **`SubscriptionsService`**: Contiene la lógica de negocio para gestionar las suscripciones, incluyendo la interacción con el procesador de pagos para activar o cancelar suscripciones.

### Dependencia del Procesador de Pagos

El `SubscriptionsService` ahora depende de la abstracción `IPaymentProcessor` (inyectada mediante `PAYMENT_PROCESSOR_TOKEN`) en lugar de una implementación concreta. Esto le permite interactuar con cualquier procesador de pagos configurado sin conocer sus detalles específicos.
