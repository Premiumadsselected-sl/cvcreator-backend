import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import * as Handlebars from "handlebars"; // Cambiado
import * as fs from "fs/promises";
import * as path from "path";
import { EmailMessages } from "./interfaces/email-messages.interface";
import { EmailLogsService } from "./email-logs/email-logs.service"; // Importar EmailLogsService
import {
  CreateEmailLogDto,
  EmailStatus,
} from "./email-logs/dto/create-email-log.dto"; // Importar DTO y Enum
import { PrismaService } from "../prisma/prisma.service"; // <--- CORREGIDO: Ruta de Importación para PrismaService

@Injectable()
export class EmailsSystemService implements OnModuleInit {
  private readonly logger = new Logger(EmailsSystemService.name);
  private transporter;
  private emailTemplates = new Map<
    string,
    Handlebars.TemplateDelegate // Cambiado
  >();
  private emailStyles: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailLogsService: EmailLogsService, // Inyectar EmailLogsService
    private readonly prisma: PrismaService // <--- AÑADIDO: Inyectar PrismaService
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>("SMTP_HOST"),
      port: this.configService.get<number>("SMTP_PORT"),
      secure: this.configService.get<string>("SMTP_SECURE") === "true", // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>("SMTP_USER"),
        pass: this.configService.get<string>("SMTP_PASS"),
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.loadEmailAssets();
  }

  private async loadEmailAssets(): Promise<void> {
    try {
      // Cargar estilos
      const stylesPath = path.join(
        __dirname,
        "templates",
        "styles",
        "main.css"
      );
      this.emailStyles = await fs.readFile(stylesPath, "utf-8");

      // Cargar parciales de Handlebars
      const partialsPath = path.join(__dirname, "templates", "partials");
      const partialFiles = await fs.readdir(partialsPath);
      for (const file of partialFiles) {
        if (file.endsWith(".hbs")) {
          const partialName = path.basename(file, ".hbs");
          const partialContent = await fs.readFile(
            path.join(partialsPath, file),
            "utf-8"
          );
          Handlebars.registerPartial(partialName, partialContent);
        }
      }
      this.logger.log("Email partials loaded successfully.");

      // Cargar y compilar plantillas principales
      const templatesPath = path.join(__dirname, "templates");
      const templateFiles = [
        "welcome-email.hbs",
        "subscription-email.hbs",
        "contact-email.hbs",
        // Añadir más plantillas aquí según sea necesario
      ];
      for (const file of templateFiles) {
        const templateName = path.basename(file, ".hbs");
        const templateContent = await fs.readFile(
          path.join(templatesPath, file),
          "utf-8"
        );
        this.emailTemplates.set(
          templateName,
          Handlebars.compile(templateContent)
        );
      }
      this.logger.log("Email templates loaded and compiled successfully.");
    } catch (error) {
      this.logger.error("Failed to load email assets:", error);
      // Considerar si la aplicación debe fallar al iniciar si las plantillas no se cargan
    }
  }

  private async loadI18nMessages(locale: string): Promise<any> {
    try {
      // Ajusta la ruta según la estructura de tu proyecto
      // Asumiendo que los mensajes están en cvcreator-backend/messages/${locale}.json
      const messagesPath = path.join(
        __dirname,
        "..",
        "..",
        "messages",
        `${locale}.json`
      );
      const messagesContent = await fs.readFile(messagesPath, "utf-8");
      return JSON.parse(messagesContent);
    } catch (error) {
      this.logger.error(
        `Failed to load i18n messages for locale: ${locale}`,
        error
      );
      // Cargar un locale por defecto o lanzar un error
      const defaultMessagesPath = path.join(
        __dirname,
        "..",
        "..",
        "messages",
        "en.json"
      ); // Asume en.json como fallback
      const messagesContent = await fs.readFile(defaultMessagesPath, "utf-8");
      return JSON.parse(messagesContent);
    }
  }

  private async renderTemplate(
    templateName: string,
    data: EmailMessages
  ): Promise<string> {
    const template = this.emailTemplates.get(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found.`);
    }

    const i18nMessages = await this.loadI18nMessages(data.locale);
    const fullData = {
      ...data,
      i18n: i18nMessages,
      inline_styles: this.emailStyles,
      current_year: new Date().getFullYear(),
      company_name:
        this.configService.get<string>("COMPANY_NAME") || "Your Company",
      service_domain_url:
        this.configService.get<string>("APP_URL_FRONTEND") ||
        "https://example.com",
    };

    return template(fullData);
  }

  async sendMail(
    to: string,
    subject: string,
    templateName: string,
    data: EmailMessages,
    emailType: string, // Añadir emailType para el log
    userId?: string // Añadir userId opcional para el log
  ): Promise<void> {
    const html = await this.renderTemplate(templateName, data);
    const mailOptions = {
      from: `"${this.configService.get<string>(
        "SMTP_FROM_NAME"
      )}" <${this.configService.get<string>("SMTP_FROM_EMAIL")}>`,
      to,
      subject,
      html,
    };

    const logEntry: CreateEmailLogDto = {
      recipient_email: to,
      subject,
      type: emailType,
      user_id: userId,
      status: EmailStatus.PENDING,
      // body: html, // Considerar si guardar el HTML completo o solo la referencia a la plantilla
    };

    let savedLog;
    try {
      // Asegúrate de que `logEntry` tenga todos los campos necesarios para `create`
      savedLog = await this.emailLogsService.create(logEntry); // Cambiado de createLog a create
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${to}: ${info.messageId}`);
      // Actualizar el log existente
      await this.emailLogsService.update(savedLog.id, {
        status: EmailStatus.SENT,
        sent_at: new Date(),
        provider_message_id: info.messageId,
      });
    } catch (error) {
      this.logger.error(`Error sending email to ${to}:`, error.stack);
      if (savedLog && savedLog.id) {
        // Asegurarse de que savedLog y su id existen
        // Actualizar el log existente
        await this.emailLogsService.update(savedLog.id, {
          status: EmailStatus.FAILED,
          error_message: error.message,
        });
      }
      throw error;
    }
  }

  async sendWelcomeEmail(data: EmailMessages): Promise<void> {
    const i18n = await this.loadI18nMessages(data.locale);
    const subject =
      data.subject_email || i18n.WellcomeEmail?.subject || "Welcome!";
    await this.sendMail(
      data.email,
      subject,
      "welcome-email",
      data,
      "welcome", // emailType
      data.user_id // userId
    );
  }

  async sendSubscriptionEmail(data: EmailMessages): Promise<void> {
    let targetLocale = data.locale;

    if (!targetLocale && data.email) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { email: data.email },
          select: { locale: true },
        });
        if (user && user.locale) {
          targetLocale = user.locale;
        } else {
          this.logger.warn(
            `User with email ${data.email} not found or locale not set for subscription email. Falling back to default locale.`
          );
          // Usar el locale de fallback o uno predeterminado, ej. 'en'
          // loadI18nMessages ya tiene una lógica de fallback a 'en.json'
          targetLocale =
            this.configService.get<string>("FALLBACK_LOCALE") || "en";
        }
      } catch (error) {
        this.logger.error(
          `Error fetching user locale for ${data.email}:`,
          error
        );
        targetLocale =
          this.configService.get<string>("FALLBACK_LOCALE") || "en";
      }
    } else if (!targetLocale) {
      // Si no hay email para buscar y no hay locale, usar fallback
      this.logger.warn(
        `No locale or email provided for subscription email. Falling back to default locale.`
      );
      targetLocale = this.configService.get<string>("FALLBACK_LOCALE") || "en";
    }

    // Asegurarse de que data.locale se actualice para renderTemplate
    const emailDataForRender: EmailMessages = { ...data, locale: targetLocale };

    const i18n = await this.loadI18nMessages(targetLocale);
    const subject =
      data.subject_email ||
      i18n.SuscriptionEmail?.subject ||
      "Subscription Confirmation";

    await this.sendMail(
      data.email,
      subject,
      "subscription-email",
      emailDataForRender, // <--- MODIFICADO: Usar emailDataForRender con el locale determinado
      "subscription_confirmation", // emailType
      data.user_id // userId
    );
  }

  async sendContactEmail(data: EmailMessages): Promise<void> {
    const i18n = await this.loadI18nMessages(data.locale);
    const subject =
      data.subject_email || i18n.ContactEmail?.subject || "New Contact Message";
    const recipientEmail =
      this.configService.get<string>("SUPPORT_EMAIL") || data.support_email;
    if (!recipientEmail) {
      this.logger.error("No recipient email configured for contact form.");
      return;
    }
    await this.sendMail(
      recipientEmail,
      subject,
      "contact-email",
      data,
      "contact_form", // emailType
      data.user_id // userId (si es un usuario logueado quien contacta)
    );
  }

  // El método logEmail ya no es necesario aquí, se maneja dentro de sendMail
}
