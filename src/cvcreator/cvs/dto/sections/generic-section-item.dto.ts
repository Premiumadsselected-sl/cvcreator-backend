import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsUUID, MinLength } from "class-validator";
import { v4 as uuidv4 } from "uuid";

export class GenericSectionItemDto {
  @ApiProperty({
    description: "Unique identifier for the item.",
    example: uuidv4(),
  })
  @IsUUID()
  id: string = uuidv4();

  @ApiPropertyOptional({
    description: "Main title (e.g., Job Title, Degree, Project Name).",
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({
    description:
      "Subtitle or secondary title (e.g., Company, Institution, Role).",
  })
  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiPropertyOptional({ description: "Location (e.g., City, State)." })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({
    description: "Start date (e.g., YYYY-MM-DD or YYYY-MM).",
  })
  @IsString() // Could be IsDateString if format is strict
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: "End date (e.g., YYYY-MM-DD, YYYY-MM, or 'Present').",
  })
  @IsString() // Could be IsDateString if format is strict
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description:
      "Detailed description, responsibilities, or achievements (can support Markdown).",
  })
  @IsString()
  @IsOptional()
  description?: string;
}
