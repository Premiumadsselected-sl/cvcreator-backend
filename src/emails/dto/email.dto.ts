import {
  IsEmail,
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsObject,
} from "class-validator";

export enum EmailLogStatus {
  PENDING = "pending",
  SENDING = "sending",
  SENT = "sent",
  FAILED = "failed",
  BOUNCED = "bounced",
}

export enum EmailType {
  WELCOME = "welcome",
  SUBSCRIPTION_CONFIRMATION = "subscription_confirmation",
  PASSWORD_RESET_REQUEST = "password_reset_request",
  PASSWORD_RESET_SUCCESS = "password_reset_success",
  ACCOUNT_DEACTIVATION = "account_deactivation",
  CONTACT_FORM = "contact_form",
  PAYMENT_FAILED = "payment_failed",
  SUBSCRIPTION_CANCELLED = "subscription_cancelled",
  SUBSCRIPTION_RENEWAL_REMINDER = "subscription_renewal_reminder",
  // Agrega otros tipos según sea necesario
}

export class CreateEmailLogDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsEmail()
  recipient_email: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsOptional()
  @IsString()
  body?: string; // HTML renderizado o referencia a plantilla

  @IsEnum(EmailLogStatus)
  @IsOptional()
  status?: EmailLogStatus = EmailLogStatus.PENDING;

  @IsEnum(EmailType)
  @IsNotEmpty()
  type: EmailType;

  @IsOptional()
  @IsString()
  provider_message_id?: string;

  @IsOptional()
  @IsString()
  error_message?: string;
}

export class UpdateEmailLogDto {
  @IsEnum(EmailLogStatus)
  @IsNotEmpty()
  status: EmailLogStatus;

  @IsOptional()
  @IsString()
  provider_message_id?: string;

  @IsOptional()
  @IsString()
  error_message?: string;

  @IsOptional()
  sent_at?: Date;
}

// --- DTOs para enviar correos específicos ---

interface BaseSendEmailDto {
  to: string;
  locale?: string; // Para internacionalización de plantillas
}

export class SendWelcomeEmailDto implements BaseSendEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsString()
  @IsOptional()
  locale?: string = "es";
}

export class SendSubscriptionConfirmationEmailDto implements BaseSendEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsString()
  @IsNotEmpty()
  planName: string;

  @IsString()
  @IsOptional()
  locale?: string = "es";
}

export class SendPasswordResetRequestEmailDto implements BaseSendEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsString()
  @IsNotEmpty()
  resetLink: string;

  @IsString()
  @IsOptional()
  locale?: string = "es";
}

export class SendPasswordResetSuccessEmailDto implements BaseSendEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsString()
  @IsOptional()
  locale?: string = "es";
}

export class SendContactFormEmailDto {
  @IsEmail()
  from_email: string; // Email del remitente del formulario

  @IsString()
  @IsNotEmpty()
  from_name: string; // Nombre del remitente

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  option?: string; // Si hay un campo de "asunto" o "motivo" en el form

  @IsString()
  @IsOptional()
  locale?: string = "es"; // Locale para la plantilla del correo que se envía al admin/soporte
}

export class SendPaymentFailedEmailDto implements BaseSendEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsString()
  @IsNotEmpty()
  planName: string;

  @IsString()
  @IsOptional()
  nextPaymentAttemptDate?: string; // Formato YYYY-MM-DD

  @IsString()
  @IsOptional()
  locale?: string = "es";
}

export class SendSubscriptionCancelledEmailDto implements BaseSendEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsString()
  @IsNotEmpty()
  planName: string;

  @IsString()
  @IsNotEmpty()
  endDate: string; // Formato YYYY-MM-DD

  @IsString()
  @IsOptional()
  locale?: string = "es";
}

// Puedes añadir más DTOs según los necesites, por ejemplo:
export class SendAccountDeactivationEmailDto implements BaseSendEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsString()
  @IsOptional()
  locale?: string = "es";
}

export class SendSubscriptionRenewalReminderEmailDto
  implements BaseSendEmailDto
{
  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsString()
  @IsNotEmpty()
  planName: string;

  @IsString()
  @IsNotEmpty()
  renewalDate: string; // Formato YYYY-MM-DD

  @IsString()
  @IsOptional()
  locale?: string = "es";
}
