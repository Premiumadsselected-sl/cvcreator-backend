import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUUID,
  IsObject,
} from "class-validator";

export class ApiTokenDto {
  @ApiProperty({ description: "Identificador único del token API" })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: "ID de usuario asociado con el token API" })
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @ApiPropertyOptional({ description: "Nombre opcional para el token API" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description:
      "El token API (hasheado en BD, el token real se muestra una vez en la creación)",
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({ description: "Permisos otorgados al token" })
  @IsObject()
  @IsOptional()
  permissions?: any;

  @ApiPropertyOptional({
    description: "Marca de tiempo de cuándo se usó el token por última vez",
  })
  @IsDateString()
  @IsOptional()
  last_used_at?: Date;

  @ApiPropertyOptional({
    description: "Marca de tiempo de cuándo expira el token",
  })
  @IsDateString()
  @IsOptional()
  expires_at?: Date;

  @ApiProperty({ description: "Marca de tiempo de creación del token" })
  @IsDateString()
  @IsNotEmpty()
  createdAt: Date;

  @ApiProperty({
    description: "Marca de tiempo de la última actualización del token",
  })
  @IsDateString()
  @IsNotEmpty()
  updatedAt: Date;
}
