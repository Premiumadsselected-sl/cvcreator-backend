import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsOptional, ValidateNested } from "class-validator";
import { BaseCvSectionDto } from "./base-section.dto";
import { GenericSectionItemDto } from "./generic-section-item.dto";

export class ExperienceEntryDto extends GenericSectionItemDto {
  // title from GenericSectionItemDto can be used for Job Title
  // subtitle from GenericSectionItemDto can be used for Company Name
}

export class ExperienceSectionDto extends BaseCvSectionDto {
  @ApiPropertyOptional({
    description: "List of work experiences.",
    type: [ExperienceEntryDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceEntryDto)
  @IsOptional()
  entries?: ExperienceEntryDto[];
}
