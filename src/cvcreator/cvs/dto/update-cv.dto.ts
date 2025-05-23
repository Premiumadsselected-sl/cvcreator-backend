import { PartialType, ApiPropertyOptional } from "@nestjs/swagger";
import { CreateCvDto } from "./create-cv.dto";
import { IsString, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CvContentDto } from "./cv-content.dto";

export class UpdateCvDto extends PartialType(CreateCvDto) {
  @ApiPropertyOptional({
    description: "Nuevo contenido principal para el CV",
    type: () => CvContentDto,
  })
  @ValidateNested()
  @Type(() => CvContentDto)
  @IsOptional()
  content?: CvContentDto;

  @ApiPropertyOptional({
    description:
      "Nuevo ID de la plantilla a utilizar. Enviar null para desvincular la plantilla actual.",
    example: "template-abc-456",
    nullable: true,
  })
  @IsString()
  @IsOptional()
  template_id?: string | null;
}
