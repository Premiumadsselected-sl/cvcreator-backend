import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsDateString,
  IsUUID,
  IsObject, // Keep for fallback or non-CV template types
  ValidateNested,
  ValidateIf,
} from "class-validator";
import { Type } from "class-transformer";
import { CvTemplateStructureDto } from "./cv-template-structure.dto";

export enum TemplateType {
  CV = "cv",
  COVER_LETTER = "cover_letter",
}

export class TemplateDto {
  @ApiProperty({
    description: "Template unique identifier",
    example: "tpl_a0eebc99",
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: "Name of the template",
    example: "Modern CV Template",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "Type of the template",
    enum: TemplateType,
    example: TemplateType.CV,
  })
  @IsEnum(TemplateType)
  @IsNotEmpty()
  type: TemplateType;

  @ApiPropertyOptional({ description: "Detailed description of the template" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "URL of the template preview image",
    example: "https://example.com/preview.png",
  })
  @IsString()
  // Consider @IsUrl() if you want to validate it as a URL
  @IsOptional()
  preview_image_url?: string;

  @ApiProperty({
    description:
      "Base structure of the template. Shape depends on the 'type' field.",
    example: { sections: [], defaultStyles: {} }, // Generic example
  })
  @ValidateNested()
  @ValidateIf((o) => o.type === TemplateType.CV)
  @Type(() => CvTemplateStructureDto)
  @IsOptional() // Make it optional if structure can be truly dynamic or not present for some types initially
  structure?: CvTemplateStructureDto | Record<string, any>; // Allows CvTemplateStructureDto or a generic object for other types

  @ApiPropertyOptional({
    description:
      "Raw content for non-CV templates or as a fallback. Consider specific DTOs for other types like CoverLetter.",
    type: "object",
    example: { main_content: "Dear Sir/Madam..." },
    additionalProperties: true, // Allow any properties for this generic object
  })
  @ValidateIf((o) => o.type !== TemplateType.CV)
  @IsObject()
  @IsOptional()
  rawStructure?: Record<string, any>; // Used if type is not CV

  @ApiPropertyOptional({
    description: "Category of the template",
    example: "creative",
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: "Indicates if the template is a premium template",
    example: false,
  })
  @IsBoolean()
  @IsNotEmpty()
  is_premium: boolean;

  @ApiProperty({
    description: "How many times the template has been used",
    example: 150,
  })
  @IsInt()
  @IsNotEmpty()
  usage_count: number;

  @ApiProperty({ description: "Timestamp of template creation" })
  @IsDateString()
  @IsNotEmpty()
  createdAt: Date;

  @ApiProperty({ description: "Timestamp of last template update" })
  @IsDateString()
  @IsNotEmpty()
  updatedAt: Date;
}
