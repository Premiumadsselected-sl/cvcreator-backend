import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDateString,
  IsUUID,
  IsObject,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { CvContentDto } from "./cv-content.dto";

export class CvDto {
  @ApiProperty({ description: "Identificador único del CV" })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: "ID de usuario asociado con el CV" })
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({ description: "Título del CV" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: "Slug para URLs amigables" })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ description: "Descripción del CV" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "ID de la plantilla utilizada para el CV",
  })
  @IsString()
  @IsOptional()
  template_id?: string;

  @ApiProperty({ description: "Contenido principal del CV" })
  @ValidateNested()
  @Type(() => CvContentDto)
  @IsNotEmpty()
  content: CvContentDto;

  @ApiPropertyOptional({
    description: "Configuraciones específicas para el CV",
  })
  @IsObject()
  @IsOptional()
  settings?: any;

  @ApiProperty({
    description: "Indica si el CV es accesible públicamente",
    default: false,
  })
  @IsBoolean()
  @IsNotEmpty()
  is_public: boolean;

  @ApiPropertyOptional({ description: "Token para compartir CVs privados" })
  @IsString()
  @IsOptional()
  share_token?: string;

  @ApiProperty({ description: "Número de versión del CV", default: 1 })
  @IsInt()
  @IsNotEmpty()
  version: number;

  @ApiPropertyOptional({
    description: "Fecha y hora de la última visualización del CV",
  })
  @IsDateString()
  @IsOptional()
  last_viewed_at?: Date;

  @ApiProperty({ description: "Fecha y hora de creación del CV" })
  @IsDateString()
  @IsNotEmpty()
  createdAt: Date;

  @ApiProperty({
    description: "Fecha y hora de la última actualización del CV",
  })
  @IsDateString()
  @IsNotEmpty()
  updatedAt: Date;

  @ApiPropertyOptional({ description: "Fecha y hora de eliminación del CV" })
  @IsDateString()
  @IsOptional()
  deletedAt?: Date;
}
