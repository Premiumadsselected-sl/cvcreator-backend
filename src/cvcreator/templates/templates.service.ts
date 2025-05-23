import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateTemplateDto,
  //TemplateDesignType,
} from "./dto/create-template.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";
import { Prisma, Template } from "@prisma/client";
// import slugify from "slugify";

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(createTemplateDto: CreateTemplateDto): Promise<Template> {
    const {
      name,
      type,
      description,
      preview_image_url,
      structure,
      category,
      is_premium,
    } = createTemplateDto;

    const templateData: Prisma.TemplateCreateInput = {
      name,
      type: type,
      description,
      preview_image_url,
      structure: structure as unknown as Prisma.InputJsonValue,
      category,
      is_premium: is_premium ?? false,
      usage_count: 0,
    };

    return this.prisma.template.create({
      data: templateData,
    });
  }

  async findAll(type?: string): Promise<Template[]> {
    return this.prisma.template.findMany({
      where: {
        type: type,
        deletedAt: null, // Asegurarse de no traer eliminados lógicamente
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async findAllPremium(type?: string): Promise<Template[]> {
    return this.prisma.template.findMany({
      where: {
        is_premium: true,
        type: type,
        deletedAt: null, // Asegurarse de no traer eliminados lógicamente
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async findOne(id: string): Promise<Template | null> {
    const template = await this.prisma.template.findFirst({
      where: { id, deletedAt: null }, // Asegurarse de no traer eliminados lógicamente
    });
    if (!template) {
      throw new NotFoundException(`Template with ID "${id}" not found.`);
    }
    return template;
  }

  async update(
    id: string,
    updateTemplateDto: UpdateTemplateDto
  ): Promise<Template> {
    // const existingTemplate = await this.findOne(id);

    const {
      name,
      type,
      description,
      preview_image_url,
      structure,
      category,
      is_premium,
    } = updateTemplateDto;

    const dataToUpdate: Prisma.TemplateUpdateInput = {
      updatedAt: new Date(),
    };

    if (name) {
      dataToUpdate.name = name;
    }
    if (type) {
      dataToUpdate.type = type;
    }
    if (description !== undefined) {
      dataToUpdate.description = description;
    }
    if (preview_image_url !== undefined) {
      dataToUpdate.preview_image_url = preview_image_url;
    }
    if (structure) {
      dataToUpdate.structure = structure as unknown as Prisma.InputJsonValue;
    }
    if (category !== undefined) {
      dataToUpdate.category = category;
    }
    if (is_premium !== undefined) {
      dataToUpdate.is_premium = is_premium;
    }

    return this.prisma.template.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async incrementUsage(id: string): Promise<Template> {
    return this.prisma.template.update({
      where: { id },
      data: { usage_count: { increment: 1 } },
    });
  }

  async remove(id: string): Promise<Template> {
    await this.findOne(id);
    // Soft delete en lugar de borrado físico
    return this.prisma.template.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
