<!-- filepath: /Users/arcademan/Documents/Projects/ADSDIGITAL/cvcreator-backend/docs/MODULES/SUBSCRIPTIONS.md -->

# Gestión de Suscripciones (SubscriptionsModule)

El `SubscriptionsModule` se encarga de la lógica relacionada con los planes de suscripción de los usuarios, incluyendo su creación, actualización de estado, y la gestión de los periodos de prueba y facturación.

## Funcionalidades Principales

- **Creación de Suscripciones**: Permite crear una nueva suscripción para un usuario, asociándola a un plan específico. Generalmente, esto ocurre después de un pago exitoso o al iniciar un periodo de prueba.
- **Actualización de Estado**: Modifica el estado de una suscripción (ej. de `pending` a `active`, de `active` a `cancelled` o `past_due`).
- **Gestión de Ciclo de Vida**: Maneja los inicios y fines de los periodos de prueba, así como los periodos de facturación actuales.
- **Consulta de Suscripciones**: Provee endpoints para que los usuarios puedan ver sus suscripciones activas o pasadas, y para que los administradores puedan gestionar todas las suscripciones.

## Interacción con Otros Módulos

- **`UsersModule`**: Las suscripciones están directamente ligadas a los usuarios.
- **`PaymentsModule`**: Los pagos exitosos suelen activar o renovar suscripciones. Las notificaciones de pago fallido pueden cambiar el estado de una suscripción a `past_due` o similar.
- **`PlansModule`**: Las suscripciones se basan en los planes definidos en el `PlansModule`, que especifican precio, duración, y características.
- **`AuditLogsModule`**: Las acciones importantes sobre las suscripciones (creación, cambio de estado, cancelación) se registran para auditoría.

## Modelo de Datos (`Subscription`)

Consultar `DATABASE.md` o `prisma/schema.prisma` para la definición detallada del modelo `Subscription`. Campos clave incluyen:

- `user_id`, `plan_id`
- `status` (ej. `active`, `inactive`, `cancelled`, `past_due`, `trialing`, `pending`)
- `trial_start`, `trial_end`
- `current_period_start`, `current_period_end`
- `cancel_at_period_end`, `canceled_at`, `ended_at`
- `tefpay_subscription_account` (si aplica)

## Endpoints de la API (Ejemplos)

- `GET /subscriptions/user/:userId`: Obtiene todas las suscripciones de un usuario específico.
- `GET /subscriptions/:id`: Obtiene una suscripción por su ID.
- `PATCH /subscriptions/:id`: Actualiza una suscripción (ej. para cancelar).

## Estado Actual y Mejoras Recientes

La revisión del sistema de suscripciones, en conjunto con los módulos de pagos y notificaciones, ha concluido. Las mejoras clave que impactan al `SubscriptionsModule` son:

- **Integración Refinada con Pagos**: La lógica de creación y actualización de suscripciones ahora está correctamente sincronizada con los eventos de pago procesados por `PaymentsService`. Esto asegura que las suscripciones se activen, renueven, o cancelen de manera consistente con el resultado de las transacciones.
- **Manejo de Ciclo de Vida Mejorado**: Se ha clarificado y robustecido el manejo de los diferentes estados de la suscripción (`active`, `inactive`, `cancelled`, `past_due`, `trialing`, `pending`) en respuesta a notificaciones de pago (exitosas o fallidas) y acciones del sistema.
- **Corrección de Dependencias de Módulo**: Se resolvió una `UnknownDependenciesException` relacionada con `TefpayService` al importar correctamente `PaymentsModule` (usando `forwardRef`) dentro de `SubscriptionsModule`. Esto fue crucial para permitir que `SubscriptionsService` (si fuera necesario en el futuro, o para mantener la consistencia de la arquitectura) pudiera acceder a servicios relacionados con pagos, aunque la lógica principal de procesamiento de notificaciones de pago reside en `PaymentsService`.
- **Consistencia en el Modelo de Datos**: Se verificó el uso correcto de los campos del modelo `Subscription`, como `canceled_at`, asegurando la alineación con el esquema de Prisma.

Estos cambios contribuyen a un sistema de gestión de suscripciones más predecible y alineado con los eventos de pago reales.

---

id: subscriptions-module
title: Módulo de Suscripciones
sidebar_label: Suscripciones

---

# Gestión de Suscripciones (SubscriptionsModule)

El `SubscriptionsModule` se encarga de la lógica relacionada con los planes de suscripción de los usuarios, incluyendo su creación, actualización de estado, y la gestión de los periodos de prueba y facturación.

## Funcionalidades Principales

- **Creación de Suscripciones**: Permite crear una nueva suscripción para un usuario, asociándola a un plan específico. Generalmente, esto ocurre después de un pago exitoso o al iniciar un periodo de prueba.
- **Actualización de Estado**: Modifica el estado de una suscripción (ej. de `pending` a `active`, de `active` a `cancelled` o `past_due`).
- **Gestión de Ciclo de Vida**: Maneja los inicios y fines de los periodos de prueba, así como los periodos de facturación actuales.
- **Consulta de Suscripciones**: Provee endpoints para que los usuarios puedan ver sus suscripciones activas o pasadas, y para que los administradores puedan gestionar todas las suscripciones.

## Interacción con Otros Módulos

- **`UsersModule`**: Las suscripciones están directamente ligadas a los usuarios.
- **`PaymentsModule`**: Los pagos exitosos suelen activar o renovar suscripciones. Las notificaciones de pago fallido pueden cambiar el estado de una suscripción a `past_due` o similar.
- **`PlansModule`**: Las suscripciones se basan en los planes definidos en el `PlansModule`, que especifican precio, duración, y características.
- **`AuditLogsModule`**: Las acciones importantes sobre las suscripciones (creación, cambio de estado, cancelación) se registran para auditoría.

## Modelo de Datos (`Subscription`)

Consultar `DATABASE.md` o `prisma/schema.prisma` para la definición detallada del modelo `Subscription`. Campos clave incluyen:

- `user_id`, `plan_id`
- `status` (ej. `active`, `inactive`, `cancelled`, `past_due`, `trialing`, `pending`)
- `trial_start`, `trial_end`
- `current_period_start`, `current_period_end`
- `cancel_at_period_end`, `canceled_at`, `ended_at`
- `tefpay_subscription_account` (si aplica)

## Endpoints de la API (Ejemplos)

- `GET /subscriptions/user/:userId`: Obtiene todas las suscripciones de un usuario específico.
- `GET /subscriptions/:id`: Obtiene una suscripción por su ID.
- `PATCH /subscriptions/:id`: Actualiza una suscripción (ej. para cancelar).

## Lógica Principal

El `SubscriptionsService` ahora depende de la interfaz `IPaymentProcessor` en lugar de una implementación concreta como `TefpayService`. Esto se logra inyectando el procesador de pagos mediante el token `PAYMENT_PROCESSOR_TOKEN`.

### Creación de Suscripción desde un Pago

El método `createFromPayment` en `SubscriptionsService` ha sido actualizado para manejar identificadores de procesador genéricos:

```typescript
// src/subscriptions/subscriptions.service.ts
// ...
async createFromPayment(
  payment: Payment,
  userId: string,
  planId: string,
  processorSubscriptionId: string, // ID de la suscripción en el procesador de pagos
  processorName: string, // Nombre del procesador (ej. 'tefpay')
  paymentMethodUsed?: string,
  trialEndsAt?: Date,
): Promise<Subscription> {
  // ... lógica para buscar o crear usuario y plan ...

  const subscription = await this.prisma.subscription.create({
    data: {
      userId,
      planId,
      status: SubscriptionStatus.ACTIVE,
      // processor: processorName, // Descomentar si se añade este campo al modelo
      processorSubscriptionId: processorSubscriptionId,
      paymentMethod: paymentMethodUsed,
      // ... otros campos ...
      payments: {
        connect: { id: payment.id },
      },
    },
  });

  // ... lógica adicional ...
  return subscription;
}
// ...
```

### Cancelación de Suscripción

El método `requestSubscriptionCancellation` en `SubscriptionsService` ahora utiliza `IPaymentProcessor` para solicitar la cancelación al procesador de pagos correspondiente.

## Inyección de Dependencias y Módulos

Para resolver dependencias circulares con `PaymentsModule`, se utiliza `forwardRef` en las importaciones de ambos módulos.

```typescript
// src/subscriptions/subscriptions.module.ts
import { Module, forwardRef } from "@nestjs/common";
// ... otros imports ...
import { PaymentsModule } from "../payments/payments.module"; // Importación con forwardRef

@Module({
  imports: [
    // ... otros módulos ...
    forwardRef(() => PaymentsModule), // Resuelve dependencia circular
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PlansService],
  exports: [SubscriptionsService, PlansService],
})
export class SubscriptionsModule {}
```
