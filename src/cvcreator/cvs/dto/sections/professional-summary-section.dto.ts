import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, MinLength } from "class-validator";
import { BaseCvSectionDto } from "./base-section.dto";

export class ProfessionalSummarySectionDto extends BaseCvSectionDto {
  @ApiPropertyOptional({
    description: "The content of the professional summary or objective.",
    example:
      "A results-driven software engineer with 5+ years of experience...",
  })
  @IsString()
  @MinLength(10) // Example validation
  @IsOptional()
  summary?: string;
}
