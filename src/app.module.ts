import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { ConfigModule } from "@nestjs/config";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PaymentsModule } from "./payments/payments.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { ApiTokensModule } from "./api-tokens/api-tokens.module";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
import { CvCreatorModule } from "./cvcreator/cvcreator.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    PaymentsModule,
    SubscriptionsModule,
    ApiTokensModule,
    AuditLogsModule,
    CvCreatorModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
