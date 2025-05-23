import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsString, IsOptional } from "class-validator";

export class BaseCvSectionDto {
  @ApiProperty({
    description: "Indicates if the section is enabled by the user.",
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isEnabled: boolean = true;

  @ApiPropertyOptional({
    description:
      "Custom title for the section provided by the user. If not provided, a default title might be used.",
    example: "My Professional Background",
  })
  @IsString()
  @IsOptional()
  customTitle?: string;
}
