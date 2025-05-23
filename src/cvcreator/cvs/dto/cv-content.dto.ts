import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ValidateNested, IsOptional, IsArray } from "class-validator";
import {
  ContactInfoSectionDto,
  ProfessionalSummarySectionDto,
  ExperienceSectionDto,
  EducationSectionDto,
  SkillsSectionDto,
  LanguagesSectionDto,
  ProjectsSectionDto,
  AchievementsSectionDto,
  CertificatesCoursesSectionDto,
  AwardsHonorsSectionDto,
  PublicationsSectionDto,
  ReferencesSectionDto,
  CustomSectionDto,
} from "./sections";

export class CvContentDto {
  @ApiPropertyOptional({ type: () => ContactInfoSectionDto })
  @ValidateNested()
  @Type(() => ContactInfoSectionDto)
  @IsOptional()
  contactInfo?: ContactInfoSectionDto;

  @ApiPropertyOptional({ type: () => ProfessionalSummarySectionDto })
  @ValidateNested()
  @Type(() => ProfessionalSummarySectionDto)
  @IsOptional()
  professionalSummary?: ProfessionalSummarySectionDto;

  @ApiPropertyOptional({ type: () => ExperienceSectionDto })
  @ValidateNested()
  @Type(() => ExperienceSectionDto)
  @IsOptional()
  experience?: ExperienceSectionDto;

  @ApiPropertyOptional({ type: () => EducationSectionDto })
  @ValidateNested()
  @Type(() => EducationSectionDto)
  @IsOptional()
  education?: EducationSectionDto;

  @ApiPropertyOptional({ type: () => SkillsSectionDto })
  @ValidateNested()
  @Type(() => SkillsSectionDto)
  @IsOptional()
  skills?: SkillsSectionDto;

  @ApiPropertyOptional({ type: () => LanguagesSectionDto })
  @ValidateNested()
  @Type(() => LanguagesSectionDto)
  @IsOptional()
  languages?: LanguagesSectionDto;

  @ApiPropertyOptional({ type: () => ProjectsSectionDto })
  @ValidateNested()
  @Type(() => ProjectsSectionDto)
  @IsOptional()
  projects?: ProjectsSectionDto;

  @ApiPropertyOptional({ type: () => AchievementsSectionDto })
  @ValidateNested()
  @Type(() => AchievementsSectionDto)
  @IsOptional()
  achievements?: AchievementsSectionDto;

  @ApiPropertyOptional({ type: () => CertificatesCoursesSectionDto })
  @ValidateNested()
  @Type(() => CertificatesCoursesSectionDto)
  @IsOptional()
  certificatesCourses?: CertificatesCoursesSectionDto;

  @ApiPropertyOptional({ type: () => AwardsHonorsSectionDto })
  @ValidateNested()
  @Type(() => AwardsHonorsSectionDto)
  @IsOptional()
  awardsHonors?: AwardsHonorsSectionDto;

  @ApiPropertyOptional({ type: () => PublicationsSectionDto })
  @ValidateNested()
  @Type(() => PublicationsSectionDto)
  @IsOptional()
  publications?: PublicationsSectionDto;

  @ApiPropertyOptional({ type: () => ReferencesSectionDto })
  @ValidateNested()
  @Type(() => ReferencesSectionDto)
  @IsOptional()
  references?: ReferencesSectionDto;

  @ApiPropertyOptional({
    description: "Array de secciones personalizadas definidas por el usuario.",
    type: [CustomSectionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomSectionDto)
  @IsOptional()
  customSections?: CustomSectionDto[];
}
