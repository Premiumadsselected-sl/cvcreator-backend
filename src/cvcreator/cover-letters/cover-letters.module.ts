import { Module } from "@nestjs/common";
import { CoverLettersController } from "./cover-letters.controller";
import { CoverLettersService } from "./cover-letters.service";

@Module({
  controllers: [CoverLettersController],
  providers: [CoverLettersService],
  exports: [CoverLettersService],
})
export class CoverLettersModule {}
