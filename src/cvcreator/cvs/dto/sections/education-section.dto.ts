import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsOptional, ValidateNested, IsString } from "class-validator";
import { BaseCvSectionDto } from "./base-section.dto";
import { GenericSectionItemDto } from "./generic-section-item.dto";

export class EducationEntryDto extends GenericSectionItemDto {
  // title from GenericSectionItemDto can be used for Degree/Program Name
  // subtitle from GenericSectionItemDto can be used for Institution Name
  // description can include GPA, honors, relevant coursework etc.

  @ApiPropertyOptional({
    description: "Field of study.",
    example: "Computer Science",
  })
  @IsString()
  @IsOptional()
  fieldOfStudy?: string;
}

export class EducationSectionDto extends BaseCvSectionDto {
  @ApiPropertyOptional({
    description: "List of educational qualifications.",
    type: [EducationEntryDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationEntryDto)
  @IsOptional()
  entries?: EducationEntryDto[];
}
