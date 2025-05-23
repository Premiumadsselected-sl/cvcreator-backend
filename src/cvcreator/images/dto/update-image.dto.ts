import { PartialType, OmitType } from "@nestjs/swagger";
import { ImageDto } from "./image.dto";

export class UpdateImageDto extends PartialType(
  OmitType(ImageDto, ["id", "user_id", "createdAt", "updatedAt"] as const)
) {}
