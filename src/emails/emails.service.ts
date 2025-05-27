import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { Transporter } from "nodemailer";
import * as hbs from "handlebars";
import * as fs from "fs/promises";
import * as path from "path";
import { EmailLog, Prisma } from "@prisma/client";
import {
  CreateEmailLogDto,
  EmailLogStatus,
  EmailType,
  UpdateEmailLogDto,
  SendWelcomeEmailDto,
  SendSubscriptionConfirmationEmailDto,
  SendPasswordResetRequestEmailDto,
  SendPasswordResetSuccessEmailDto,
  SendContactFormEmailDto,
  SendPaymentFailedEmailDto,
  SendSubscriptionCancelledEmailDto,
  // Nuevos DTOs importados
  SendAccountDeactivationEmailDto,
  SendSubscriptionRenewalReminderEmailDto,
} from "./dto/email.dto";

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);
  private transporter: Transporter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>("MAIL_HOST"),
      port: this.configService.get<number>("MAIL_PORT", 465),
      secure: this.configService.get<boolean>("MAIL_SECURE", true),
      auth: {
        user: this.configService.get<string>("MAIL_USER"),
        pass: this.configService.get<string>("MAIL_PASSWORD"),
      },
    });
    this.logger.log("EmailsService initialized and transporter configured.");
  }

  private async loadI18nMessages(
    locale: string
  ): Promise<Record<string, string>> {
    const messagesPath = path.join(
      __dirname,
      "..", // Salir de 'emails'
      "messages",
      `${locale}.json`
    );
    try {
      const messagesFile = await fs.readFile(messagesPath, "utf-8");
      return JSON.parse(messagesFile) as Record<string, string>; // Cast to specific type
    } catch (error) {
      this.logger.warn(
        `Could not load i18n messages for locale ${locale} from ${messagesPath}. Falling back to 'es'. Error: ${error.message}`
      );
      // Fallback a español si el archivo del locale no existe o falla la carga
      if (locale !== "es") {
        const fallbackMessagesPath = path.join(
          __dirname,
          "..",
          "messages",
          "es.json"
        );
        try {
          const fallbackFile = await fs.readFile(fallbackMessagesPath, "utf-8");
          return JSON.parse(fallbackFile) as Record<string, string>; // Cast to specific type
        } catch (fallbackError) {
          this.logger.error(
            `Critical: Could not load fallback i18n messages for 'es'. Error: ${fallbackError.message}`
          );
          throw new InternalServerErrorException(
            "Could not load i18n messages."
          );
        }
      }
      throw new InternalServerErrorException( // Si falla 'es' directamente
        "Could not load i18n messages for 'es'."
      );
    }
  }

  private async getTemplate(
    templateName: string
    // locale: string = "es" // Ya no se necesita locale aquí
  ): Promise<Handlebars.TemplateDelegate> {
    const templatePath = path.join(
      __dirname,
      "templates",
      // locale, // Eliminado locale de la ruta de la plantilla
      `${templateName}.hbs`
    );
    try {
      const templateFile = await fs.readFile(templatePath, "utf-8");
      return hbs.compile(templateFile);
    } catch (error) {
      this.logger.error(
        `Error loading email template ${templateName}: ${error.message}`
      );
      throw new InternalServerErrorException(
        `Could not load email template: ${templateName}`
      );
    }
  }

  private async createLogEntry(data: CreateEmailLogDto): Promise<EmailLog> {
    try {
      const log = await this.prisma.emailLog.create({
        data: {
          user_id: data.user_id,
          recipient_email: data.recipient_email,
          subject: data.subject,
          body: data.body,
          status: data.status || EmailLogStatus.PENDING,
          type: data.type,
        },
      });
      if (!log) {
        // Aunque create usualmente lanza error o devuelve el objeto, verificamos por si acaso
        throw new InternalServerErrorException(
          "Failed to create email log entry in database."
        );
      }
      return log;
    } catch (error) {
      this.logger.error(
        `Failed to create email log: ${error.message}`,
        error.stack
      );
      // Lanzamos la excepción para que el flujo principal sepa que el log no se pudo crear.
      throw new InternalServerErrorException(
        `Failed to create email log: ${error.message}`
      );
    }
  }

  private async updateLogEntry(
    logId: string,
    data: UpdateEmailLogDto
  ): Promise<void> {
    try {
      await this.prisma.emailLog.update({
        where: { id: logId },
        data: {
          status: data.status,
          provider_message_id: data.provider_message_id,
          error_message: data.error_message,
          sent_at:
            data.status === EmailLogStatus.SENT
              ? data.sent_at || new Date()
              : null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to update email log ID ${logId}: ${error.message}`,
        error.stack
      );
      // No relanzamos aquí para no sobrescribir un posible error de envío de correo
    }
  }

  private async sendMail(
    recipientEmail: string,
    subject: string,
    htmlBody: string,
    emailType: EmailType,
    userId?: string // userId es opcional
  ): Promise<void> {
    const initialLogData: CreateEmailLogDto = {
      recipient_email: recipientEmail,
      subject: subject,
      body: htmlBody,
      type: emailType,
      user_id: userId, // Se pasará undefined si no se provee, lo cual es correcto para el schema (String?)
      status: EmailLogStatus.SENDING,
    };

    let logEntry: EmailLog;
    try {
      logEntry = await this.createLogEntry(initialLogData);
    } catch (logError) {
      // Si la creación del log falla, registramos el error y lanzamos para detener el proceso.
      this.logger.error(
        "Critical: Email log creation failed. Aborting send mail operation.",
        logError.stack
      );
      throw logError; // Relanzamos el error de creación de log
    }

    try {
      const mailOptions = {
        from: `"${this.configService.get<string>("SERVICE_NAME")}" <${this.configService.get<string>("MAIL_FROM")}>`,
        to: recipientEmail,
        subject: subject,
        html: htmlBody,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Email sent successfully to ${recipientEmail}. Message ID: ${info.messageId}`
      );
      await this.updateLogEntry(logEntry.id, {
        status: EmailLogStatus.SENT,
        provider_message_id: info.messageId,
        sent_at: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${recipientEmail}: ${error.message}`,
        error.stack
      );
      await this.updateLogEntry(logEntry.id, {
        status: EmailLogStatus.FAILED,
        error_message: error.message,
      });
      throw new InternalServerErrorException(
        `Failed to send email: ${error.message}`
      );
    }
  }

  // --- Métodos públicos para enviar correos específicos ---

  async sendWelcomeEmail(dto: SendWelcomeEmailDto): Promise<void> {
    const { to, userName, locale = "es" } = dto;
    const i18n = await this.loadI18nMessages(locale);

    const subject =
      i18n.welcome_subject ||
      `Bienvenido/a a ${this.configService.get<string>("SERVICE_NAME")}, ${userName}!`;
    const template = await this.getTemplate("welcome"); // No más locale aquí
    const htmlBody = template({
      userName,
      supportEmail: this.configService.get<string>("SUPPORT_EMAIL"),
      serviceName: this.configService.get<string>("SERVICE_NAME"),
      appBaseUrl: this.configService.get<string>("APP_BASE_URL"),
      i18n, // Pasar el objeto i18n completo
      // locale, // locale ya no es necesario directamente en la plantilla si usamos i18n
      // subject_email: subject, // El subject se puede obtener de i18n.welcome_subject en la plantilla
    });

    // Intentar obtener userId si es posible, pero permitir que sea opcional
    let userId: string | undefined;
    try {
      const user = await this.prisma.user.findUnique({ where: { email: to } });
      userId = user?.id;
    } catch (e) {
      this.logger.warn(
        `Could not fetch user by email ${to} for welcome email log: ${e.message}`
      );
    }

    await this.sendMail(to, subject, htmlBody, EmailType.WELCOME, userId);
  }

  async sendSubscriptionConfirmationEmail(
    dto: SendSubscriptionConfirmationEmailDto
  ): Promise<void> {
    const { to, userName, planName, locale = "es" } = dto;
    const i18n = await this.loadI18nMessages(locale);

    const subject =
      i18n.subscription_confirmation_subject?.replace(
        "{{planName}}",
        planName
      ) || `Confirmación de Suscripción: ${planName}`;
    const template = await this.getTemplate("subscription_confirmation");
    const htmlBody = template({
      userName,
      planName,
      supportEmail: this.configService.get<string>("SUPPORT_EMAIL"),
      serviceName: this.configService.get<string>("SERVICE_NAME"),
      appBaseUrl: this.configService.get<string>("APP_BASE_URL"),
      i18n,
    });
    let userId: string | undefined;
    try {
      const user = await this.prisma.user.findUnique({ where: { email: to } });
      userId = user?.id;
    } catch (e) {
      this.logger.warn(
        `Could not fetch user by email ${to} for subscription email log: ${e.message}`
      );
    }
    await this.sendMail(
      to,
      subject,
      htmlBody,
      EmailType.SUBSCRIPTION_CONFIRMATION,
      userId
    );
  }

  async sendPasswordResetRequestEmail(
    dto: SendPasswordResetRequestEmailDto
  ): Promise<void> {
    const { to, userName, resetLink, locale = "es" } = dto;
    const i18n = await this.loadI18nMessages(locale);

    const subject =
      i18n.password_reset_request_subject ||
      "Solicitud de Restablecimiento de Contraseña";
    const template = await this.getTemplate("password_reset_request");
    const htmlBody = template({
      userName,
      resetLink,
      supportEmail: this.configService.get<string>("SUPPORT_EMAIL"),
      serviceName: this.configService.get<string>("SERVICE_NAME"),
      i18n,
    });
    let userId: string | undefined;
    try {
      const user = await this.prisma.user.findUnique({ where: { email: to } });
      userId = user?.id;
    } catch (e) {
      this.logger.warn(
        `Could not fetch user by email ${to} for password reset request email log: ${e.message}`
      );
    }
    await this.sendMail(
      to,
      subject,
      htmlBody,
      EmailType.PASSWORD_RESET_REQUEST,
      userId
    );
  }

  async sendPasswordResetSuccessEmail(
    dto: SendPasswordResetSuccessEmailDto
  ): Promise<void> {
    const { to, userName, locale = "es" } = dto;
    const i18n = await this.loadI18nMessages(locale);

    const subject =
      i18n.password_reset_success_subject ||
      "Contraseña Restablecida Correctamente";
    const template = await this.getTemplate("password_reset_success");
    const htmlBody = template({
      userName,
      supportEmail: this.configService.get<string>("SUPPORT_EMAIL"),
      serviceName: this.configService.get<string>("SERVICE_NAME"),
      appBaseUrl: this.configService.get<string>("APP_BASE_URL"),
      i18n,
    });
    let userId: string | undefined;
    try {
      const user = await this.prisma.user.findUnique({ where: { email: to } });
      userId = user?.id;
    } catch (e) {
      this.logger.warn(
        `Could not fetch user by email ${to} for password reset success email log: ${e.message}`
      );
    }
    await this.sendMail(
      to,
      subject,
      htmlBody,
      EmailType.PASSWORD_RESET_SUCCESS,
      userId
    );
  }

  async sendContactFormNotification(
    dto: SendContactFormEmailDto
  ): Promise<void> {
    const {
      from_email,
      from_name,
      subject: contactSubject,
      message,
      option,
      locale = "es", // Aunque este correo es para el admin, podríamos querer localizarlo si el admin prefiere otro idioma.
    } = dto;
    const i18n = await this.loadI18nMessages(locale); // Usar 'es' o el locale del admin si estuviera disponible

    const recipientEmail = this.configService.get<string>("SUPPORT_EMAIL");
    if (!recipientEmail) {
      this.logger.error(
        "SUPPORT_EMAIL environment variable is not set. Cannot send contact form notification."
      );
      throw new InternalServerErrorException(
        "Support email is not configured."
      );
    }
    const emailSubjectToAdmin =
      i18n.contact_form_admin_notification_subject?.replace(
        "{{contactSubject}}",
        contactSubject
      ) || `Nuevo Mensaje de Contacto: ${contactSubject}`;

    const template = await this.getTemplate("contact_form_admin_notification");
    const htmlBody = template({
      from_name,
      from_email,
      contactSubject,
      messageBody: message,
      option,
      serviceName: this.configService.get<string>("SERVICE_NAME"),
      i18n,
    });

    // No se pasa userId ya que es un correo del sistema, no directamente a un usuario registrado por esta acción.
    await this.sendMail(
      recipientEmail,
      emailSubjectToAdmin,
      htmlBody,
      EmailType.CONTACT_FORM
    );
  }

  async sendPaymentFailedEmail(dto: SendPaymentFailedEmailDto): Promise<void> {
    const {
      to,
      userName,
      planName,
      nextPaymentAttemptDate,
      locale = "es",
    } = dto;
    const i18n = await this.loadI18nMessages(locale);

    const subject =
      i18n.payment_failed_subject || "Problema con tu Pago - Acción Requerida";
    const template = await this.getTemplate("payment_failed");
    const htmlBody = template({
      userName,
      planName,
      nextPaymentAttemptDate,
      supportEmail: this.configService.get<string>("SUPPORT_EMAIL"),
      serviceName: this.configService.get<string>("SERVICE_NAME"),
      appBaseUrl: this.configService.get<string>("APP_BASE_URL"),
      i18n,
    });
    let userId: string | undefined;
    try {
      const user = await this.prisma.user.findUnique({ where: { email: to } });
      userId = user?.id;
    } catch (e) {
      this.logger.warn(
        `Could not fetch user by email ${to} for payment failed email log: ${e.message}`
      );
    }
    await this.sendMail(
      to,
      subject,
      htmlBody,
      EmailType.PAYMENT_FAILED,
      userId
    );
  }

  async sendSubscriptionCancelledEmail(
    dto: SendSubscriptionCancelledEmailDto
  ): Promise<void> {
    const { to, userName, planName, endDate, locale = "es" } = dto;
    const i18n = await this.loadI18nMessages(locale);

    const subject =
      i18n.subscription_cancelled_subject?.replace("{{planName}}", planName) ||
      `Suscripción a ${planName} Cancelada`;
    const template = await this.getTemplate("subscription_cancelled");
    const htmlBody = template({
      userName,
      planName,
      endDate,
      supportEmail: this.configService.get<string>("SUPPORT_EMAIL"),
      serviceName: this.configService.get<string>("SERVICE_NAME"),
      appBaseUrl: this.configService.get<string>("APP_BASE_URL"),
      i18n,
    });
    let userId: string | undefined;
    try {
      const user = await this.prisma.user.findUnique({ where: { email: to } });
      userId = user?.id;
    } catch (e) {
      this.logger.warn(
        `Could not fetch user by email ${to} for subscription cancelled email log: ${e.message}`
      );
    }
    await this.sendMail(
      to,
      subject,
      htmlBody,
      EmailType.SUBSCRIPTION_CANCELLED,
      userId
    );
  }

  // TODO: Implementar sendAccountDeactivationEmail
  async sendAccountDeactivationEmail(
    dto: SendAccountDeactivationEmailDto
  ): Promise<void> {
    const { to, userName, locale = "es" } = dto;
    const i18n = await this.loadI18nMessages(locale);

    const subject =
      i18n.account_deactivation_subject ||
      "Confirmación de Desactivación de Cuenta";
    const template = await this.getTemplate("account_deactivation");
    const htmlBody = template({
      userName,
      supportEmail: this.configService.get<string>("SUPPORT_EMAIL"),
      serviceName: this.configService.get<string>("SERVICE_NAME"),
      appBaseUrl: this.configService.get<string>("APP_BASE_URL"),
      i18n,
    });
    let userId: string | undefined;
    try {
      const user = await this.prisma.user.findUnique({ where: { email: to } });
      userId = user?.id;
    } catch (e) {
      this.logger.warn(
        `Could not fetch user by email ${to} for account deactivation email log: ${e.message}`
      );
    }
    await this.sendMail(
      to,
      subject,
      htmlBody,
      EmailType.ACCOUNT_DEACTIVATION,
      userId
    );
  }

  // TODO: Implementar sendSubscriptionRenewalReminderEmail
  async sendSubscriptionRenewalReminderEmail(
    dto: SendSubscriptionRenewalReminderEmailDto
  ): Promise<void> {
    const { to, userName, planName, renewalDate, locale = "es" } = dto;
    const i18n = await this.loadI18nMessages(locale);

    const subject =
      i18n.subscription_renewal_reminder_subject?.replace(
        "{{planName}}",
        planName
      ) || `Recordatorio de Renovación de Suscripción: ${planName}`;
    const template = await this.getTemplate("subscription_renewal_reminder");
    const htmlBody = template({
      userName,
      planName,
      renewalDate,
      supportEmail: this.configService.get<string>("SUPPORT_EMAIL"),
      serviceName: this.configService.get<string>("SERVICE_NAME"),
      appBaseUrl: this.configService.get<string>("APP_BASE_URL"),
      i18n,
    });
    let userId: string | undefined;
    try {
      const user = await this.prisma.user.findUnique({ where: { email: to } });
      userId = user?.id;
    } catch (e) {
      this.logger.warn(
        `Could not fetch user by email ${to} for subscription renewal reminder email log: ${e.message}`
      );
    }
    await this.sendMail(
      to,
      subject,
      htmlBody,
      EmailType.SUBSCRIPTION_RENEWAL_REMINDER,
      userId
    );
  }

  async findAllLogs(params: {
    skip?: number;
    take?: number;
    where?: Prisma.EmailLogWhereInput;
  }): Promise<EmailLog[]> {
    const { skip, take, where } = params;
    return this.prisma.emailLog.findMany({
      skip,
      take,
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  async findOneLog(id: string): Promise<EmailLog | null> {
    const log = await this.prisma.emailLog.findUnique({ where: { id } });
    if (!log) {
      throw new NotFoundException(`EmailLog with ID ${id} not found`);
    }
    return log;
  }
}
