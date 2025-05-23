import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsOptional, ValidateNested, IsString } from "class-validator";
import { BaseCvSectionDto } from "./base-section.dto";
import { GenericSectionItemDto } from "./generic-section-item.dto";

export class CertificateEntryDto extends GenericSectionItemDto {
  // title for Certificate/Course Name
  // subtitle for Issuing Organization
  // description for details, skills gained
  // startDate for Issue Date, endDate for Expiry Date (if applicable)

  @ApiPropertyOptional({
    description: "Credential ID or URL for verification.",
    example: "UC-XXXX-YYYY",
  })
  @IsString()
  @IsOptional()
  credentialId?: string;
}

export class CertificatesCoursesSectionDto extends BaseCvSectionDto {
  @ApiPropertyOptional({
    description: "List of certificates and courses.",
    type: [CertificateEntryDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificateEntryDto)
  @IsOptional()
  entries?: CertificateEntryDto[];
}
