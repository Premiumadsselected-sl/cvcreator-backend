import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ExpressAdapter } from "@nestjs/platform-express";
import * as express from "express";
import { Express } from "express";
import basicAuth from "express-basic-auth";
import * as dotenv from "dotenv";
import { ConfigService } from "@nestjs/config";

// Cargar variables de entorno.
dotenv.config();

const logger = new Logger("Bootstrap");

async function bootstrap(): Promise<Express> {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  const configService = app.get(ConfigService);

  const globalPrefix = configService.get<string>("API_GLOBAL_PREFIX", "api");
  app.setGlobalPrefix(globalPrefix);

  const corsOrigin = configService.get<string>("API_CORS_ORIGIN");
  if (corsOrigin) {
    const allowedOrigins = corsOrigin.split(",").map((origin) => origin.trim());
    app.enableCors({
      origin: (origin: any, callback: any) => {
        if (
          !origin ||
          allowedOrigins.includes(origin) ||
          allowedOrigins.includes("*")
        ) {
          callback(null, true);
        } else {
          logger.warn(`CORS: Origen no permitido: ${origin}`);
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
      allowedHeaders: "Content-Type, Authorization, X-Requested-With, Accept",
      credentials: true,
    });
    logger.log(
      `CORS habilitado para los orígenes: ${allowedOrigins.join(", ")}`
    );
  } else {
    logger.warn(
      "API_CORS_ORIGIN no está definido. CORS no está específicamente configurado, podría usar valores predeterminados o estar deshabilitado."
    );
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle(configService.get<string>("API_TITLE", "API Docs"))
    .setDescription(
      configService.get<string>(
        "API_DESCRIPTION",
        "API documentation for the service"
      )
    )
    .setVersion(configService.get<string>("API_VERSION", "1.0"))
    .addBearerAuth()
    .build();

  const swaggerPath = configService.get<string>("SWAGGER_PATH", "docs");
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const swaggerUser = configService.get<string>("SWAGGER_USER");
  const swaggerPass = configService.get<string>("SWAGGER_PASS");

  if (swaggerUser && swaggerPass) {
    app.use(
      `/${swaggerPath}`,
      basicAuth({
        challenge: true,
        users: { [swaggerUser]: swaggerPass },
      })
    );
    logger.log(
      `Swagger UI protegida con autenticación básica en /${globalPrefix}/${swaggerPath}`
    );
  } else {
    logger.warn(
      `Swagger UI no está protegida. Considera configurar SWAGGER_USER y SWAGGER_PASS.`
    );
  }

  SwaggerModule.setup(swaggerPath, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  logger.log(
    `Documentación de Swagger disponible en /${globalPrefix}/${swaggerPath}`
  );

  app.use(
    express.json({
      limit: configService.get<string>("API_JSON_PAYLOAD_LIMIT", "50mb"),
    })
  );
  app.use(
    express.urlencoded({
      limit: configService.get<string>("API_URLENCODED_PAYLOAD_LIMIT", "50mb"),
      extended: true,
    })
  );

  const port = configService.get<number>("PORT", 3001);
  await app.listen(port);
  logger.log(`La aplicación está escuchando en el puerto ${port}`);
  logger.log(`Servidor listo en http://localhost:${port}/${globalPrefix}`);

  return server;
}

// --- Gestión de instancia para Serverless y Local ---
let cachedServerInstance: Promise<Express> | null = null;

async function getAppInstance(): Promise<Express> {
  if (!cachedServerInstance) {
    cachedServerInstance = bootstrap().catch((err) => {
      logger.error("Error al arrancar la aplicación:", err);
      process.exit(1);
    });
  }
  return cachedServerInstance;
}

// --- Exportación para Vercel (u otros entornos serverless) ---
export const handler = async (req: any, res: any) => {
  try {
    const serverInstance = await getAppInstance();
    serverInstance(req, res);
  } catch (error) {
    logger.error("Error en el handler de Vercel:", error);
    res.status(500).send("Internal Server Error");
  }
};

// --- Ejecución local ---
async function runLocal() {
  const port = parseInt(process.env.PORT || "3001", 10);

  const localApp = await NestFactory.create(AppModule);
  const configService = localApp.get(ConfigService);

  const globalPrefix = configService.get<string>("API_GLOBAL_PREFIX", "api");
  localApp.setGlobalPrefix(globalPrefix);

  const corsOrigin = configService.get<string>("API_CORS_ORIGIN");
  if (corsOrigin) {
    const allowedOrigins = corsOrigin.split(",").map((origin) => origin.trim());
    localApp.enableCors({
      origin: (origin, callback) => {
        if (
          !origin ||
          allowedOrigins.includes(origin) ||
          allowedOrigins.includes("*")
        ) {
          callback(null, true);
        } else {
          logger.warn(`CORS (local): Origen no permitido: ${origin}`);
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
      allowedHeaders: "Content-Type, Authorization, X-Requested-With, Accept",
      credentials: true,
    });
  } else {
    logger.warn("API_CORS_ORIGIN no está definido para ejecución local.");
  }

  localApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  const swaggerUser = configService.get<string>("SWAGGER_USER");
  const swaggerPassword = configService.get<string>("SWAGGER_PASSWORD");
  const swaggerPath = `${globalPrefix}/docs`;

  if (swaggerUser && swaggerPassword) {
    localApp.use(
      `/${swaggerPath}`,

      basicAuth({
        users: { [swaggerUser]: swaggerPassword },
        challenge: true,
        realm: "SwaggerAPIDocsLocal",
      })
    );
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle(configService.get<string>("API_TITLE", "CV Creator API (Local)"))
    .setDescription(
      configService.get<string>(
        "API_DESCRIPTION",
        "API para la gestión de CVs y Cartas de Presentación"
      )
    )
    .setVersion(configService.get<string>("API_VERSION", "1.0"))
    .addTag(configService.get<string>("API_TAGS", "cvcreator"))
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Enter JWT token",
        in: "header",
      },
      "access-token"
    )
    .build();
  const document = SwaggerModule.createDocument(localApp, swaggerConfig);
  SwaggerModule.setup(swaggerPath, localApp, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  localApp.use(
    express.json({
      limit: configService.get<string>("API_JSON_PAYLOAD_LIMIT", "50mb"),
    })
  );
  localApp.use(
    express.urlencoded({
      limit: configService.get<string>("API_URLENCODED_PAYLOAD_LIMIT", "50mb"),
      extended: true,
    })
  );

  await localApp.listen(port);
  logger.log(`Aplicación escuchando localmente en el puerto ${port}`);
  logger.log(
    `Swagger UI local disponible en http://localhost:${port}/${swaggerPath}`
  );
}

// Determinar si estamos en un entorno serverless o local
if (
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.FUNCTION_NAME ||
  process.env.K_SERVICE
) {
  logger.log("Ejecutando en modo serverless. El handler se exporta.");
} else {
  logger.log("Ejecutando en modo local.");
  runLocal().catch((err) => {
    logger.error("Error al arrancar la aplicación localmente:", err);
    process.exit(1);
  });
}
