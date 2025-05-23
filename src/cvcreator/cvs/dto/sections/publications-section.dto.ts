import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsOptional, ValidateNested, IsString } from "class-validator";
import { BaseCvSectionDto } from "./base-section.dto";
import { GenericSectionItemDto } from "./generic-section-item.dto";

export class PublicationEntryDto extends GenericSectionItemDto {
  // title for Publication Title (Article, Book, Blog Post)
  // subtitle for Publisher/Journal/Platform
  // description for abstract, summary, or link
  // startDate for Publication Date

  @ApiPropertyOptional({
    description: "Link to the publication (e.g., DOI, URL).",
    example: "https://doi.org/xxxx",
  })
  @IsString() // Consider @IsUrl
  @IsOptional()
  publicationLink?: string;
}

export class PublicationsSectionDto extends BaseCvSectionDto {
  @ApiPropertyOptional({
    description: "List of publications.",
    type: [PublicationEntryDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublicationEntryDto)
  @IsOptional()
  entries?: PublicationEntryDto[];
}
