import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
  IsUUID,
} from "class-validator";
import { BaseCvSectionDto } from "./base-section.dto";
import { v4 as uuidv4 } from "uuid";

export class LanguageEntryDto {
  @ApiProperty({
    description: "Unique identifier for the language entry.",
    example: uuidv4(),
  })
  @IsUUID()
  id: string = uuidv4();

  @ApiProperty({ description: "Name of the language.", example: "Spanish" })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: "Proficiency level (e.g., Native, Fluent, Conversational).",
    example: "Native",
  })
  @IsString()
  @IsOptional()
  proficiency?: string;
}

export class LanguagesSectionDto extends BaseCvSectionDto {
  @ApiPropertyOptional({
    description: "List of languages spoken.",
    type: [LanguageEntryDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageEntryDto)
  @IsOptional()
  entries?: LanguageEntryDto[];
}
