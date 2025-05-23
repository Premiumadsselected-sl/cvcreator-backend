import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsEnum,
  ValidateNested,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { CvTemplateStructureDto } from "./cv-template-structure.dto";

// Si tienes tipos específicos para plantillas (ej. CV, CoverLetter), defínelos.
// Por ahora, usaremos un string genérico, pero un Enum sería mejor para consistencia.
export enum TemplateDesignType {
  CV = "cv",
  COVER_LETTER = "cover_letter",
  // Otros tipos de plantillas que puedas tener
}

export class CreateTemplateDto {
  @ApiProperty({
    description: "Name of the template",
    example: "Modern CV Template Blue",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "Type of the template",
    enum: TemplateDesignType,
    example: TemplateDesignType.CV,
  })
  @IsEnum(TemplateDesignType)
  @IsNotEmpty()
  type: TemplateDesignType;

  @ApiPropertyOptional({
    description: "Description of the template",
    example: "A clean and modern template for CVs, with blue accents.",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "URL of the preview image for the template",
    example: "https://example.com/images/template-preview.png",
  })
  @IsString()
  @IsOptional()
  preview_image_url?: string;

  @ApiProperty({
    description:
      "Structure of the template. For CVs, use CvTemplateStructureDto.",
    // El tipo aquí puede ser más específico si siempre esperas CvTemplateStructureDto para tipo 'cv'
    // o uniones de DTOs para otros tipos de plantillas.
    oneOf: [{ $ref: "#/components/schemas/CvTemplateStructureDto" }],
  })
  @ValidateNested() // Asegúrate de validar la estructura anidada
  @Type(() => CvTemplateStructureDto) // Asume CvTemplateStructureDto por ahora, ajustar si es necesario
  @IsObject()
  @IsNotEmpty()
  structure: CvTemplateStructureDto | Record<string, any>; // Permite flexibilidad

  @ApiPropertyOptional({
    description: "Category of the template (e.g., modern, classic, creative)",
    example: "modern",
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: "Indicates if the template is a premium template",
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  is_premium?: boolean = false;

  // usage_count se manejará internamente
  // createdAt y updatedAt son manejados por Prisma
}
