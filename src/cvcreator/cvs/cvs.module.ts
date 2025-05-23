import { Module } from "@nestjs/common";
import { CvsController } from "./cvs.controller";
import { CvsService } from "./cvs.service";

@Module({
  controllers: [CvsController],
  providers: [CvsService],
  exports: [CvsService],
})
export class CvsModule {}
