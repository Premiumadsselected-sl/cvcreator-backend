# Gestión de Notificaciones de Tefpay

Este documento describe cómo el backend de CVCreator maneja las notificaciones de pago de Tefpay, incluyendo la verificación de firma Server-to-Server (S2S).

## Flujo General de Notificaciones

1.  **Recepción de Notificación**: El endpoint `/api/payments/tefpay/notifications` recibe las notificaciones HTTP POST de Tefpay.
2.  **Almacenamiento Inicial**: La notificación cruda se almacena en la tabla `TefPayNotification` con un estado inicial (ej. `pending_verification`).
3.  **Emisión de Evento**: Se emite un evento interno (ej. `tefpay.notification.received`) con el ID de la notificación almacenada y el payload.
4.  **Manejo Asíncrono**: Un listener de eventos en `PaymentsService` (`handleTefpayNotificationEvent`) procesa la notificación.

## Verificación de Firma S2S

Para garantizar la autenticidad e integridad de las notificaciones, se implementa una verificación de firma S2S.

### Configuración Requerida (.env)

Las siguientes variables de entorno deben estar configuradas correctamente:

- `TEFPAY_MERCHANT_CODE`: Código de comercio proporcionado por Tefpay.
- `TEFPAY_PRIVATE_KEY`: Clave privada/secreta proporcionada por Tefpay para la firma.
- `TEFPAY_NOTIFY_URL`: La URL completa de tu endpoint de notificaciones que Tefpay utiliza para construir la firma.
- `TEFPAY_DS_AMOUNT`: Un valor de importe fijo (en céntimos, ej. "60" para 0.60 EUR) que se utilizará consistentemente en el cálculo de la firma S2S por parte del backend. Este valor debe coincidir con el que Tefpay espera para este tipo de notificación si se usa un importe fijo en la configuración de la firma del lado de Tefpay.

### Lógica de Verificación (`TefpayService.verifyS2SSignature`)

1.  **Obtención de Parámetros**:

    - `Ds_Signature` (del payload de la notificación): La firma enviada por Tefpay.
    - `Ds_Merchant_MatchingData` (del payload): Datos de coincidencia del comercio.
    - `Ds_Merchant_Subscription_Account` (del payload): Usado como fallback si `Ds_Merchant_MatchingData` no está presente.
    - `TEFPAY_DS_AMOUNT` (de `.env`): Importe fijo para la firma.
    - `TEFPAY_MERCHANT_CODE` (de `.env`): Código de comercio.
    - `TEFPAY_NOTIFY_URL` (de `.env`): URL de notificación.
    - `TEFPAY_PRIVATE_KEY` (de `.env`): Clave para la firma.

2.  **Construcción de la Cadena de Firma**:
    La cadena base para el hash SHA1 se construye concatenando los siguientes valores en este orden exacto:
    `String(TEFPAY_DS_AMOUNT) + String(TEFPAY_MERCHANT_CODE) + String(merchantDataForSignature) + String(TEFPAY_NOTIFY_URL) + String(TEFPAY_PRIVATE_KEY)`
    Donde `merchantDataForSignature` es `Ds_Merchant_MatchingData` o `Ds_Merchant_Subscription_Account` si el primero no está disponible. Se utiliza una cadena vacía (`""`) si el campo seleccionado es `null` o `undefined`.

3.  **Cálculo de la Firma Esperada**:
    Se calcula un hash SHA1 de la cadena construida y se convierte a una cadena hexadecimal en mayúsculas.

4.  **Comparación**:
    La firma calculada se compara con la `Ds_Signature` recibida (también convertida a mayúsculas para una comparación insensible al caso).

### Manejo del Resultado de la Verificación

- **Firma Válida**: El procesamiento de la notificación continúa normalmente.
- **Firma Inválida**:
  - Se registra una advertencia.
  - El estado de la `TefPayNotification` en la base de datos se actualiza a `signature_failed`.
  - El procesamiento de esa notificación específica se detiene para prevenir acciones no autorizadas.

## Procesamiento Post-Verificación

Si la firma es válida (o si la verificación de firma no aplica para el tipo de notificación), `PaymentsService` continúa:

1.  **Identificación del Tipo de Evento**: Determina si es un pago inicial, una renovación de suscripción, una cancelación, etc., basándose en campos como `Ds_TransactionType` y `Ds_Code`.
2.  **Actualización de Entidades**:
    - Actualiza el `Payment` correspondiente.
    - Crea o actualiza la `Subscription` si aplica.
    - Actualiza los roles del `User`.
3.  **Actualización Final del Estado de Notificación**: El estado de `TefPayNotification` se actualiza a `processed` (si todo fue bien) o `error_processing` (si hubo un error durante el procesamiento lógico), enlazando los `payment_id` y `subscription_id` relevantes.

## Pruebas

### Postman

La colección de Postman (`docs/RESOURCES/api-collections/cvcreator-backend.postman_collection.json`) incluye una solicitud "Handle Tefpay Notifications" que puede usarse para simular notificaciones entrantes.

Para probar la verificación S2S:

1.  Asegúrate de que las variables de entorno (`TEFPAY_PRIVATE_KEY`, `TEFPAY_NOTIFY_URL`, `TEFPAY_MERCHANT_CODE`, `TEFPAY_DS_AMOUNT`) estén configuradas en tu archivo `.env`.
2.  En la solicitud de Postman:
    - Utiliza el método POST y la URL `{{baseUrl}}/api/payments/tefpay/notifications`.
    - Configura el `Content-Type` a `application/x-www-form-urlencoded`.
    - En el cuerpo (body) de la solicitud (form-urlencoded):
      - `Ds_Amount`: El valor que Tefpay enviaría (ej. "0" para una notificación de error, o el importe real para un pago). _Nota: Para el cálculo de la firma S2S, el backend usará `TEFPAY_DS_AMOUNT` del `.env`._
      - `Ds_MerchantCode`: El código de comercio que Tefpay enviaría. _Nota: Para el cálculo de la firma S2S, el backend usará `TEFPAY_MERCHANT_CODE` del `.env`._
      - `Ds_Merchant_MatchingData`: Un valor de prueba (ej. un `payment_code` existente).
      - `Ds_Merchant_Subscription_Account`: (Opcional) Un valor de prueba si `Ds_Merchant_MatchingData` no se envía.
      - `Ds_Signature`: La firma calculada manualmente o generada por una herramienta, usando la misma lógica y clave que el backend (`TEFPAY_DS_AMOUNT + TEFPAY_MERCHANT_CODE + (Ds_Merchant_MatchingData o Ds_Merchant_Subscription_Account) + TEFPAY_NOTIFY_URL + TEFPAY_PRIVATE_KEY`, hasheado con SHA1 y en hexadecimal).
      - Incluye otros campos relevantes de Tefpay (`Ds_Order`, `Ds_Code`, `Ds_TransactionType`, etc.) según el escenario que quieras probar.

### Escenarios de Prueba

- **Firma Válida**: Envía una notificación con una `Ds_Signature` correctamente calculada. El sistema debería procesar la notificación.
- **Firma Inválida**: Envía una notificación con una `Ds_Signature` incorrecta. El sistema debería registrar el fallo, actualizar el estado de la notificación a `signature_failed` y no procesar más allá.
- **Firma Ausente**: Envía una notificación sin el campo `Ds_Signature`. El sistema debería registrar el fallo de firma.
- **Falta `Ds_Merchant_MatchingData` pero presente `Ds_Merchant_Subscription_Account`**: Verifica que la firma se calcule usando `Ds_Merchant_Subscription_Account`.
- **Faltan ambos campos de datos del merchant**: Verifica que la firma se calcule con una cadena vacía para ese componente.

## Consideraciones de Seguridad

- **No exponer `TEFPAY_PRIVATE_KEY`**: Esta clave debe mantenerse secreta y nunca exponerse en el lado del cliente ni en logs públicos.
- **HTTPS**: Asegúrate de que el endpoint de notificaciones siempre use HTTPS.
- **Validación de IP (Opcional pero Recomendado)**: Considera validar que las notificaciones provengan de las direcciones IP de Tefpay si proporcionan una lista.

## Estado Actual y Mejoras Recientes

La gestión de notificaciones de Tefpay, incluyendo la verificación de firma S2S, ha sido revisada y mejorada como parte de una actualización más amplia del sistema de pagos y suscripciones. Los puntos clave son:

- **Verificación S2S Funcional**: La lógica de `TefpayService.verifyS2SSignature` ha sido confirmada y es funcional, asegurando que solo las notificaciones auténticas de Tefpay sean procesadas.
- **Flujo de Procesamiento Clarificado**: El flujo desde la recepción de la notificación, pasando por el almacenamiento inicial, la emisión de un evento, y el manejo asíncrono en `PaymentsService` (específicamente en `handleInitialPaymentOrSubscriptionNotification` y `handleSubscriptionLifecycleNotification`), está ahora bien definido.
- **Manejo de Errores de Firma**: Las notificaciones con firmas inválidas o ausentes son correctamente marcadas (`signature_failed`) y no se procesan, previniendo acciones no deseadas.
- **Integración con `PaymentsService`**: `PaymentsService` ahora maneja de forma robusta los resultados de las notificaciones verificadas para actualizar pagos, suscripciones y usuarios de manera atómica usando `prisma.$transaction`.
- **Resolución de Problemas de Dependencias**: Las correcciones en las dependencias de módulos (`PaymentsModule` y `SubscriptionsModule` usando `forwardRef`) aseguran que todos los servicios necesarios estén disponibles y correctamente inyectados, lo cual es fundamental para el flujo de procesamiento de notificaciones que interactúa con múltiples dominios.

Estos ajustes aseguran que las notificaciones de Tefpay se manejen de forma segura y que las acciones resultantes en el sistema sean consistentes y fiables.
