import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "./../../src/app.module"; // Ajusta la ruta a tu AppModule
import { faker } from "@faker-js/faker"; // Importar faker
import { PrismaService } from "./../../src/prisma/prisma.service"; // Importar PrismaService
import { AuditAction } from "./../../src/audit-logs/dto/audit-action.enum"; // Importar AuditAction
import { User, Prisma } from "@prisma/client"; // Importar Prisma para JsonValue

describe("AuthController (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService; // Añadir PrismaService
  let testUser: User | null; // Puede ser null si el registro falla
  let userPassword;
  // let userAuthToken; // Comentado o eliminado si no se usa globalmente en este describe

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService); // Inicializar PrismaService
    await app.init();
  });

  beforeEach(async () => {
    const userEmailsToClean = [
      testUser?.email,
      `test.register.success.${faker.string.uuid()}@example.test`,
      `test.register.fail.${faker.string.uuid()}@example.test`,
      `test.login.success.${faker.string.uuid()}@example.test`,
      `test.login.fail.${faker.string.uuid()}@example.test`,
      `nonexistent.${faker.string.uuid()}@example.test`,
      `test.profile.${faker.string.uuid()}@example.test`,
    ].filter(Boolean) as string[];

    if (userEmailsToClean.length > 0) {
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { user_id: testUser?.id },
            { details: { path: ["email"], equals: userEmailsToClean[0] } }, // Ejemplo, ajustar según necesidad
            {
              details: {
                path: ["attemptedEmail"],
                equals: userEmailsToClean[0],
              },
            }, // Ejemplo
          ],
        },
      });
      await prisma.user.deleteMany({
        where: { email: { in: userEmailsToClean } },
      });
    }
    testUser = null;
    // userAuthToken = null;
  });

  afterAll(async () => {
    // Similar cleanup as beforeEach, or more broad if necessary
    await prisma.auditLog.deleteMany({ where: { user_id: testUser?.id } }); // Simplificado, ajustar si es necesario
    await prisma.user.deleteMany({
      where: { email: { contains: "@example.test" } },
    });
    await app.close();
  });

  it("/auth/register (POST) - should register a new user and create USER_REGISTERED audit log", async () => {
    userPassword = faker.internet.password();
    const uniqueEmail = `test.register.success.${faker.string.uuid()}@example.test`;
    const userData = {
      email: uniqueEmail,
      password: userPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send(userData)
      .expect(201);

    expect(response.body).toBeDefined();
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toEqual(userData.email);
    expect(response.body.accessToken).toBeDefined();
    testUser = response.body.user as User;
    // userAuthToken = response.body.accessToken; // Asignar si se va a usar

    // Verificar AuditLog para USER_REGISTERED
    const auditLogRegistered = await prisma.auditLog.findFirst({
      where: {
        user_id: testUser.id,
        action: AuditAction.USER_REGISTERED as string,
        target_id: testUser.id,
        target_type: "User",
      },
    });
    expect(auditLogRegistered).toBeDefined();
    const calculatedUsernameRegistered = `${userData.firstName.toLowerCase().replace(/\\s+/g, "")}${userData.lastName.toLowerCase().replace(/\\s+/g, "")}`;
    expect(auditLogRegistered?.details).toEqual({
      email: userData.email,
      username: calculatedUsernameRegistered,
    });
  });

  it("/auth/register (POST) - should fail to register with existing email and create USER_REGISTERED_FAILED audit log", async () => {
    // Primero, registrar un usuario
    const initialPassword = faker.internet.password();
    const existingEmail = `test.register.fail.${faker.string.uuid()}@example.test`;
    const initialFirstName = faker.person.firstName();
    const initialLastName = faker.person.lastName();

    const initialUserData = {
      email: existingEmail,
      password: initialPassword,
      firstName: initialFirstName,
      lastName: initialLastName,
    };
    await request(app.getHttpServer())
      .post("/auth/register")
      .send(initialUserData)
      .expect(201);

    // Intentar registrar de nuevo con el mismo email
    const duplicateUserData = {
      email: existingEmail,
      password: faker.internet.password(),
      firstName: "OtroNombre",
      lastName: "OtroApellido",
    };
    await request(app.getHttpServer())
      .post("/auth/register")
      .send(duplicateUserData)
      .expect(409); // Conflict

    // Verificar AuditLog para USER_REGISTERED_FAILED
    const auditLogFailed = await prisma.auditLog.findFirst({
      where: {
        action: AuditAction.USER_REGISTERED_FAILED as string,
        target_type: "User",
        details: { path: ["attemptedEmail"], equals: existingEmail },
      },
      orderBy: { createdAt: "desc" },
    });
    expect(auditLogFailed).toBeDefined();
    const calculatedUsernameFailed = `${duplicateUserData.firstName.toLowerCase().replace(/\\s+/g, "")}${duplicateUserData.lastName.toLowerCase().replace(/\\s+/g, "")}`;
    expect(auditLogFailed?.details).toEqual({
      attemptedEmail: existingEmail,
      username: calculatedUsernameFailed,
      error: "Ya existe un usuario con este email",
    });
  });

  it("/auth/login (POST) - should login an existing user, return a JWT, and create USER_LOGIN audit log", async () => {
    // Primero registrar un usuario para poder hacer login
    userPassword = faker.internet.password();
    const loginUserEmail = `test.login.success.${faker.string.uuid()}@example.test`;
    const userData = {
      email: loginUserEmail,
      password: userPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };
    const registerResponse = await request(app.getHttpServer())
      .post("/auth/register")
      .send(userData)
      .expect(201);
    testUser = registerResponse.body.user as User;

    // Limpiar el log de USER_REGISTERED para no interferir con la búsqueda del log de LOGIN
    await prisma.auditLog.deleteMany({
      where: {
        user_id: testUser.id,
        action: AuditAction.USER_REGISTERED as string,
      },
    });

    const loginResponse = await request(app.getHttpServer())
      .post("/auth/login")
      .send({
        email: testUser.email,
        password: userPassword,
      })
      .expect(200);

    expect(loginResponse.body).toBeDefined();
    expect(loginResponse.body.accessToken).toBeDefined();
    // userAuthToken = loginResponse.body.accessToken; // Asignar si se va a usar

    // Verificar AuditLog para USER_LOGIN
    const auditLogLogin = await prisma.auditLog.findFirst({
      where: {
        user_id: testUser.id,
        action: AuditAction.USER_LOGIN as string,
        target_id: testUser.id,
        target_type: "User",
      },
    });
    expect(auditLogLogin).toBeDefined();
    expect(auditLogLogin?.details).toEqual({ email: testUser.email });
  });

  it("/auth/login (POST) - should fail to login with incorrect password and create USER_LOGIN_FAILED audit log", async () => {
    // Primero registrar un usuario
    userPassword = faker.internet.password();
    const loginFailEmail = `test.login.fail.${faker.string.uuid()}@example.test`;
    const userData = {
      email: loginFailEmail,
      password: userPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };
    const registerResponse = await request(app.getHttpServer())
      .post("/auth/register")
      .send(userData)
      .expect(201);
    const registeredUser = registerResponse.body.user as User;

    // Limpiar el log de USER_REGISTERED para no interferir
    await prisma.auditLog.deleteMany({
      where: {
        user_id: registeredUser.id,
        action: AuditAction.USER_REGISTERED as string,
      },
    });

    await request(app.getHttpServer())
      .post("/auth/login")
      .send({
        email: registeredUser.email,
        password: "wrongpassword",
      })
      .expect(401); // Unauthorized

    // Verificar AuditLog para USER_LOGIN_FAILED
    const auditLogLoginFailedPwd = await prisma.auditLog.findFirst({
      where: {
        user_id: registeredUser.id,
        action: AuditAction.USER_LOGIN_FAILED as string,
        target_type: "User", // Asumiendo que target_type es User para intentos de login
        details: { path: ["attemptedEmail"], equals: registeredUser.email },
      },
      orderBy: { createdAt: "desc" },
    });
    expect(auditLogLoginFailedPwd).toBeDefined();
    expect(auditLogLoginFailedPwd?.target_id).toEqual(registeredUser.id);
    expect(auditLogLoginFailedPwd?.details).toEqual({
      attemptedEmail: registeredUser.email,
      error: "Credenciales inválidas - contraseña incorrecta",
    });
  });

  it("/auth/login (POST) - should fail to login with non-existent email and create USER_LOGIN_FAILED audit log", async () => {
    const nonExistentEmail = `nonexistent.${faker.string.uuid()}@example.test`;
    await request(app.getHttpServer())
      .post("/auth/login")
      .send({
        email: nonExistentEmail,
        password: "anypassword",
      })
      .expect(401); // Unauthorized

    // Verificar AuditLog para USER_LOGIN_FAILED
    const auditLogLoginFailedEmail = await prisma.auditLog.findFirst({
      where: {
        action: AuditAction.USER_LOGIN_FAILED as string,
        target_type: "User",
        details: { path: ["attemptedEmail"], equals: nonExistentEmail },
      },
      orderBy: { createdAt: "desc" },
    });
    expect(auditLogLoginFailedEmail).toBeDefined();
    expect(auditLogLoginFailedEmail?.target_id).toBeNull(); // Cambiado de toBeUndefined() a toBeNull()
    expect(auditLogLoginFailedEmail?.details).toEqual({
      attemptedEmail: nonExistentEmail,
      error: "Credenciales inválidas - usuario no encontrado",
    });
  });

  // Mantener las pruebas de /auth/me si son necesarias, pero asegurarse de que
  // la creación de testUser y userAuthToken se maneje correctamente,
  // ya que beforeEach ahora los resetea.
  // Estas pruebas dependerán de que una prueba de login/registro exitosa se ejecute antes
  // y establezca testUser y userAuthToken, o necesitarán su propio setup.

  describe("/auth/me (GET) profile tests", () => {
    let profileTestUser: User;
    let profileTestUserAuthToken: string;

    beforeAll(async () => {
      // Crear un usuario específico para estas pruebas de perfil
      const profileUserPassword = faker.internet.password();
      const uniqueEmail = `test.profile.${faker.string.uuid()}@example.test`;
      const userData = {
        email: uniqueEmail,
        password: profileUserPassword,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
      };

      const registerResponse = await request(app.getHttpServer())
        .post("/auth/register")
        .send(userData)
        .expect(201);
      profileTestUser = registerResponse.body.user as User;
      profileTestUserAuthToken = registerResponse.body.accessToken;
      // Limpiar el log de USER_REGISTERED para estas pruebas de perfil
      await prisma.auditLog.deleteMany({
        where: {
          user_id: profileTestUser.id,
          action: AuditAction.USER_REGISTERED as string,
        },
      });
    });

    afterAll(async () => {
      if (profileTestUser) {
        await prisma.auditLog.deleteMany({
          where: { user_id: profileTestUser.id },
        });
        await prisma.user.deleteMany({ where: { id: profileTestUser.id } });
      }
    });

    it("should return user profile with a valid JWT", async () => {
      expect(profileTestUserAuthToken).toBeDefined();
      expect(profileTestUser).toBeDefined();

      return request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", `Bearer ${profileTestUserAuthToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body).toBeDefined();
          expect(res.body.id).toEqual(profileTestUser.id);
          expect(res.body.email).toEqual(profileTestUser.email);
          expect(res.body.user_data).toBeDefined();

          const expectedFirstName = (
            profileTestUser.user_data as Prisma.JsonObject
          )?.firstName;
          const expectedLastName = (
            profileTestUser.user_data as Prisma.JsonObject
          )?.lastName;

          if (
            profileTestUser.user_data &&
            typeof expectedFirstName === "string" &&
            typeof expectedLastName === "string"
          ) {
            expect((res.body.user_data as Prisma.JsonObject).firstName).toEqual(
              expectedFirstName
            );
            expect((res.body.user_data as Prisma.JsonObject).lastName).toEqual(
              expectedLastName
            );
          }
          expect(res.body.password).toBeUndefined();
          expect(res.body.status).toBeDefined();
        });
    });

    it("should return 401 for missing/invalid JWT", async () => {
      await request(app.getHttpServer()).get("/auth/me").expect(401);
      await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", "Bearer invalidtoken123")
        .expect(401);
    });
  });
});
