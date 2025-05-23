import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsJSON,
  IsIP,
  IsNotEmpty,
} from "class-validator";

export class CreateAuditLogDto {
  @ApiPropertyOptional({
    description: "User ID who performed the action",
    example: "user-cuid",
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
    example: "target-cuid",
  })
  @IsString()
  @IsOptional()
  target_id?: string;

  @ApiPropertyOptional({
    description: "Additional details of the action as a JSON object",
  })
  @IsJSON()
  @IsOptional()
  details?: string; // Prisma espera Json, pero class-validator usa IsJSON para string

  @ApiPropertyOptional({
    description: "IP address of the request originator",
    example: "192.168.1.1",
  })
  @IsIP()
  @IsOptional()
  ip_address?: string;

  @ApiPropertyOptional({
    description: "User agent of the request originator",
    example: "Mozilla/5.0 (...)",
  })
  @IsString()
  @IsOptional()
  user_agent?: string;
}
