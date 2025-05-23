import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsOptional, ValidateNested } from "class-validator";
import { BaseCvSectionDto } from "./base-section.dto";
import { GenericSectionItemDto } from "./generic-section-item.dto";

export class AwardHonorEntryDto extends GenericSectionItemDto {
  // title for Award/Honor Name
  // subtitle for Awarding Body/Institution
  // description for significance, context
  // startDate for Date Awarded
}

export class AwardsHonorsSectionDto extends BaseCvSectionDto {
  @ApiPropertyOptional({
    description: "List of awards and honors.",
    type: [AwardHonorEntryDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AwardHonorEntryDto)
  @IsOptional()
  entries?: AwardHonorEntryDto[];
}
