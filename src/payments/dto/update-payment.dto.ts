import { PartialType, OmitType } from "@nestjs/swagger";
import { PaymentDto } from "./payment.dto";

export class UpdatePaymentDto extends PartialType(
  OmitType(PaymentDto, [
    "id",
    "user_id", // Generalmente no se cambia el user_id de un pago existente
    "createdAt",
    "updatedAt",
    "processor_payment_id", // Podría ser actualizable por el sistema, no por el usuario
  ] as const)
) {
  // Puedes añadir validaciones específicas para la actualización si es necesario
}
