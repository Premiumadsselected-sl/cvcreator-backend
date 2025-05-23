import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  ValidateNested,
  IsUUID,
} from "class-validator";
import { BaseCvSectionDto } from "./base-section.dto";
import { v4 as uuidv4 } from "uuid";

export class ReferenceEntryDto {
  @ApiProperty({
    description: "Unique identifier for the reference entry.",
    example: uuidv4(),
  })
  @IsUUID()
  id: string = uuidv4();

  @ApiProperty({
    description: "Full name of the reference.",
    example: "Jane Smith",
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: "Job title or position of the reference.",
    example: "Senior Manager",
  })
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiPropertyOptional({
    description: "Company or organization of the reference.",
    example: "Acme Corp",
  })
  @IsString()
  @IsOptional()
  company?: string;

  @ApiPropertyOptional({
    description: "Email address of the reference.",
    example: "jane.smith@example.com",
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: "Phone number of the reference.",
    example: "+15559876543",
  })
  @IsPhoneNumber(undefined) // Or specify region e.g., 'US'
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description:
      "Relationship to the referee (e.g., Former Manager, Professor).",
  })
  @IsString()
  @IsOptional()
  relationship?: string;
}

export class ReferencesSectionDto extends BaseCvSectionDto {
  @ApiPropertyOptional({
    description:
      "List of references. Often it's better to state 'References available upon request'.",
    type: [ReferenceEntryDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReferenceEntryDto)
  @IsOptional()
  entries?: ReferenceEntryDto[];

  @ApiPropertyOptional({
    description:
      "A note regarding references, e.g., 'References available upon request'.",
    example: "References available upon request.",
  })
  @IsString()
  @IsOptional()
  note?: string;
}
