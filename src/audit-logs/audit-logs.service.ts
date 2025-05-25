import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service"; // CORRECTED PATH
import { CreateAuditLogDto } from "./dto/create-audit-log.dto";
import { UpdateAuditLogDto } from "./dto/update-audit-log.dto"; // Importar UpdateAuditLogDto
import { AuditLog, Prisma } from "@prisma/client";

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createAuditLogDto: CreateAuditLogDto): Promise<AuditLog> {
    const { details, ...restOfDto } = createAuditLogDto;
    const data: Prisma.AuditLogCreateInput = {
      ...restOfDto,
      details: details ? JSON.parse(details) : Prisma.JsonNull,
    };

    try {
      const auditLog = await this.prisma.auditLog.create({ data });
      return auditLog;
    } catch (error) {
      this.logger.error(
        `Failed to create audit log: ${error.message}`,
        error.stack
      );
      // Consider re-throwing a more specific error or handling it as per application needs
      throw error;
    }
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    cursor?: Prisma.AuditLogWhereUniqueInput;
    where?: Prisma.AuditLogWhereInput;
    orderBy?: Prisma.AuditLogOrderByWithRelationInput;
  }): Promise<AuditLog[]> {
    const { skip, take, cursor, where, orderBy } = params || {};
    return this.prisma.auditLog.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async findOne(id: string): Promise<AuditLog | null> {
    return this.prisma.auditLog.findUnique({ where: { id } });
  }

  async update(
    id: string,
    updateAuditLogDto: UpdateAuditLogDto
  ): Promise<AuditLog> {
    const { details, ...restOfDto } = updateAuditLogDto;
    const data: Prisma.AuditLogUpdateInput = {
      ...restOfDto,
    };
    if (details) {
      if (typeof details === "string") {
        try {
          data.details = JSON.parse(details);
        } catch (parseError) {
          // Cambiado 'e' a 'parseError' y se usa
          this.logger.warn(
            `Failed to parse details string in update for audit log ${id}: ${String(parseError)}. Storing as error object.`
          );
          data.details = {
            error: "Failed to parse details string",
            rawDetails: details,
          };
        }
      } else if (details === null) {
        data.details = Prisma.JsonNull;
      } else if (typeof details === "object") {
        data.details = details as Prisma.InputJsonObject;
      }
    }

    try {
      const updatedAuditLog = await this.prisma.auditLog.update({
        where: { id },
        data,
      });
      return updatedAuditLog;
    } catch (error: any) {
      this.logger.error(
        `Failed to update audit log with ID "${id}": ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  // Potentially add methods for querying logs based on user_id, action, target_type, etc.
}
