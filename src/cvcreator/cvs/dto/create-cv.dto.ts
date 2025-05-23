import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsObject,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { CvContentDto } from "./cv-content.dto";

export class CreateCvDto {
  @ApiProperty({
    description: "Título del CV",
    example: "Mi CV Profesional",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: "Descripción opcional para el CV",
    example:
      "Un CV que muestra mis habilidades y experiencia en desarrollo de software.",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "ID de la plantilla utilizada para este CV",
    example: "template-xyz-123",
    nullable: true,
  })
  @IsString()
  @IsOptional()
  template_id?: string | null;

  @ApiProperty({
    description: "Contenido principal del CV",
    type: () => CvContentDto,
  })
  @ValidateNested()
  @Type(() => CvContentDto)
  @IsNotEmpty()
  content: CvContentDto;

  @ApiPropertyOptional({
    description:
      "Configuraciones específicas para el CV (p. ej., colores, fuentes) en formato JSON",
    example: { themeColor: "#007bff", fontSize: "12px" },
    type: "object",
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;

  @ApiPropertyOptional({
    description:
      "Indica si el CV es accesible públicamente. Por defecto es false.",
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  is_public?: boolean = false;
}
