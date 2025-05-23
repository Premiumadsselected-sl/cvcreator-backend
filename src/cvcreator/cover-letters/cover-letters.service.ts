import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service"; // Ajusta la ruta según tu estructura
import { CreateCoverLetterDto } from "./dto/create-cover-letter.dto"; // Asumiremos que crearás este DTO
import { UpdateCoverLetterDto } from "./dto/update-cover-letter.dto"; // Asumiremos que crearás este DTO
import { Prisma, CoverLetter } from "@prisma/client";
import slugify from "slugify";

@Injectable()
export class CoverLettersService {
  constructor(private prisma: PrismaService) {}

  async create(
    createCoverLetterDto: CreateCoverLetterDto,
    userId: string
  ): Promise<CoverLetter> {
    const { title, content, template_id, is_public, settings } =
      createCoverLetterDto;
    const slug = slugify(title, { lower: true, strict: true });

    const coverLetterData: Prisma.CoverLetterCreateInput = {
      user: { connect: { id: userId } },
      title,
      slug, // Considerar una estrategia de unicidad más robusta si es necesario
      content: content as unknown as Prisma.InputJsonValue,
      is_public: is_public ?? false,
      settings: settings as unknown as Prisma.InputJsonValue,
      version: 1, // Versión inicial
    };

    if (template_id) {
      coverLetterData.template = { connect: { id: template_id } };
    }

    return this.prisma.coverLetter.create({
      data: coverLetterData,
    });
  }

  async findAllByUserId(userId: string): Promise<CoverLetter[]> {
    return this.prisma.coverLetter.findMany({
      where: { user_id: userId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
    });
  }

  async findOneByUserId(
    id: string,
    userId: string
  ): Promise<CoverLetter | null> {
    const coverLetter = await this.prisma.coverLetter.findFirst({
      where: { id, user_id: userId, deletedAt: null },
    });
    if (!coverLetter) {
      throw new NotFoundException(`Cover Letter with ID "${id}" not found`);
    }
    return coverLetter;
  }

  async findOneBySlug(
    slug: string,
    userId: string
  ): Promise<CoverLetter | null> {
    const coverLetter = await this.prisma.coverLetter.findFirst({
      where: { slug, user_id: userId, deletedAt: null },
    });
    if (!coverLetter) {
      throw new NotFoundException(`Cover Letter with slug "${slug}" not found`);
    }
    return coverLetter;
  }

  async updateByUserId(
    id: string,
    updateCoverLetterDto: UpdateCoverLetterDto,
    userId: string
  ): Promise<CoverLetter> {
    await this.findOneByUserId(id, userId); // Verifica la existencia y pertenencia

    const { title, content, template_id, is_public, settings } =
      updateCoverLetterDto;

    const dataToUpdate: Prisma.CoverLetterUpdateInput = {
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
    if (
      Object.prototype.hasOwnProperty.call(updateCoverLetterDto, "template_id")
    ) {
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

    return this.prisma.coverLetter.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async removeByUserId(id: string, userId: string): Promise<CoverLetter> {
    await this.findOneByUserId(id, userId); // Verifica la existencia y pertenencia
    return this.prisma.coverLetter.update({
      where: { id },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
  }
}
