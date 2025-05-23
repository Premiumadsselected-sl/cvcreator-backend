import { PartialType, ApiPropertyOptional } from "@nestjs/swagger";
import { CreateTemplateDto, TemplateDesignType } from "./create-template.dto";
import {
  IsString,
  IsOptional,
  ValidateNested,
  IsEnum,
  IsBoolean,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";
import { CvTemplateStructureDto } from "./cv-template-structure.dto";

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {
  @ApiPropertyOptional({
    description: "New name for the template",
    example: "Elegant CV Template Red",
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: "New type for the template",
    enum: TemplateDesignType,
    example: TemplateDesignType.CV,
  })
  @IsEnum(TemplateDesignType)
  @IsOptional()
  type?: TemplateDesignType;

  @ApiPropertyOptional({
    description:
      "New structure for the template. For CVs, use CvTemplateStructureDto.",
    oneOf: [{ $ref: "#/components/schemas/CvTemplateStructureDto" }],
  })
  @ValidateNested()
  @Type(() => CvTemplateStructureDto) // Ajustar si es necesario para otros tipos
  @IsObject()
  @IsOptional()
  structure?: CvTemplateStructureDto | Record<string, any>;

  @ApiPropertyOptional({
    description: "New category for the template",
    example: "classic",
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: "Update premium status of the template",
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  is_premium?: boolean;
}
