# Gestión de Pagos (PaymentsModule)

El `PaymentsModule` es responsable de todas las operaciones relacionadas con el procesamiento de pagos en la aplicación. Esto incluye la iniciación de pagos, la gestión de diferentes procesadores de pago, y el manejo de notificaciones de los mismos.

## Arquitectura

La arquitectura del módulo de pagos ha sido diseñada para ser flexible y soportar múltiples procesadores de pago de forma dinámica.

### Interfaz `IPaymentProcessor`

Se define una interfaz genérica `IPaymentProcessor` (`src/payments/processors/payment-processor.interface.ts`) que establece el contrato que deben cumplir todos los procesadores de pago. Actualmente, esta interfaz define el método `preparePaymentParameters` para obtener los datos necesarios para redirigir al usuario a la pasarela de pago.

```typescript
export interface PreparePaymentParams {
  amount: number; // En centavos o la unidad mínima de la moneda
  currency: string;
  order: string; // Referencia única del pedido en nuestro sistema
  merchant_data?: string; // Datos adicionales para el comerciante
  product_description?: string;
  customer_email?: string;
  success_url?: string; // URL a la que redirigir en caso de éxito
  cancel_url?: string; // URL a la que redirigir en caso de cancelación
  notification_url?: string; // URL para notificaciones del procesador (webhook)
  metadata?: Record<string, any>; // Metadatos adicionales
}

export interface PreparedPaymentResponse {
  url: string; // URL a la que redirigir al usuario o para mostrar en un iframe
  fields: Record<string, string>; // Campos a enviar si es un formulario POST
  payment_processor_name: string; // Nombre del procesador, ej: 'tefpay'
}

export interface IPaymentProcessor {
  preparePaymentParameters(
    params: PreparePaymentParams
  ): PreparedPaymentResponse;
  // Futuros métodos como handleWebhookNotification, processRefund, etc.
}
```

### Selección Dinámica del Procesador

El procesador de pago activo se determina en tiempo de ejecución basándose en la variable de entorno `ACTIVE_PAYMENT_PROCESSOR`.

- **`ACTIVE_PAYMENT_PROCESSOR`**: Esta variable de entorno especifica el nombre del procesador de pago que se utilizará. Por ejemplo, `ACTIVE_PAYMENT_PROCESSOR=tefpay`.
- **Valor por defecto**: Si la variable `ACTIVE_PAYMENT_PROCESSOR` no está definida, el sistema utilizará `"tefpay"` como procesador por defecto.

El `PaymentsModule` utiliza un _factory provider_ (`useFactory`) para inyectar la implementación correcta de `IPaymentProcessor` (a través del token `PAYMENT_PROCESSOR_TOKEN`) en el `PaymentsService`. La fábrica lee la variable de entorno `ACTIVE_PAYMENT_PROCESSOR` mediante `ConfigService` y devuelve la instancia del servicio del procesador correspondiente (ej. `TefpayService`).

El token de inyección `PAYMENT_PROCESSOR_TOKEN` es un `Symbol` definido en `src/payments/payment-processor.token.ts` para evitar colisiones de nombres.

### `PaymentsService`

El `PaymentsService` (`src/payments/payments.service.ts`) consume la interfaz `IPaymentProcessor` inyectada para realizar operaciones de pago, abstrayéndose de la implementación concreta del procesador.

El método `create` del `PaymentsService` también permite opcionalmente especificar un procesador de pago a través del campo `processor` en `CreatePaymentDto`. Si se proporciona, este procesador tendría precedencia sobre el configurado globalmente (esta funcionalidad está contemplada pero su implementación completa dependerá de la gestión de múltiples instancias de procesadores).

## Procesadores Implementados

Actualmente, el único procesador de pago implementado es:

- **Tefpay**: `TefpayService` (`src/payments/tefpay/tefpay.service.ts`) implementa `IPaymentProcessor` para interactuar con la pasarela de Tefpay.

## Configuración

Para configurar el módulo de pagos, asegúrate de que las siguientes variables de entorno estén definidas en tu archivo `.env`:

- `ACTIVE_PAYMENT_PROCESSOR`: (Opcional) El nombre del procesador de pago a utilizar (ej. `tefpay`). Si no se especifica, se usará `tefpay` por defecto.

Para cada procesador de pago, se requerirán variables de entorno específicas. Para **Tefpay**:

- `TEFPAY_MERCHANT_CODE`: Código de comerciante de Tefpay.
- `TEFPAY_PRIVATE_KEY`: Clave privada de Tefpay para la firma de transacciones.
- `TEFPAY_API_URL`: (Opcional) URL base de la API de Tefpay. Por defecto: `https://api.tefpay.com/rest`.
- `TEFPAY_FORM_URL`: (Opcional) URL del formulario de pago de Tefpay. Por defecto: `https://pgw.tefpay.com/web/pay`.
- `TEFPAY_BACKOFFICE_URL`: URL del backoffice de Tefpay, utilizada para construir URLs de notificación si es necesario.

## Añadir un Nuevo Procesador de Pago

Para añadir soporte para un nuevo procesador de pago (ej. "Stripe"), sigue estos pasos:

1.  **Crear el Servicio del Procesador**: Implementa un nuevo servicio (ej. `StripeService`) en una carpeta dentro de `src/payments/processors/` (ej. `src/payments/processors/stripe/stripe.service.ts`). Este servicio debe implementar la interfaz `IPaymentProcessor`.

    ```typescript
    // src/payments/processors/stripe/stripe.service.ts
    import { Injectable } from "@nestjs/common";
    import {
      IPaymentProcessor,
      PreparePaymentParams,
      PreparedPaymentResponse,
    } from "../payment-processor.interface";
    import { ConfigService } from "@nestjs/config";
    // Importa cualquier SDK o dependencia necesaria para Stripe

    @Injectable()
    export class StripeService implements IPaymentProcessor {
      constructor(private readonly configService: ConfigService) {
        // Inicializa el SDK de Stripe con las claves de API desde ConfigService
      }

      preparePaymentParameters(
        params: PreparePaymentParams
      ): PreparedPaymentResponse {
        // Lógica para preparar un pago con Stripe
        // ...
        return {
          url: "stripe_payment_url",
          fields: {},
          payment_processor_name: "stripe",
        };
      }

      // Implementa otros métodos de IPaymentProcessor si es necesario
    }
    ```

2.  **Añadir Configuración**: Define las variables de entorno necesarias para el nuevo procesador en el archivo `.env` (ej. `STRIPE_API_KEY`, `STRIPE_PUBLISHABLE_KEY`). Asegúrate de que `ConfigService` las pueda leer.
3.  **Actualizar la Factoría en `PaymentsModule`**: Modifica la factoría del proveedor `PAYMENT_PROCESSOR_TOKEN` en `src/payments/payments.module.ts` para que pueda instanciar y devolver tu nuevo servicio cuando `ACTIVE_PAYMENT_PROCESSOR` esté configurado con el nombre de tu nuevo procesador.

    ```typescript
    // src/payments/payments.module.ts
    // ... (importa StripeService)

    // ...
    providers: [
      TefpayService, // Sigue proveyendo los servicios concretos
      StripeService, // Añade el nuevo servicio aquí
      {
        provide: PAYMENT_PROCESSOR_TOKEN,
        useFactory: (
          configService: ConfigService,
          tefpayService: TefpayService,
          stripeService: StripeService // Inyecta el nuevo servicio
        ) => {
          const activeProcessor = configService.get<string>(
            'ACTIVE_PAYMENT_PROCESSOR',
            'tefpay'
          );
          if (activeProcessor === 'tefpay') {
            return tefpayService;
          } else if (activeProcessor === 'stripe') {
            return stripeService; // Devuelve la instancia de StripeService
          }
          // ... más procesadores
          else {
            // Fallback o error
            return tefpayService;
          }
        },
        inject: [ConfigService, TefpayService, StripeService], // Añade el nuevo servicio a las inyecciones
      },
      PaymentsService,
      // ...
    ],
    // ...
    ```

4.  **Exportar el Servicio (Opcional pero Recomendado)**: Si el nuevo servicio necesita ser inyectado directamente en otros módulos (poco común para procesadores), expórtalo desde `PaymentsModule`.
5.  **Documentación**: Actualiza esta documentación (`PAYMENTS.md`) para incluir el nuevo procesador, su configuración y cualquier detalle relevante.

## Endpoints de la API

(Esta sección debería detallar los endpoints relacionados con pagos, como `/payments/initiate-flow`, etc. Próximamente se completará con más detalle).

- `POST /api/payments/payment-flow`: Inicia un flujo de pago.
- `POST /api/payments`: Crea un registro de pago (uso interno o específico).
- `GET /api/payments`: Lista los pagos (con filtros apropiados y paginación).
- `GET /api/payments/:id`: Obtiene un pago específico.
- `PATCH /api/payments/:id`: Actualiza un pago.
- `POST /api/tefpay/notify`: Endpoint para recibir notificaciones de Tefpay (webhooks).

## Flujo de Pago Típico

1.  El frontend solicita iniciar un pago para un plan específico (`POST /api/payments/payment-flow`).
2.  `PaymentsService` utiliza el `IPaymentProcessor` inyectado para llamar a `preparePaymentParameters`.
3.  El procesador de pago (ej. `TefpayService`) prepara los datos necesarios (URL de redirección, campos de formulario) y los devuelve.
4.  `PaymentsService` devuelve estos datos al frontend.
5.  El frontend redirige al usuario a la pasarela de pago o envía el formulario.
6.  El usuario completa el pago en la pasarela externa.
7.  La pasarela de pago notifica al backend el resultado de la transacción a través de un webhook (ej. `POST /api/payments/tefpay/notifications`).
8.  El servicio de notificaciones correspondiente (ej. `TefPayNotificationsService`) recibe la notificación, la verifica y luego emite un evento interno. `PaymentsService` escucha este evento y utiliza sus métodos (`handleInitialPaymentOrSubscriptionNotification` o `handleSubscriptionLifecycleNotification`) para procesar la notificación, actualizar el estado del `Payment`, crear o actualizar la `Subscription` asociada, y ajustar los roles del `User` si es necesario. Esta lógica incluye el manejo de pagos iniciales, renovaciones, cancelaciones y fallos de pago.

## Estado Actual y Mejoras Recientes

La revisión exhaustiva del sistema de pagos, notificaciones (especialmente Tefpay), y la lógica de suscripciones y planes ha sido completada, abordando varios puntos críticos. Las mejoras y correcciones clave incluyen:

- **Verificación de Firmas de Webhooks**: Se ha implementado y validado la correcta verificación de las firmas S2S para las notificaciones de Tefpay, asegurando la autenticidad de los mensajes.
- **Manejo Detallado de Escenarios de Notificación**: Se ha refinado la lógica en `PaymentsService` para manejar diversos escenarios de notificación a través de los métodos `handleInitialPaymentOrSubscriptionNotification` y `handleSubscriptionLifecycleNotification`. Esto incluye:
  - La correcta creación y activación de suscripciones tras un pago inicial exitoso.
  - La gestión de renovaciones de suscripción, incluyendo el manejo de pagos fallidos y la posible transición de suscripciones a estados como `past_due` o `canceled`.
  - El procesamiento de cancelaciones de suscripción iniciadas por el usuario o por el sistema.
- **Resolución de Errores de Tipado y Dependencias**:
  - Se corrigió un error de "type never" en la función `processSubscriptionLifecycleEvent` dentro de `PaymentsService`. Esto se logró asegurando que la transacción de Prisma (`prisma.$transaction`) devuelva explícitamente un objeto con las entidades `Payment` y `Subscription` (o `null`), permitiendo una inferencia de tipos correcta para las variables `finalFailedRenewalPayment` y `finalSubscriptionForNotification`.
  - Se corrigió el nombre de la propiedad `cancelled_at` a `canceled_at` al actualizar el estado de una `Subscription` para alinearlo con el esquema de Prisma.
  - Se resolvieron las excepciones `UnknownDependenciesException` (para `TefpayService` en `SubscriptionsModule`) y `UndefinedModuleException` (debido a una dependencia circular entre `PaymentsModule` y `SubscriptionsModule`) mediante la importación de `PaymentsModule` en `SubscriptionsModule` y la aplicación de `forwardRef()` en las importaciones de módulos en ambos `subscriptions.module.ts` y `payments.module.ts`.
- **Atomicidad de Operaciones**: El uso de `prisma.$transaction` en operaciones críticas asegura que las actualizaciones en múltiples tablas (como `Payment`, `Subscription`, `User`) se realicen de manera atómica.

Estos cambios han mejorado significativamente la robustez, fiabilidad y correctitud del módulo de pagos y su interacción con las suscripciones.
