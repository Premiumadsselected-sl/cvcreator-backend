import { OmitType } from "@nestjs/swagger";
import { ImageDto } from "./image.dto";

export class CreateImageDto extends OmitType(ImageDto, [
  "id",
  "createdAt",
  "updatedAt",
] as const) {}
