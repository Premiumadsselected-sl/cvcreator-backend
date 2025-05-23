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
  // Futuros métodos:
  // handleWebhookNotification(payload: any): Promise<ProcessedNotificationResponse>;
  // processRefund(paymentId: string, amount?: number): Promise<RefundResponse>;
}
