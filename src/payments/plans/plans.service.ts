// filepath: /Users/arcademan/Documents/Projects/ADSDIGITAL/cvcreator-backend/src/plans/plans.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Plan } from "@prisma/client";

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string): Promise<Plan | null> {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });
    if (!plan) {
      throw new NotFoundException(`Plan with ID "${id}" not found`);
    }
    return plan;
  }

  async findAll(): Promise<Plan[]> {
    return this.prisma.plan.findMany({ where: { active: true } });
  }

  // Add other plan management methods if needed (create, update, delete)
}
