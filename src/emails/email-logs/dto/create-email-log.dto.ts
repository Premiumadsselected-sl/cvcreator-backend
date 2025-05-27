import { IsString, IsEmail, IsOptional, IsDate, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum EmailStatus {
  PENDING = "pending",
  SENT = "sent",
  FAILED = "failed",
  BOUNCED = "bounced",
}

export class CreateEmailLogDto {
  @ApiPropertyOptional({
    description: "User ID if the email is associated with a user",
  })
  @IsString()
  @IsOptional()
  user_id?: string;

  @ApiProperty({ description: "Recipient email address" })
  @IsEmail()
  recipient_email: string;

  @ApiProperty({ description: "Email subject" })
  @IsString()
  subject: string;

  @ApiPropertyOptional({ description: "Email body or path to template" })
  @IsString()
  @IsOptional()
  body?: string;

  @ApiPropertyOptional({
    enum: EmailStatus,
    description: "Status of the email",
    default: EmailStatus.PENDING,
  })
  @IsEnum(EmailStatus)
  @IsOptional()
  status?: EmailStatus;

  @ApiPropertyOptional({ description: "Timestamp when the email was sent" })
  @IsDate()
  @IsOptional()
  sent_at?: Date;

  @ApiPropertyOptional({ description: "Error message if sending failed" })
  @IsString()
  @IsOptional()
  error_message?: string;

  @ApiPropertyOptional({ description: "Message ID from the email provider" })
  @IsString()
  @IsOptional()
  provider_message_id?: string;

  @ApiProperty({ description: "Type of email (e.g., welcome, password_reset)" })
  @IsString()
  type: string;
}
