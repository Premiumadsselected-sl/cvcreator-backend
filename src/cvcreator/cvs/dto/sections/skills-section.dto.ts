import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
  IsUUID,
} from "class-validator";
import { BaseCvSectionDto } from "./base-section.dto";
import { v4 as uuidv4 } from "uuid";

export class SkillEntryDto {
  @ApiProperty({
    description: "Unique identifier for the skill entry.",
    example: uuidv4(),
  })
  @IsUUID()
  id: string = uuidv4();

  @ApiProperty({ description: "Name of the skill.", example: "JavaScript" })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: "Proficiency level (e.g., 1-5 or descriptive).",
    example: 4,
  })
  @IsInt()
  @Min(1)
  @Max(5) // Example: 5-star rating
  @IsOptional()
  level?: number; // Or string for "Beginner", "Intermediate", "Advanced"

  @ApiPropertyOptional({
    description:
      "Category of the skill (e.g., Programming Language, Software, Soft Skill)",
  })
  @IsString()
  @IsOptional()
  category?: string;
}

export class SkillsSectionDto extends BaseCvSectionDto {
  @ApiPropertyOptional({
    description: "List of skills.",
    type: [SkillEntryDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillEntryDto)
  @IsOptional()
  entries?: SkillEntryDto[];
}
