import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUUID,
  IsObject,
} from "class-validator";

export class AuditLogDto {
  @ApiProperty({
    description: "Audit log unique identifier",
    example: "log_a0eebc99",
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiPropertyOptional({
    description: "User ID who performed the action",
    example: "user-123",
  })
  @IsString()
  @IsOptional()
  user_id?: string;

  @ApiProperty({ description: "Action performed", example: "USER_LOGIN" })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiPropertyOptional({
    description: "Type of the target entity",
    example: "User",
  })
  @IsString()
  @IsOptional()
  target_type?: string;

  @ApiPropertyOptional({
    description: "ID of the target entity",
    example: "user-123",
  })
  @IsString()
  @IsOptional()
  target_id?: string;

  @ApiPropertyOptional({
    description: "Additional details of the action",
    example: { loginSuccess: true },
  })
  @IsObject()
  @IsOptional()
  details?: any;

  @ApiPropertyOptional({
    description: "IP address from which the action was performed",
    example: "192.168.1.100",
  })
  @IsString()
  // @IsIP() // Consider if you want to validate as IP address
  @IsOptional()
  ip_address?: string;

  @ApiPropertyOptional({
    description: "User agent of the client",
    example: "Mozilla/5.0 ...",
  })
  @IsString()
  @IsOptional()
  user_agent?: string;

  @ApiProperty({ description: "Timestamp of log creation" })
  @IsDateString()
  @IsNotEmpty()
  createdAt: Date;
}
