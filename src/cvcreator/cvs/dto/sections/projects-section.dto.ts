import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsOptional, ValidateNested, IsString } from "class-validator";
import { BaseCvSectionDto } from "./base-section.dto";
import { GenericSectionItemDto } from "./generic-section-item.dto"; // Reusing for project structure

export class ProjectEntryDto extends GenericSectionItemDto {
  // title for Project Name
  // subtitle for Role or Technologies Used
  // description for project details, impact, link to project

  @ApiPropertyOptional({
    description: "Link to the project (e.g., GitHub repo, live demo).",
    example: "https://github.com/user/project",
  })
  @IsString() // Consider @IsUrl
  @IsOptional()
  projectUrl?: string;
}

export class ProjectsSectionDto extends BaseCvSectionDto {
  @ApiPropertyOptional({
    description: "List of projects.",
    type: [ProjectEntryDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectEntryDto)
  @IsOptional()
  entries?: ProjectEntryDto[];
}
