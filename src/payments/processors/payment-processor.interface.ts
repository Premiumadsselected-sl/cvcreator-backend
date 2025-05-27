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
  locale: string; // AÑADIDO: Idioma para la pasarela de pago
  tefpayTerminal?: string; // AÑADIDO: Terminal específico de Tefpay (opcional)
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
  handleWebhookNotification(
    payload: any,
    signature?: string | string[] | Buffer
  ): Promise<ProcessedNotificationResponse>; // MODIFICADO: Añadido signature y tipo de retorno
  verifySignature(payload: any, signature: string | string[] | Buffer): boolean; // AÑADIDO: Nuevo método

  // NUEVO: Método para solicitar la cancelación de una suscripción
  requestSubscriptionCancellation?(params: {
    processorSubscriptionId: string; // MODIFICADO: Cambiado de subscriptionId a processorSubscriptionId
    cancellationReason?: string; // Razón opcional para la cancelación
    // Otros parámetros específicos del procesador podrían ir aquí
  }): Promise<SubscriptionCancellationResponse>;
}

// AÑADIDO: Interfaz para la respuesta del manejo de notificaciones
export interface ProcessedNotificationResponse {
  paymentId: string;
  status: string; // ej: 'completed', 'failed', 'pending'
  eventType?: string; // ej: 'payment.succeeded', 'charge.failed'
  transactionId?: string;
  processorTransactionId?: string; // AÑADIDO: ID de transacción específico del procesador
  amount?: number; // AÑADIDO: Monto de la transacción
  currency?: string; // AÑADIDO: Moneda de la transacción
  timestamp?: Date; // AÑADIDO: Fecha y hora de la notificación
  customerIdentifier?: string; // AÑADIDO: Identificador del cliente
  subscriptionIdentifier?: string; // AÑADIDO: Identificador de la suscripción (si aplica)
  cardDetails?: {
    // AÑADIDO: Detalles de la tarjeta (parciales)
    last4?: string;
    brand?: string;
    expiryMonth?: string;
    expiryYear?: string;
  };
  metadata?: Record<string, any>; // AÑADIDO: Metadatos adicionales
  rawData: any;
  message?: string;
  error?: string;
}

// NUEVO: Interfaz para la respuesta de la cancelación de suscripción
export interface SubscriptionCancellationResponse {
  success: boolean;
  message: string;
  /** Fecha efectiva en la que la suscripción se cancelará (ISO String). */
  effectiveCancellationDate?: string;
  /** Estado actual de la suscripción después de la solicitud. */
  newStatus?: string;
  error?: string;
}
