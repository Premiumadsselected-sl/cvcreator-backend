import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service"; // Ajusta la ruta a tu PrismaService
import { CreateEmailLogDto } from "./dto/create-email-log.dto";
import { UpdateEmailLogDto } from "./dto/update-email-log.dto";
import { EmailLog, Prisma } from "@prisma/client";

@Injectable()
export class EmailLogsService {
  private readonly logger = new Logger(EmailLogsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createEmailLogDto: CreateEmailLogDto): Promise<EmailLog> {
    try {
      return await this.prisma.emailLog.create({
        data: createEmailLogDto,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create email log for ${createEmailLogDto.recipient_email}`,
        error.stack
      );
      throw error;
    }
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    skip?: number;
    take?: number;
    cursor?: Prisma.EmailLogWhereUniqueInput;
    where?: Prisma.EmailLogWhereInput;
    orderBy?: Prisma.EmailLogOrderByWithRelationInput;
  }): Promise<{
    data: EmailLog[];
    count: number;
    totalPages: number;
    currentPage: number;
  }> {
    const {
      page = 1,
      limit = 10,
      skip: querySkip,
      take: queryTake,
      cursor,
      where,
      orderBy,
    } = params;
    const take = queryTake || limit;
    const skip = querySkip || (page - 1) * take;

    const [data, count] = await this.prisma.$transaction([
      this.prisma.emailLog.findMany({
        skip,
        take,
        cursor,
        where,
        orderBy,
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return {
      data,
      count,
      totalPages: Math.ceil(count / take),
      currentPage: page,
    };
  }

  async findOne(id: string): Promise<EmailLog | null> {
    const emailLog = await this.prisma.emailLog.findUnique({
      where: { id },
    });
    if (!emailLog) {
      throw new NotFoundException(`Email log with ID "${id}" not found`);
    }
    return emailLog;
  }

  async update(
    id: string,
    updateEmailLogDto: UpdateEmailLogDto
  ): Promise<EmailLog> {
    try {
      return await this.prisma.emailLog.update({
        where: { id },
        data: updateEmailLogDto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundException(`Email log with ID "${id}" not found`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<EmailLog> {
    try {
      return await this.prisma.emailLog.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundException(`Email log with ID "${id}" not found`);
      }
      throw error;
    }
  }

  async findAllByUserId(userId: string): Promise<EmailLog[]> {
    return this.prisma.emailLog.findMany({
      where: { user_id: userId },
      orderBy: { createdAt: "desc" },
    });
  }
}
