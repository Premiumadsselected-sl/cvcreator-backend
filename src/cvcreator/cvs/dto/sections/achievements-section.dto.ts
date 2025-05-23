import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsOptional, ValidateNested } from "class-validator";
import { BaseCvSectionDto } from "./base-section.dto";
import { GenericSectionItemDto } from "./generic-section-item.dto";

export class AchievementEntryDto extends GenericSectionItemDto {
  // title for Achievement Name/Summary
  // subtitle for Context (e.g., Project, Competition)
  // description for details of the achievement
  // startDate/endDate can be used for the date of achievement
}

export class AchievementsSectionDto extends BaseCvSectionDto {
  @ApiPropertyOptional({
    description: "List of achievements.",
    type: [AchievementEntryDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AchievementEntryDto)
  @IsOptional()
  entries?: AchievementEntryDto[];
}
