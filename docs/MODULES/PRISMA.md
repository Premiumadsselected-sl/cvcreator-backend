# Módulo Prisma

## Introducción

El módulo `Prisma` en `cvcreator-backend` encapsula la configuración y el servicio de Prisma ORM. Prisma es utilizado como la capa de acceso a la base de datos, facilitando las interacciones con la base de datos PostgreSQL de la aplicación.

Este módulo está configurado como global (`@Global()`) para que `PrismaService` esté disponible para su inyección en cualquier otro módulo de la aplicación sin necesidad de importarlo explícitamente en cada uno.

## Archivos del Módulo

La estructura del módulo `Prisma` es la siguiente:

```
src/
└── prisma/
    ├── prisma.module.ts
    └── prisma.service.ts
prisma/
└── schema.prisma  // Archivo principal del esquema de la base de datos
```

- `src/prisma/prisma.module.ts`: Define el `PrismaModule` de NestJS. Declara y exporta `PrismaService`.
- `src/prisma/prisma.service.ts`: Contiene la clase `PrismaService` que extiende `PrismaClient`. Se encarga de conectar y desconectar de la base de datos durante el ciclo de vida de la aplicación.
- `prisma/schema.prisma`: Este es el archivo fundamental donde se define el esquema de la base de datos, incluyendo modelos, relaciones, tipos de datos y directivas del generador de Prisma Client.

## `PrismaService`

El `PrismaService` es el corazón de la interacción con la base de datos. Extiende `PrismaClient`, por lo que hereda todos los métodos para realizar operaciones CRUD (Crear, Leer, Actualizar, Eliminar) en los modelos definidos en `schema.prisma`.

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect(); // Conecta a la base de datos cuando el módulo se inicializa
  }

  async onModuleDestroy() {
    await this.$disconnect(); // Desconecta de la base de datos cuando la aplicación se cierra
  }
}
```

**Ciclo de Vida:**

- `onModuleInit()`: Este método se llama cuando el módulo `PrismaModule` es inicializado por NestJS. Aquí se establece la conexión a la base de datos.
- `onModuleDestroy()`: Este método se llama cuando la aplicación NestJS se está cerrando (shutdown). Aquí se cierra la conexión a la base de datos para liberar recursos.

## `PrismaModule`

Este módulo simplemente registra `PrismaService` como un proveedor y lo exporta. El decorador `@Global()` lo hace disponible en toda la aplicación.

```typescript
// src/prisma/prisma.module.ts
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Global() // Hace que PrismaService esté disponible globalmente
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Exporta PrismaService para ser usado en otros módulos
})
export class PrismaModule {}
```

## `schema.prisma`

Este archivo es la fuente de verdad para la estructura de tu base de datos y los tipos generados por Prisma Client. Define los modelos (equivalentes a tablas en la base de datos), sus campos, tipos y relaciones.

**Ejemplo de un modelo en `schema.prisma`:**

```prisma
// prisma/schema.prisma

model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String?
  posts     Post[]    // Relación uno a muchos con el modelo Post
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

El archivo `schema.prisma` completo del proyecto `cvcreator-backend` define todos los modelos como `User`, `Image`, `Subscription`, `Plan`, `Payment`, `Cv`, `CoverLetter`, `Template`, etc., con sus respectivas relaciones y campos.

**Puntos Clave del `schema.prisma` del proyecto:**

- **Generador de Cliente**: `provider = "prisma-client-js"` para generar el cliente de Prisma en TypeScript.
- **Fuente de Datos**: Configurado para PostgreSQL (`provider = "postgresql"`) usando una variable de entorno `DATABASE_URL`.
- **Modelos Detallados**: Incluye modelos para usuarios, CVs, cartas de presentación, plantillas, imágenes, planes, suscripciones, pagos, logs de email, tokens de API y logs de auditoría.
- **Relaciones**: Define claramente las relaciones entre los modelos (uno a uno, uno a muchos, muchos a muchos implícitos).
- **Tipos de Datos**: Utiliza tipos de datos específicos de PostgreSQL y tipos primitivos de Prisma.
- **Atributos**: Usa atributos como `@id`, `@default()`, `@unique`, `@updatedAt`, `@relation`, etc., para definir claves primarias, valores por defecto, restricciones de unicidad, timestamps automáticos y relaciones.

## Uso en Otros Módulos

Para usar `PrismaService` en otros servicios o controladores, simplemente inyéctalo a través del constructor:

```typescript
// Ejemplo en un servicio (ej. UsersService)
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service"; // Ajusta la ruta según sea necesario
import { User, Prisma } from "@prisma/client";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // ... otros métodos del servicio
}
```

## Comandos de Prisma CLI

Prisma viene con una potente CLI para gestionar migraciones, generar el cliente y más.

- `npx prisma generate`: Genera o actualiza Prisma Client después de cambios en `schema.prisma`.
- `npx prisma migrate dev`: Crea y aplica una nueva migración durante el desarrollo.
- `npx prisma db push`: (Para prototipado rápido, no recomendado para producción) Sincroniza el esquema de la base de datos con `schema.prisma` sin crear archivos de migración.
- `npx prisma studio`: Abre Prisma Studio, una GUI para ver y editar los datos en tu base de datos.

Este módulo es crucial para la persistencia de datos en `cvcreator-backend` y proporciona una manera tipada y eficiente de interactuar con la base de datos.
