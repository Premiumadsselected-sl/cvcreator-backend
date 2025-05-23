import { PartialType } from "@nestjs/swagger";
import { CreateEmailLogDto } from "./create-email-log.dto";

export class UpdateEmailLogDto extends PartialType(CreateEmailLogDto) {}
