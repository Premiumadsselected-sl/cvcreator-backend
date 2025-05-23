import { Test, TestingModule } from "@nestjs/testing";
import { AuthModule } from "../../../src/auth/auth.module";
import { AuthService } from "../../../src/auth/auth.service";
import { UsersModule } from "../../../src/users/users.module";
import { JwtModule, JwtService } from "@nestjs/jwt"; // MODIFICADO: JwtService importado
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";

describe("AuthModule", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        AuthModule,
        // Nota: AuthModule importa UsersModule, PassportModule, JwtModule, y ConfigModule.
        // Para una prueba de integración más aislada del módulo AuthModule en sí,
        // podríamos mockear las dependencias que vienen de otros módulos si fuera necesario,
        // pero para este caso, permitir que Nest las resuelva está bien para empezar.
        // Si UsersService, JwtService, etc., tuvieran dependencias complejas que quisiéramos evitar
        // en esta prueba de módulo, podríamos usar .overrideProvider().useValue(...) para ellos.
      ],
    })
      // Si necesitamos mockear ConfigService específicamente para el JwtModule.registerAsync
      // lo haríamos aquí. Ejemplo:
      // .overrideProvider(ConfigService)
      // .useValue({
      //   get: jest.fn((key: string) => {
      //     if (key === 'JWT_SECRET') return 'test_secret';
      //     if (key === 'JWT_EXPIRES_IN') return '3600s';
      //     return null;
      //   }),
      // })
      .compile();
  });

  it("should be defined", () => {
    expect(module).toBeDefined();
  });

  it("should provide AuthService", () => {
    const authService = module.get<AuthService>(AuthService);
    expect(authService).toBeDefined();
    expect(authService).toBeInstanceOf(AuthService);
  });

  it("should provide JwtService (exported by JwtModule)", () => {
    const jwtService = module.get<JwtService>(JwtService);
    expect(jwtService).toBeDefined();
  });

  // Podríamos añadir más pruebas para verificar que otros providers/exports importantes
  // estén disponibles si fuera necesario.
});
