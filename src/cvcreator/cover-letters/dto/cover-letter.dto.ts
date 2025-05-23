import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDateString,
  IsUUID,
  IsObject, // Keep for settings, if it remains generic
  ValidateNested, // Added for nested DTO validation
} from "class-validator";
import { Type } from "class-transformer"; // Added for nested DTO transformation
import { CoverLetterContentDto } from "./cover-letter-content.dto"; // Import the new DTO

export class CoverLetterDto {
  @ApiProperty({
    description: "Cover letter unique identifier",
    example: "cl_a0eebc99",
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: "User ID associated with the cover letter",
    example: "user-123",
  })
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({
    description: "Title of the cover letter",
    example: "Application for Software Engineer",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: "Slug for user-friendly URLs",
    example: "cover-letter-software-engineer",
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({
    description: "ID of the template used for the cover letter",
    example: "template-cl-formal-1",
  })
  @IsString()
  @IsOptional()
  template_id?: string;

  @ApiProperty({
    description: "Main content of the cover letter",
    type: () => CoverLetterContentDto,
  })
  @ValidateNested()
  @Type(() => CoverLetterContentDto)
  @IsNotEmpty()
  content: CoverLetterContentDto; // Changed type from any to CoverLetterContentDto

  @ApiPropertyOptional({
    description: "Specific settings for the cover letter",
    example: { fontSize: 12 },
  })
  @IsObject()
  @IsOptional()
  settings?: any;

  @ApiProperty({
    description: "Indicates if the cover letter is publicly accessible",
    example: false,
  })
  @IsBoolean()
  @IsNotEmpty()
  is_public: boolean;

  @ApiPropertyOptional({
    description: "Token for sharing private cover letters",
    example: "share_token_cl_123",
  })
  @IsString()
  @IsOptional()
  share_token?: string;

  @ApiProperty({
    description: "Version number of the cover letter",
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  version: number;

  @ApiProperty({ description: "Timestamp of cover letter creation" })
  @IsDateString()
  @IsNotEmpty()
  createdAt: Date;

  @ApiProperty({ description: "Timestamp of last cover letter update" })
  @IsDateString()
  @IsNotEmpty()
  updatedAt: Date;

  @ApiPropertyOptional({ description: "Timestamp of cover letter deletion" })
  @IsDateString()
  @IsOptional()
  deletedAt?: Date;
}
