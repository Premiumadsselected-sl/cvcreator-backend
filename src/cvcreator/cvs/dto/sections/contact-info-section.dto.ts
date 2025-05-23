import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEmail,
  IsPhoneNumber,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { BaseCvSectionDto } from "./base-section.dto";

export class LocationDto {
  @ApiPropertyOptional({ example: "123 Main St" })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: "Anytown" })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: "CA" })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: "90210" })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ example: "USA" })
  @IsString()
  @IsOptional()
  country?: string;
}

export class ContactInfoSectionDto extends BaseCvSectionDto {
  @ApiPropertyOptional({ example: "John Doe" })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: "Senior Software Developer" })
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiPropertyOptional({ example: "john.doe@example.com" })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: "+15551234567" })
  @IsPhoneNumber(undefined) // Pass region for specific validation, e.g., 'US'
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ type: () => LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  @IsOptional()
  location?: LocationDto;

  @ApiPropertyOptional({
    description: "Link to LinkedIn profile.",
    example: "https://linkedin.com/in/johndoe",
  })
  @IsString() // Consider @IsUrl() for stricter validation
  @IsOptional()
  linkedin?: string;

  @ApiPropertyOptional({
    description: "Link to GitHub profile.",
    example: "https://github.com/johndoe",
  })
  @IsString() // Consider @IsUrl()
  @IsOptional()
  github?: string;

  @ApiPropertyOptional({
    description: "Link to personal website or portfolio.",
    example: "https://johndoe.dev",
  })
  @IsString() // Consider @IsUrl()
  @IsOptional()
  portfolioWebsite?: string;
}
