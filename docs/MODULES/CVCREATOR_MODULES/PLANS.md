# Módulo de Planes (dentro de CvCreator)

Este módulo es responsable de gestionar los planes de suscripción ofrecidos dentro de la funcionalidad específica de `CvCreator`. Es importante destacar que este módulo, al estar dentro de `cvcreator/`, se considera parte de una característica o recurso que podría ser reemplazable o modular dentro de la API general. No es un componente central indispensable de la API base, sino una extensión para la creación de CVs.

## Propósito

- Definir y gestionar diferentes niveles de planes de servicio (ej. Básico, Premium).
- Almacenar información sobre precios, características, intervalos de facturación y estado de cada plan.
- Proporcionar puntos de conexión CRUD para la administración de planes.

## Estructura de Archivos

El módulo se encuentra en `src/cvcreator/plans/`:

```
src/
└── cvcreator/
    └── plans/
        ├── dto/
        │   ├── create-plan.dto.ts
        │   ├── update-plan.dto.ts
        │   └── plan.dto.ts
        ├── plans.controller.ts
        ├── plans.module.ts
        └── plans.service.ts
```

## Componentes Clave

### `plans.controller.ts`

Define los puntos de conexión de la API para las operaciones con planes.

**Puntos de Conexión Principales:**

- `POST /plans`: Crea un nuevo plan.
  - Body: `CreatePlanDto`.
  - Respuesta: `PlanDto` (status 201).
- `GET /plans`: Obtiene una lista de todos los planes.
  - Respuesta: `PlanDto[]`.
- `GET /plans/:id`: Obtiene un plan específico por su ID (UUID).
  - Respuesta: `PlanDto`.
- `PATCH /plans/:id`: Actualiza un plan existente.
  - Body: `UpdatePlanDto`.
  - Respuesta: `PlanDto`.
- `DELETE /plans/:id`: Elimina un plan.
  - Respuesta: Vacía (status 204 No Content).

### `plans.service.ts`

Contiene la lógica de negocio para la gestión de planes.

**Métodos Principales:**

- `create(createPlanDto: CreatePlanDto)`: Crea un nuevo plan en la base de datos. Maneja el campo `features` (que es un JSON en Prisma) convirtiéndolo a `Prisma.InputJsonValue` o `Prisma.JsonNull`.
- `findAll()`: Recupera todos los planes.
- `findOne(id: string)`: Encuentra un plan por su ID. Lanza `NotFoundException` si no se encuentra.
- `update(id: string, updatePlanDto: UpdatePlanDto)`: Actualiza la información de un plan. Maneja la actualización del campo `features` de manera similar a la creación.
- `remove(id: string)`: Elimina un plan de la base de datos.

### DTOs (Objetos de Transferencia de Datos)

- **`plan.dto.ts (`PlanDto`)`**: Define la estructura principal de un objeto de plan. Incluye campos como `id`, `name`, `description`, `price`, `currency`, `billing_interval` (usando el enum `BillingInterval`), `features` (tipo `any` para el JSON, se sugiere considerar un DTO específico si la estructura es fija), `active`, `stripe_plan_id`, `createdAt`, y `updatedAt`.
  - `BillingInterval`: Un enum definido dentro de este archivo (`MONTH`, `YEAR`).
- **`create-plan.dto.ts (`CreatePlanDto`)`**: Hereda de `PlanDto` (omitiendo `id`, `createdAt`, `updatedAt` y `features` inicialmente, luego `features` se añade como opcional). Se utiliza para los datos de creación del plan.
- **`update-plan.dto.ts (`UpdatePlanDto`)`**: Utiliza `PartialType` y `OmitType` para permitir la actualización parcial de campos de `PlanDto`, también manejando `features` de forma opcional.

### `plans.module.ts`

Declara `PlansController` y `PlansService`, y exporta `PlansService`. Este módulo es importado por `CvCreatorModule`.

## Lógica Específica

- **Manejo de `features` JSON**: El servicio convierte el campo `features` a/desde el tipo JSON de Prisma (`Prisma.InputJsonValue` o `Prisma.JsonNull`).
- **Validación**: Los DTOs utilizan `class-validator` para la validación de datos y `@nestjs/swagger` para la documentación de la API.
- **Manejo de Errores**: El servicio utiliza `NotFoundException` cuando un plan no se encuentra.

## Dependencias

- `@nestjs/common`, `@nestjs/swagger`
- `../../prisma/prisma.service` para la interacción con la base de datos.
- `@prisma/client` para los tipos de Prisma.

Este módulo proporciona la funcionalidad para gestionar los diferentes planes de suscripción que se ofrecen como parte del creador de CVs.
