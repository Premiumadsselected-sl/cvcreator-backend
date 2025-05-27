export interface EmailMessages {
  readonly email: string;
  readonly support_email?: string;
  readonly subject_email?: string;
  readonly from_email?: string;
  readonly user_name?: string;
  readonly option?: string;
  readonly message?: string;
  readonly locale: string;
  // Campos adicionales que puedan necesitar las plantillas
  readonly reset_password_link?: string;
  readonly company_name?: string;
  readonly service_domain_url?: string;
  readonly [key: string]: any; // Para permitir datos adicionales específicos de la plantilla
}
