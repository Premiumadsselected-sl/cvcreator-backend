import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsOptional,
  ValidateNested,
  IsString,
  IsNotEmpty,
} from "class-validator";
import { BaseCvSectionDto } from "./base-section.dto";
import { GenericSectionItemDto } from "./generic-section-item.dto"; // Can be used for flexible items

// If custom section items are very generic (title, description)
export class CustomSectionItemDto extends GenericSectionItemDto {
  // Inherits id, title, subtitle, location, startDate, endDate, description
  // Add any other truly generic fields if necessary
}

export class CustomSectionDto extends BaseCvSectionDto {
  @ApiProperty({
    description:
      "Unique key for this custom section type, defined by user or system if multiple custom sections.",
    example: "driving_license",
  })
  @IsString()
  @IsNotEmpty()
  sectionKey: string; // e.g., "driving_license", "personal_competencies"

  @ApiProperty({
    description:
      "The title for this custom section, which overrides customTitle from BaseCvSectionDto if both are set, or acts as the main title.",
    example: "Permiso de Conducir",
  })
  @IsString()
  @IsNotEmpty()
  title: string; // This title is crucial for custom sections.

  @ApiPropertyOptional({
    description: "List of items in this custom section.",
    type: [CustomSectionItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomSectionItemDto)
  @IsOptional()
  entries?: CustomSectionItemDto[];

  // Alternatively, if the content is just a block of text:
  @ApiPropertyOptional({
    description:
      "Simple text content for the custom section, if not using itemized entries.",
  })
  @IsString()
  @IsOptional()
  textContent?: string;
}
