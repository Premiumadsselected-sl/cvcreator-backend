import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCvDto } from "./dto/create-cv.dto";
import { UpdateCvDto } from "./dto/update-cv.dto";
import { Prisma, Cv } from "@prisma/client";
import slugify from "slugify";

@Injectable()
export class CvsService {
  constructor(private prisma: PrismaService) {}

  async create(createCvDto: CreateCvDto, userId: string): Promise<Cv> {
    const { title, content, template_id, is_public, settings } = createCvDto;
    const slug = slugify(title, { lower: true, strict: true });

    const cvData: Prisma.CvCreateInput = {
      user: { connect: { id: userId } },
      title,
      slug,
      content: content as unknown as Prisma.InputJsonValue,
      is_public,
      settings: settings as unknown as Prisma.InputJsonValue,
      version: 1,
    };

    if (template_id) {
      cvData.template = { connect: { id: template_id } };
    }

    return this.prisma.cv.create({
      data: cvData,
    });
  }

  async findAll(userId: string): Promise<Cv[]> {
    return this.prisma.cv.findMany({
      where: { user_id: userId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
    });
  }

  async findOne(id: string, userId: string): Promise<Cv | null> {
    const cv = await this.prisma.cv.findFirst({
      where: { id, user_id: userId, deletedAt: null },
    });
    if (!cv) {
      throw new NotFoundException(
        `CV con ID "${id}" no encontrado para este usuario.`
      );
    }
    return cv;
  }

  async findOneBySlug(slug: string, userId: string): Promise<Cv | null> {
    const cv = await this.prisma.cv.findFirst({
      where: { slug, user_id: userId, deletedAt: null },
    });
    if (!cv) {
      throw new NotFoundException(
        `CV con slug "${slug}" no encontrado para este usuario.`
      );
    }
    return cv;
  }

  async update(
    id: string,
    updateCvDto: UpdateCvDto,
    userId: string
  ): Promise<Cv> {
    await this.findOne(id, userId);

    const { title, content, template_id, is_public, settings } = updateCvDto;

    const dataToUpdate: Prisma.CvUpdateInput = {
      updatedAt: new Date(),
      version: { increment: 1 },
    };

    if (title) {
      dataToUpdate.title = title;
      dataToUpdate.slug = slugify(title, { lower: true, strict: true });
    }
    if (content) {
      dataToUpdate.content = content as unknown as Prisma.InputJsonValue;
    }

    if (Object.prototype.hasOwnProperty.call(updateCvDto, "template_id")) {
      if (template_id === null) {
        dataToUpdate.template = { disconnect: true };
      } else if (template_id) {
        dataToUpdate.template = { connect: { id: template_id } };
      }
    }

    if (is_public !== undefined) {
      dataToUpdate.is_public = is_public;
    }
    if (settings) {
      dataToUpdate.settings = settings as unknown as Prisma.InputJsonValue;
    }

    return this.prisma.cv.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async remove(id: string, userId: string): Promise<Cv> {
    await this.findOne(id, userId);
    return this.prisma.cv.update({
      where: { id },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
  }
}
