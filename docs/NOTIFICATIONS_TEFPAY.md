# Gestión de Notificaciones de Tefpay

Este documento describe cómo el backend de CVCreator maneja las notificaciones de pago de Tefpay, incluyendo la verificación de firma Server-to-Server (S2S).

## Flujo General de Notificaciones

1.  **Recepción de Notificación**: El endpoint `/api/payments/tefpay/notifications` recibe las notificaciones HTTP POST de Tefpay.
2.  **Almacenamiento Inicial**: La notificación cruda se almacena en la tabla `TefPayNotification` con un estado inicial (ej. `pending_verification`).
3.  **Emisión de Evento**: Se emite un evento interno (ej. `tefpay.notification.received`) con el ID de la notificación almacenada y el payload.
4.  **Manejo Asíncrono**: Un listener de eventos en `PaymentsService` (`handleTefpayNotificationEvent`) procesa la notificación.

## Configuración de Variables de Entorno para Tefpay

Las siguientes variables de entorno deben estar configuradas correctamente:

- `TEFPAY_MERCHANT_CODE`: Tu código de comerciante proporcionado por Tefpay.
- `TEFPAY_SECRET_KEY`: Tu clave secreta para la firma de transacciones.
- `TEFPAY_FORM_URL`: La URL del formulario de pago de Tefpay (ej. `https://direct.tefpay.com/form/`).
- `TEFPAY_DEFAULT_SUCCESS_URL`: URL de redirección por defecto tras un pago exitoso. El backend la usará si no se provee una específica en la solicitud de pago.
- `TEFPAY_DEFAULT_ERROR_URL`: URL de redirección por defecto tras un pago fallido.
- `TEFPAY_DEFAULT_CANCEL_URL`: URL de redirección por defecto si el usuario cancela el pago.
- `TEFPAY_TERMINAL`: El número de terminal a usar (por defecto, el servicio usa `'001'` si no se especifica).
- `APP_BASE_URL`: La URL base de tu aplicación (ej. `http://localhost:3000` o `https://tuapp.com`). Se usa para construir las URLs de notificación (`url_notification`) que se envían a Tefpay.

## Flujo de Notificación (Webhook S2S)

1.  **Recepción de Notificación**: El endpoint `/api/payments/tefpay/notifications` recibe las notificaciones HTTP POST de Tefpay.
2.  **Almacenamiento Inicial**: `TefpayNotificationsService` almacena la notificación cruda en la tabla `TefPayNotification` con un estado inicial (ej. `RECEIVED`).
3.  **Emisión de Evento**: `TefpayNotificationsService` emite un evento interno (ej. `tefpay.notification.processed_by_handler`) con la notificación almacenada.
4.  **Manejo Asíncrono y Verificación de Firma**: Un listener de eventos en `PaymentsService` (`handleTefpayNotificationEvent`) recibe el evento. Este servicio luego invoca a `TefpayService` para verificar la firma de la notificación.
    - Para **notificaciones S2S comunes** (pagos, etc.), `TefpayService` utiliza **SHA1** con la `TEFPAY_SECRET_KEY` y los campos: `Ds_Amount + Ds_Merchant_MerchantCode + Ds_Merchant_MatchingData + Ds_Merchant_Url + CLAVE_PRIVADA`.
    - Para **notificaciones S2S de suscripción**, `TefpayService` utiliza **SHA1** con la `TEFPAY_SECRET_KEY` y los campos: `Ds_Subscription_Action + Ds_Subscription_Status + Ds_Subscription_Account + Ds_Subscription_Id + CLAVE_PRIVADA`.
5.  **Procesamiento**: Si la firma es válida, el `PaymentsService` procesa la notificación. Esto implica:
    - Actualizar el estado del `Payment` correspondiente en la base de datos.
    - Si el pago es para una nueva suscripción y es exitoso, se llama a `SubscriptionsService.createFromPayment` para crear la `Subscription`.
    - Manejar otros tipos de notificaciones (cancelaciones, renovaciones, etc.).

## Ejemplo de Cuerpo de Notificación de Tefpay (JSON)

```json
{
  "Ds_Signature": "FIRMADO_CON_SHA1_Y_TU_CLAVE_SECRETA",
  "Ds_MerchantCode": "TU_CODIGO_DE_COMERCIANTE",
  "Ds_Amount": "1000",
  "Ds_Currency": "978",
  "Ds_Order": "123456",
  "Ds_TransactionType": "0",
  "Ds_Response": "0000",
  "Ds_Merchant_MatchingData": "DATOS_DE_COINCIDENCIA",
  "Ds_Merchant_Subscription_Account": "CUENTA_DE_SUSCRIPCION",
  "Ds_Terminal": "001",
  "Ds_Card_Brand": "Visa",
  "Ds_Authorisation_Code": "AUTORIZACION",
  "Ds_Transaction_Date": "2023-10-10 10:00:00",
  "Ds_Hash": "HASH_DE_VERIFICACION"
}
```

## Consideraciones de Seguridad

- **No exponer `TEFPAY_SECRET_KEY`**: Esta clave debe mantenerse secreta y nunca exponerse en el lado del cliente ni en logs públicos.
- **HTTPS**: Asegúrate de que el endpoint de notificaciones siempre use HTTPS.
- **Validación de IP (Opcional pero Recomendado)**: Considera validar que las notificaciones provengan de las direcciones IP de Tefpay si proporcionan una lista.
- **Algoritmos de Firma**: Es crucial utilizar el algoritmo de firma correcto para cada tipo de interacción con Tefpay:
  - **SHA1** para la firma de formularios enviados a Tefpay.
  - **SHA1** para la verificación de notificaciones S2S entrantes (comunes y de suscripción).
  - **SHA256** para la firma de operaciones S2S de backoffice enviadas a Tefpay (ej. cancelación de suscripción).

## Estado Actual y Mejoras Recientes

La gestión de notificaciones de Tefpay, incluyendo la verificación de firma S2S, ha sido revisada y mejorada. Los puntos clave son:

- **Verificación S2S Funcional**: La lógica de `TefpayService.verifyS2SSignature` ha sido confirmada y es funcional, utilizando SHA1 para las notificaciones entrantes y asegurando que solo las notificaciones auténticas de Tefpay sean procesadas.
- **Flujo de Procesamiento Clarificado**: El flujo desde la recepción de la notificación por `TefpayNotificationsService`, pasando por el almacenamiento inicial, la emisión de un evento, y el manejo asíncrono en `PaymentsService` (específicamente en `handleInitialPaymentOrSubscriptionNotification` y `handleSubscriptionLifecycleNotification`), está ahora bien definido.
- **Manejo de Errores de Firma**: Las notificaciones con firmas inválidas o ausentes son correctamente marcadas (`signature_failed`) y no se procesan, previniendo acciones no deseadas.
- **Integración con `PaymentsService`**: `PaymentsService` ahora maneja de forma robusta los resultados de las notificaciones verificadas para actualizar pagos, suscripciones y usuarios de manera atómica usando `prisma.$transaction`.
- **Resolución de Problemas de Dependencias**: Las correcciones en las dependencias de módulos (`PaymentsModule` y `SubscriptionsModule` usando `forwardRef`) aseguran que todos los servicios necesarios estén disponibles y correctamente inyectados, lo cual es fundamental para el flujo de procesamiento de notificaciones que interactúa con múltiples dominios.

Estos ajustes aseguran que las notificaciones de Tefpay se manejen de forma segura y que las acciones resultantes en el sistema sean consistentes y fiables.
