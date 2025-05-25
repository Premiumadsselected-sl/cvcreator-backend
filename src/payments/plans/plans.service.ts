import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Plan, Prisma } from "@prisma/client";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPlanDto: CreatePlanDto): Promise<Plan> {
    return this.prisma.plan.create({
      data: createPlanDto,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.PlanWhereUniqueInput;
    where?: Prisma.PlanWhereInput;
    orderBy?: Prisma.PlanOrderByWithRelationInput;
  }): Promise<Plan[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.plan.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async findOne(id: string): Promise<Plan | null> {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });
    if (!plan) {
      throw new NotFoundException(`Plan with ID "${id}" not found`);
    }
    return plan;
  }

  async findOneByName(name: string): Promise<Plan | null> {
    const plan = await this.prisma.plan.findUnique({
      where: { name },
    });
    // No lanzar NotFoundException aquí, ya que se usa en la validación de flujo de pago
    // y se prefiere un manejo específico en ese contexto.
    return plan;
  }

  async update(id: string, updatePlanDto: UpdatePlanDto): Promise<Plan> {
    try {
      return await this.prisma.plan.update({
        where: { id },
        data: updatePlanDto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundException(`Plan with ID "${id}" not found`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<Plan> {
    // Considerar soft delete si es un requisito (ej. actualizando un campo `deletedAt` o `active`)
    // Por ahora, se implementa un borrado físico.
    // Actualización: Cambiado a soft delete actualizando `active` a `false` según el prompt.
    try {
      return await this.prisma.plan.update({
        where: { id },
        data: { active: false }, // Soft delete
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundException(`Plan with ID "${id}" not found`);
      }
      throw error;
    }
  }

  // Método para obtener solo planes activos, útil para los usuarios
  async findAllActive(): Promise<Plan[]> {
    return this.prisma.plan.findMany({
      where: { active: true },
      orderBy: { price: "asc" }, // Opcional: ordenar por precio o nombre
    });
  }
}
