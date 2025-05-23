/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsInt, IsBoolean, Min } from "class-validator";

// Defines the type of sections available in a CV
// This could be extended or made more dynamic if needed
export type CvSectionKey =
  | "contactInfo"
  | "professionalSummary"
  | "experience"
  | "education"
  | "skills"
  | "languages"
  | "projects"
  | "achievements"
  | "certificatesCourses"
  | "awardsHonors"
  | "publications"
  | "references"
  | string; // Allows for custom section keys, e.g., "custom_driving_license"

export class CvTemplateSectionConfigDto {
  @ApiProperty({
    description:
      "Unique key identifying the section (e.g., 'experience', 'education', 'custom_skills').",
    example: "experience",
  })
  @IsString()
  @IsNotEmpty()
  sectionKey: CvSectionKey;

  @ApiProperty({
    description: "Default display order of this section in the template.",
    example: 1,
  })
  @IsInt()
  @Min(0)
  order: number;

  @ApiProperty({
    description:
      "Indicates if the section is enabled by default in this template.",
    example: true,
  })
  @IsBoolean()
  isEnabledByDefault: boolean;

  @ApiProperty({
    description:
      "Default title for the section in this template. Can be overridden by user.",
    example: "Work Experience",
  })
  @IsString()
  @IsNotEmpty()
  defaultTitle: string;
}
