import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CoverLetterContentDto {
  @ApiProperty({
    description: "Main content of the cover letter",
    example:
      "Dear Hiring Manager,\n\nI am writing to express my interest in the Software Engineer position...",
  })
  @IsString()
  @IsNotEmpty()
  main_content: string;

  // You can add more structured fields later if needed, e.g.:
  // @ApiPropertyOptional({ description: "Salutation", example: "Dear Hiring Manager," })
  // @IsString()
  // @IsOptional()
  // salutation?: string;

  // @ApiPropertyOptional({ description: "Closing", example: "Sincerely," })
  // @IsString()
  // @IsOptional()
  // closing?: string;
}
