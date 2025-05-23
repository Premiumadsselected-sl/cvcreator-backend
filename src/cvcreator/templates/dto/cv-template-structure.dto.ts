import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsObject, IsOptional, ValidateNested } from "class-validator";
import { CvTemplateSectionConfigDto } from "./cv-template-section-config.dto";

export class CvTemplateStructureDto {
  @ApiProperty({
    description: "Configuration for each section available in the CV template.",
    type: [CvTemplateSectionConfigDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvTemplateSectionConfigDto)
  sections: CvTemplateSectionConfigDto[];

  @ApiPropertyOptional({
    description:
      "Default global styles or settings for the template (e.g., font, colors).",
    example: { fontFamily: "Arial", primaryColor: "#333333" },
  })
  @IsObject()
  @IsOptional()
  defaultStyles?: Record<string, any>; // More specific DTO can be created if needed

  // Add other template-wide structure/layout properties here if necessary
  // e.g., columnLayout: "single" | "double"
}
