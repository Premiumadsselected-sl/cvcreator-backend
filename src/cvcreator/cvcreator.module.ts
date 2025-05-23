import { Module } from "@nestjs/common";
import { ImagesModule } from "./images/images.module";
import { PlansModule } from "../payments/plans/plans.module";
import { CvsModule } from "./cvs/cvs.module";
import { CoverLettersModule } from "./cover-letters/cover-letters.module";
import { TemplatesModule } from "./templates/templates.module";

@Module({
  imports: [
    ImagesModule,
    PlansModule,
    CvsModule,
    CoverLettersModule,
    TemplatesModule,
  ],
  exports: [
    ImagesModule,
    PlansModule,
    CvsModule,
    CoverLettersModule,
    TemplatesModule,
  ],
})
export class CvCreatorModule {}
