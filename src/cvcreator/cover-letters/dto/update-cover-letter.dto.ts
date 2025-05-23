import { PartialType, ApiPropertyOptional } from "@nestjs/swagger";
import { CreateCoverLetterDto } from "./create-cover-letter.dto";
import {
  IsString,
  IsOptional,
  ValidateNested,
  IsObject,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { CoverLetterContentDto } from "./cover-letter-content.dto";

export class UpdateCoverLetterDto extends PartialType(CreateCoverLetterDto) {
  @ApiPropertyOptional({
    description: "New title for the cover letter",
    example: "Updated Application for Product Manager",
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description:
      "New ID of the template to be used. Send null to detach the current template.",
    example: "template-cl-formal-2",
    nullable: true,
  })
  @IsString()
  @IsOptional()
  template_id?: string | null;

  @ApiPropertyOptional({
    description: "New main content for the cover letter",
    type: () => CoverLetterContentDto,
  })
  @ValidateNested()
  @Type(() => CoverLetterContentDto)
  @IsOptional()
  content?: CoverLetterContentDto;

  @ApiPropertyOptional({
    description: "New specific settings for the cover letter",
    example: { fontSize: 12, margin: "0.75 inch" },
    type: "object",
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;

  @ApiPropertyOptional({
    description: "Update public accessibility status",
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  is_public?: boolean;
}
