import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UsersModule } from "../users/users.module";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtStrategy } from "./jwt.strategy";
import { AuditLogsModule } from "../audit-logs/audit-logs.module"; // Importar AuditLogsModule
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: "jwt" }), // Configura Passport con la estrategia JWT por defecto.
    JwtModule.registerAsync({
      imports: [ConfigModule], // Importa ConfigModule para acceder a ConfigService.
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"), // Obtiene el secreto JWT de la configuración.
        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRES_IN", "3600s"), // Define la expiración del token.
        },
      }),
      inject: [ConfigService], // Inyecta ConfigService en useFactory.
    }),
    ConfigModule, // Necesario si ConfigModule no es global y se usa en registerAsync.
    AuditLogsModule, // Añadir AuditLogsModule a los imports
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard], // Proveedores del módulo de autenticación.
  controllers: [AuthController],
  exports: [AuthService, JwtModule, PassportModule, JwtAuthGuard, RolesGuard], // Exporta servicios y módulos para ser usados externamente.
})
export class AuthModule {}
