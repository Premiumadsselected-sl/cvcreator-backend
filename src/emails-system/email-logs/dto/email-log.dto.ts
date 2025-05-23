import { ApiProperty } from "@nestjs/swagger"; // Eliminado ApiPropertyOptional
import { EmailStatus } from "./create-email-log.dto";

export class EmailLogDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  recipient_email: string;

  @ApiProperty()
  subject: string;

  @ApiProperty({ enum: EmailStatus })
  status: EmailStatus;

  @ApiProperty({ required: false })
  error_message?: string;

  @ApiProperty({ required: false })
  sent_at?: Date;

  @ApiProperty({ required: false })
  template_used?: string;

  @ApiProperty({ required: false })
  user_id?: string;

  @ApiProperty()
  type: string;

  @ApiProperty({ required: false })
  provider_message_id?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
