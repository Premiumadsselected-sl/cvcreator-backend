import { Module } from "@nestjs/common";
import { AuditLogsService } from "./audit-logs.service";
import { AuditLogsController } from "./audit-logs.controller";
import { PrismaModule } from "../prisma/prisma.module"; // Import PrismaModule if AuditLogsService depends on PrismaService

@Module({
  imports: [PrismaModule], // Add PrismaModule here if needed by AuditLogsService
  controllers: [AuditLogsController],
  providers: [AuditLogsService],
  exports: [AuditLogsService], // Export AuditLogsService so other modules can use it
})
export class AuditLogsModule {}
