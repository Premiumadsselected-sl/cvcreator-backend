# Guía de Integración de Tefpay

Este documento proporciona una guía para integrar Tefpay como procesador de pagos en la aplicación CV Creator.

## Introducción

Tefpay es uno de los procesadores de pago soportados. Esta guía cubre la configuración necesaria, los modelos de base de datos involucrados y los flujos de comunicación.

## Prerrequisitos

- Una cuenta activa con Tefpay.
- Credenciales de comerciante proporcionadas por Tefpay (código de comercio, clave secreta, terminal).

## Instalación y Configuración

1.  **Variables de Entorno:**
    Asegúrate de configurar las siguientes variables de entorno en tu archivo `.env`:

    ```
    TEFPAY_MERCHANT_CODE=TU_CODIGO_DE_COMERCIO
    TEFPAY_SECRET_KEY=TU_CLAVE_SECRETA
    TEFPAY_TERMINAL=TU_TERMINAL_ASIGNADO
    TEFPAY_NOTIFICATION_URL=https://TU_DOMINIO/api/payments/tefpay/webhook
    # Opcional, si usas diferentes URLs para los resultados de la transacción en el frontend
    # TEFPAY_URL_OK=https://TU_DOMINIO_FRONTEND/payment/success
    # TEFPAY_URL_KO=https://TU_DOMINIO_FRONTEND/payment/error
    ```

2.  **URL de Notificación en el Panel de Tefpay:**
    Debes configurar la URL de notificación (webhook) en tu panel de administración de Tefpay. Esta URL debe apuntar al endpoint de la aplicación que maneja las notificaciones: `POST /api/payments/tefpay/webhook`.

## Modelos de Prisma Involucrados

Los siguientes modelos en `prisma/schema.prisma` son cruciales para la integración con Tefpay:

- **`Payment`**:

  - `processor`: Debe ser `"tefpay"` para los pagos procesados por Tefpay.
  - `processor_payment_id`: Almacena el `Ds_Order` o `Ds_Merchant_TransactionID` de Tefpay, identificando unívocamente la transacción en su sistema.
  - `matching_data`: Puede usarse para datos adicionales de conciliación si es necesario.
  - `signature`: Almacena la firma calculada para las peticiones salientes a Tefpay (si aplica) o se usa para verificar las firmas entrantes.
  - `processor_response`: Almacena la respuesta cruda de Tefpay a una operación.

- **`Subscription`**:

  - `tefpay_subscription_account`: Almacena el identificador de la cuenta de suscripción en Tefpay (`Ds_Merchant_Subscription_Account`) para pagos recurrentes.
  - El estado de la suscripción (`status`) puede ser actualizado basándose en las notificaciones de Tefpay (ej. pagos de renovación exitosos o fallidos).

- **`TefPayNotification`**:
  - Este modelo registra cada notificación recibida desde Tefpay a través del webhook.
  - Campos como `ds_Order`, `ds_Code`, `ds_Signature`, `ds_Merchant_Subscription_Account`, `ds_Merchant_Subscription_Action` son vitales.
  - `status`: Indica el estado de procesamiento de la notificación (RECEIVED, PROCESSING, PROCESSED, ERROR, etc.).
  - `raw_notification`: Almacena el cuerpo completo de la notificación JSON.

## Flujo de Notificaciones (Webhook)

1.  Tefpay envía una notificación `POST` al endpoint `/api/payments/tefpay/webhook` configurado.
2.  El `PaymentsController` recibe la notificación y la pasa al `PaymentsService`.
3.  El método `handleTefpayNotification` en `PaymentsService`:
    - Valida la firma (`ds_Signature`) de la notificación para asegurar su autenticidad.
    - Crea un registro en `TefPayNotification`.
    - Procesa la notificación según su tipo (pago único, alta de suscripción, renovación, cancelación, etc.).
    - Actualiza los modelos `Payment` y/o `Subscription` según corresponda.
    - Devuelve una respuesta a Tefpay (generalmente un `*ok*` si todo fue bien).

## Escenarios de Error Comunes y Soluciones

- **Firma Inválida (`SIGNATURE_FAILED` en `TefPayNotification`):**

  - **Causa:** La clave secreta configurada en la aplicación no coincide con la usada por Tefpay para firmar la notificación, o hay un error en el cálculo de la firma.
  - **Solución:** Verifica que `TEFPAY_SECRET_KEY` sea correcta. Asegúrate de que el orden y los campos usados para calcular la firma en `PaymentsService` coincidan con los que Tefpay espera.

- **URL de Notificación Incorrecta:**

  - **Causa:** Tefpay no puede alcanzar el endpoint de webhook de la aplicación.
  - **Solución:** Verifica la URL configurada en el panel de Tefpay. Asegúrate de que el servidor de la aplicación sea accesible públicamente y que no haya firewalls bloqueando las peticiones.

- **Errores de Conexión:**

  - **Causa:** Problemas de red entre Tefpay y tu servidor, o viceversa.
  - **Solución:** Revisa los logs del servidor y de Tefpay si están disponibles.

- **Errores en los Datos Enviados a Tefpay (para iniciar un pago):**
  - **Causa:** Campos obligatorios faltantes, formatos incorrectos, o valores inválidos.
  - **Solución:** Revisa la documentación de la API de Tefpay y los datos que tu aplicación envía al generar la petición de pago.

## Desacoplamiento de Tefpay

Si necesitas cambiar de proveedor de pagos o dejar de usar Tefpay:

1.  **Actualizar Lógica de Pagos:**

    - Modifica tu lógica para no generar nuevos pagos con `processor: "tefpay"`.
    - Implementa la lógica para el nuevo procesador de pagos.

2.  **Gestionar Suscripciones Activas:**

    - Si hay suscripciones activas gestionadas por Tefpay, deberás planificar su migración al nuevo sistema o gestionarlas hasta que expiren. Esto puede implicar contactar a los usuarios.

3.  **Limpiar Configuración:**

    - Elimina o comenta las variables de entorno relacionadas con Tefpay (`TEFPAY_MERCHANT_CODE`, `TEFPAY_SECRET_KEY`, etc.).

4.  **(Opcional) Modelo `TefPayNotification`:**
    - Si ya no vas a recibir notificaciones de Tefpay, puedes considerar archivar los datos de la tabla `TefPayNotification`. Eliminar el modelo de `schema.prisma` requeriría una migración que eliminaría la tabla.

## Nota Importante sobre Notificaciones y Pagos Recurrentes

Tefpay utiliza su sistema de notificaciones (webhooks) como parte central para la validación y comunicación del estado de los pagos, incluyendo los pagos recurrentes de suscripciones. La entidad procesadora (Tefpay) maneja internamente la lógica de cuándo y cómo realizar los cobros recurrentes a los clientes.

**Dependencia de las Notificaciones:**

Actualmente, nuestra API depende directamente de la recepción y procesamiento exitoso de estas notificaciones para actualizar el estado de los pagos y las suscripciones en nuestra base de datos. Si una notificación de Tefpay falla por alguna razón (problemas de red, indisponibilidad temporal de nuestro endpoint, etc.), el estado de la suscripción o del pago en nuestra aplicación podría no reflejar la realidad del cobro realizado por Tefpay.

**Limitaciones Actuales:**

- **No hay sistema de CronJob para conciliación:** No se ha implementado un sistema de tareas programadas (CronJob) que consulte periódicamente a Tefpay (si su API lo permitiera) o que reintente procesar notificaciones fallidas para conciliar estados.
- **No se inician cobros recurrentes desde la API:** Esta API no tiene la capacidad de iniciar o forzar un cobro recurrente directamente a través de una llamada a la API de Tefpay. La gestión de los reintentos de cobro y el ciclo de vida de los pagos recurrentes es manejada por Tefpay.

Esto significa que existe una dependencia del sistema de notificaciones de Tefpay. Si bien Tefpay gestiona los cobros, un fallo en la comunicación de esas notificaciones a nuestra API podría llevar a discrepancias en los datos hasta que se resuelva manualmente o se reciba una notificación posterior que aclare el estado.
