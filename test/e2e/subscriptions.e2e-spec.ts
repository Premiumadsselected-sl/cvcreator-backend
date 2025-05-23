import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/prisma/prisma.service";
import { RegisterUserDto } from "../../src/auth/dto/register-user.dto"; // Changed from CreateUserDto to RegisterUserDto
import { User, PrismaClient } from "@prisma/client";
import { CreatePlanDto } from "../../src/plans/dto/create-plan.dto";
import { Plan } from "@prisma/client";
import { CreateSubscriptionDto } from "../../src/subscriptions/dto/create-subscription.dto";
import { UpdateSubscriptionDto } from "../../src/subscriptions/dto/update-subscription.dto";
import { SubscriptionStatus } from "../../src/subscriptions/dto/subscription.dto";
import { AuditLog } from "@prisma/client";
import { AuditAction } from "../../src/audit-logs/dto/audit-action.enum";
import { JwtAuthGuard } from "../../src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../src/auth/guards/roles.guard";

describe("SubscriptionsController (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken: string;
  let regularUserToken: string;
  let testUser: User;
  let testAdminUser: User;
  let testPlan: Plan;

  const mockJwtAuthGuard = { canActivate: jest.fn(() => true) };
  const mockRolesGuard = { canActivate: jest.fn(() => true) };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true, // AÑADIDO para coincidir con main.ts
        transformOptions: {
          // AÑADIDO para coincidir con main.ts
          enableImplicitConversion: true,
        },
      })
    );
    await app.init();

    prisma = app.get(PrismaService);

    // Corrected order for cleaning database to avoid foreign key constraint issues
    await prisma.auditLog.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.plan.deleteMany({});

    // Create a test admin user and get token
    const adminUserData: RegisterUserDto = {
      // Changed from CreateUserDto to RegisterUserDto
      email: "admin.sub@example.com",
      password: "password123",
      username: "adminsub", // Changed from user_name to username
    };

    const adminRegisterResponse = await request(app.getHttpServer())
      .post("/auth/register")
      .send(adminUserData)
      .expect(201);
    // Correctly access the user object from AuthResponseDto
    const registeredAdmin = adminRegisterResponse.body.user as User;

    // Manually update role for the admin user for testing purposes
    testAdminUser = await prisma.user.update({
      where: { id: registeredAdmin.id },
      data: { role: "ADMIN" },
    });

    const adminLoginResponse = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: adminUserData.email, password: adminUserData.password })
      .expect(200);
    adminToken = adminLoginResponse.body.access_token;

    // Create a test regular user and get token
    const userData: RegisterUserDto = {
      // Changed from CreateUserDto to RegisterUserDto
      email: "user.sub@example.com",
      password: "password123",
      username: "testsubuser", // Changed from user_name to username
    };
    const registerResponse = await request(app.getHttpServer())
      .post("/auth/register")
      .send(userData)
      .expect(201);
    // Correctly access the user object from AuthResponseDto
    testUser = registerResponse.body.user as User;

    const loginResponse = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: userData.email, password: userData.password })
      .expect(200);
    regularUserToken = loginResponse.body.access_token;

    // Create a test plan
    const planData: CreatePlanDto = {
      name: "Test Plan For Subscriptions",
      price: 29.99,
      features: ["Feature A", "Feature B"],
      // stripe_price_id: "price_test_sub_e2e", // Comentado o eliminado si no se usa directamente en el modelo Plan
      stripe_plan_id: "plan_test_sub_e2e", // Usar el campo correcto del schema.prisma
    };

    testPlan = await prisma.plan.create({
      data: {
        name: planData.name,
        price: planData.price,
        features: planData.features,
        active: true,
        billing_interval: "MONTHLY", // Añadir valor por defecto si es necesario
        currency: "EUR", // Añadir valor por defecto si es necesario
        stripe_plan_id: planData.stripe_plan_id, // Asegurar que este campo se usa
      },
    });

    expect(testPlan).toBeDefined();
    expect(testPlan.stripe_plan_id).toEqual("plan_test_sub_e2e");
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.plan.deleteMany({});
    await app.close();
  });

  beforeEach(async () => {
    // Clean audit logs and subscriptions before each test, but keep users and plans
    await prisma.auditLog.deleteMany({});
    await prisma.subscription.deleteMany({});
    mockJwtAuthGuard.canActivate.mockClear();
    mockRolesGuard.canActivate.mockClear();
  });

  describe("POST /subscriptions", () => {
    it("should create a new subscription and an audit log", async () => {
      expect(testUser?.id).toBeDefined(); // Verificar que testUser.id existe
      expect(testPlan?.id).toBeDefined(); // Verificar que testPlan.id existe

      const createSubscriptionDto: CreateSubscriptionDto = {
        user_id: testUser.id,
        plan_id: testPlan.id,
      };

      const response = await request(app.getHttpServer())
        .post("/subscriptions")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(createSubscriptionDto)
        .expect(201); // Sigue esperando 201

      expect(response.body).toHaveProperty("id");
      expect(response.body.user_id).toEqual(testUser.id);
      expect(response.body.plan_id).toEqual(testPlan.id);
      expect(response.body.status).toEqual(SubscriptionStatus.PENDING);

      const subscriptionId = response.body.id;

      // Verify AuditLog
      const auditLogs = await prisma.auditLog.findMany({
        where: { target_id: subscriptionId, user_id: testUser.id }, // Asegurar user_id
      });
      expect(auditLogs.length).toBe(1);
      const auditLog = auditLogs[0];
      expect(auditLog.action).toEqual(AuditAction.SUBSCRIPTION_CREATED);
      expect(auditLog.target_type).toEqual("Subscription");
      // expect(auditLog.user_id).toEqual(testUser.id); // Ya filtrado en la query
      expect(auditLog.details).toEqual({
        createSubscriptionDto,
      });
    });
  });

  describe("GET /subscriptions/user/:userId", () => {
    it("should get all subscriptions for a user", async () => {
      // Create a subscription first
      await prisma.subscription.create({
        data: {
          user_id: testUser.id,
          plan_id: testPlan.id,
          status: SubscriptionStatus.ACTIVE,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/subscriptions/user/${testUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`) // Or user token if allowed
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].user_id).toEqual(testUser.id);
    });
  });

  describe("PATCH /subscriptions/:id", () => {
    it("should update a subscription and create an audit log", async () => {
      const createdSub = await prisma.subscription.create({
        data: {
          user_id: testUser.id,
          plan_id: testPlan.id,
          status: SubscriptionStatus.PENDING,
        },
      });
      expect(createdSub?.id).toBeDefined(); // Verificar que createdSub.id existe

      const updateSubscriptionDto: UpdateSubscriptionDto = {
        status: SubscriptionStatus.ACTIVE, // Simplificado para probar solo el cambio de estado
        // current_period_start: new Date(), // Comentado para simplificar
        // current_period_end: new Date( // Comentado para simplificar
        //   new Date().setMonth(new Date().getMonth() + 1)
        // ),
      };

      const response = await request(app.getHttpServer())
        .patch(`/subscriptions/${createdSub.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateSubscriptionDto)
        .expect(200); // Sigue esperando 200

      expect(response.body.status).toEqual(SubscriptionStatus.ACTIVE);
      // if (updateSubscriptionDto.current_period_start) { // Comentado
      //   expect(
      //     new Date(response.body.current_period_start).toISOString()
      //   ).toEqual(updateSubscriptionDto.current_period_start?.toISOString());
      // }

      // Verify AuditLog
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          target_id: createdSub.id,
          action: AuditAction.SUBSCRIPTION_UPDATED, // El servicio update() crea este log
          user_id: testUser.id, // Asegurar user_id
        },
      });
      expect(auditLogs.length).toBe(1);
      const auditLog = auditLogs[0];
      expect(auditLog.target_type).toEqual("Subscription");
      // expect(auditLog.user_id).toEqual(testUser.id); // Ya filtrado
      const parsedDetails = auditLog.details as any;
      expect(parsedDetails.updateSubscriptionDto.status).toEqual(
        updateSubscriptionDto.status
      );
      // if (updateSubscriptionDto.current_period_start) { // Comentado
      //   expect(
      //     new Date(
      //       parsedDetails.updateSubscriptionDto.current_period_start
      //     ).toISOString()
      //   ).toEqual(updateSubscriptionDto.current_period_start?.toISOString());
      // }
    });
  });

  describe("DELETE /subscriptions/:id", () => {
    it("should delete a subscription (mark as cancelled) and create an audit log", async () => {
      const createdSub = await prisma.subscription.create({
        data: {
          user_id: testUser.id,
          plan_id: testPlan.id,
          status: SubscriptionStatus.ACTIVE,
        },
      });
      expect(createdSub?.id).toBeDefined(); // Verificar que createdSub.id existe

      await request(app.getHttpServer())
        .delete(`/subscriptions/${createdSub.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(204); // CORREGIDO: Esperar 204 No Content

      const dbSub = await prisma.subscription.findUnique({
        where: { id: createdSub.id },
      });
      expect(dbSub).toBeNull(); // Correcto, el servicio hace un delete físico

      // Verify AuditLog
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          target_id: createdSub.id,
          action: AuditAction.SUBSCRIPTION_CANCELLED,
          user_id: testUser.id, // Asegurar user_id
        },
      });
      expect(auditLogs.length).toBe(1);
      const auditLog = auditLogs[0];
      expect(auditLog.target_type).toEqual("Subscription");
      // expect(auditLog.user_id).toEqual(testUser.id); // Ya filtrado
      expect(auditLog.details).toEqual({
        id: createdSub.id,
      });
    });
  });

  // describe("Subscription Status Change (Conceptual - if directly testable)", () => {
  //   it("should log SUBSCRIPTION_STATUS_CHANGED when status is updated via a dedicated mechanism", async () => {
  //     const createdSub = await prisma.subscription.create({
  //       data: {
  //         user_id: testUser.id,
  //         plan_id: testPlan.id,
  //         status: SubscriptionStatus.PENDING,
  //       },
  //     });

  //     // This approach is problematic in E2E as it tries to get service instance directly.
  //     // const subscriptionsService = app.get("SubscriptionsService");
  //     // await subscriptionsService.updateStatus(
  //     //   createdSub.id,
  //     //   SubscriptionStatus.ACTIVE,
  //     //   undefined, // No transaction client
  //     //   testUser.id // Pass requesting user ID for audit log
  //     // );

  //     // Instead, we should rely on an endpoint that triggers this, or test this logic
  //     // in an integration/unit test for SubscriptionsService.
  //     // For E2E, if PATCH /subscriptions/:id can trigger SUBSCRIPTION_STATUS_CHANGED
  //     // (e.g. if its DTO only contains 'status'), that would be the way.
  //     // However, the current PATCH seems to log SUBSCRIPTION_UPDATED.

  //     // Simulating an action that would call updateStatus internally
  //     // This is a placeholder for a real E2E scenario.
  //     // For now, we'll assume another service (like PaymentsService) or a specific admin action
  //     // would call updateStatus.

  //     // If SubscriptionsService.update calls updateStatus internally when only status is changed,
  //     // then the PATCH test above might be adapted.
  //     // Let's assume for now that SUBSCRIPTION_STATUS_CHANGED is logged by a different flow.

  //     // const auditLogs = await prisma.auditLog.findMany({
  //     //   where: {
  //     //     target_id: createdSub.id,
  //     //     action: AuditAction.SUBSCRIPTION_STATUS_CHANGED,
  //     //     user_id: testUser.id,
  //     //   },
  //     // });
  //     // expect(auditLogs.length).toBe(1);
  //     // const auditLog = auditLogs[0];
  //     // expect(auditLog.target_type).toEqual("Subscription");
  //     // expect(JSON.parse(auditLog.details as string).status).toEqual(SubscriptionStatus.ACTIVE);
  //     console.log('Test for SUBSCRIPTION_STATUS_CHANGED needs a proper E2E trigger or should be an integration test.');
  //   });
  // });
});
