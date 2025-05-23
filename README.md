# CV Creator Backend

## Descripción

CV Creator Backend es el sistema de servidor para la aplicación CV Creator. Proporciona una API RESTful para gestionar usuarios, currículums (CVs), cartas de presentación, plantillas, suscripciones y pagos. Está construido con [NestJS](https://nestjs.com/), un marco de trabajo progresivo de Node.js para construir aplicaciones del lado del servidor eficientes, confiables y escalables, utilizando [Prisma](https://www.prisma.io/) como ORM para la interacción con la base de datos PostgreSQL.

## Tecnologías Principales

- **Node.js**: Entorno de ejecución de JavaScript.
- **NestJS**: Marco de trabajo para construir la API.
- **TypeScript**: Superset de JavaScript que añade tipado estático.
- **Prisma**: ORM para la interacción con la base de datos.
- **PostgreSQL**: Sistema de gestión de bases de datos relacional.
- **JWT (JSON Web Tokens)**: Para la autenticación y autorización.
- **Swagger (OpenAPI)**: Para la documentación de la API (integrado con NestJS).
- **PNPM**: Gestor de paquetes rápido y eficiente en el uso de espacio en disco.

## Requisitos Previos

- Node.js (se recomienda la última versión LTS)
- PNPM (instalable vía `npm install -g pnpm`)
- PostgreSQL (servidor en ejecución)
- Un editor de código (ej. VS Code)

## Instalación

1.  **Clonar el repositorio**:

    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd cvcreator-backend
    ```

2.  **Instalar dependencias**:

    ```bash
    pnpm install
    ```

3.  **Configurar variables de entorno**:

    - Copia el archivo `.env.example` (si existe) a `.env`:
      ```bash
      cp .env.example .env
      ```
    - Modifica el archivo `.env` con tu configuración local. Las variables clave incluyen:
      - `DATABASE_URL`: Cadena de conexión a tu base de datos PostgreSQL.
        Ejemplo: `postgresql://user:password@localhost:5432/mydatabase?schema=public`
      - `JWT_API_SECRET`: Un secreto fuerte para firmar los tokens JWT.
      - `PORT`: Puerto en el que se ejecutará la aplicación (por defecto 3000 o el especificado por NestJS).
      - Otras configuraciones específicas de servicios (ej. Tefpay, servicios de email).

4.  **Migraciones de la base de datos**:
    Aplica las migraciones de Prisma para configurar el esquema de tu base de datos:
    ```bash
    pnpm prisma migrate dev
    ```
    Opcionalmente, puedes generar el cliente Prisma:
    ```bash
    pnpm prisma generate
    ```

## Ejecución de la Aplicación

- **Modo Desarrollo (con auto-recarga)**:

  ```bash
  pnpm run start:dev
  ```

  La aplicación estará disponible por defecto en `http://localhost:3000` (o el puerto configurado).

- **Modo Producción**:
  Primero, construye la aplicación:
  ```bash
  pnpm run build
  ```
  Luego, inicia la aplicación:
  ```bash
  pnpm run start:prod
  ```

## Ejecución de Tests

- **Tests Unitarios**:

  ```bash
  pnpm run test
  ```

- **Tests E2E (End-to-End)**:

  ```bash
  pnpm run test:e2e
  ```

  (Asegúrate de que la base de datos de test esté configurada y accesible).

- **Cobertura de Tests**:
  ```bash
  pnpm run test:cov
  ```

## Estructura del Proyecto (Simplificada)

```
cvcreator-backend/
├── prisma/               # Esquema y migraciones de Prisma
├── src/                  # Código fuente de la aplicación
│   ├── app.module.ts     # Módulo raíz de la aplicación
│   ├── main.ts           # Archivo de entrada de la aplicación
│   ├── auth/             # Módulo de autenticación
│   ├── users/            # Módulo de gestión de usuarios
│   ├── cvcreator/        # Lógica central de creación (CVs, cartas, plantillas)
│   │   ├── cvs/
│   │   ├── cover-letters/
│   │   └── templates/
│   ├── subscriptions/    # Módulo de gestión de suscripciones
│   ├── payments/         # Módulo de gestión de pagos (integración Tefpay)
│   ├── guards/           # Guards de autenticación y autorización
│   ├── prisma/           # Módulo y servicio de Prisma
│   └── ...               # Otros módulos y servicios
├── test/                 # Tests E2E y de integración
├── .env.example          # Ejemplo de archivo de variables de entorno
├── nest-cli.json         # Configuración de NestJS CLI
├── package.json          # Dependencias y scripts del proyecto
└── tsconfig.json         # Configuración de TypeScript
```

## Documentación de la API

Una vez que la aplicación está en ejecución en modo desarrollo, la documentación de la API generada por Swagger suele estar disponible en `http://localhost:3000/api` (o la ruta que se haya configurado en `main.ts`).

Para una documentación más detallada y conceptual, consulta la carpeta `/docs` en este repositorio.

## Contribuciones

Las contribuciones son bienvenidas. Por favor, sigue las guías de estilo de código y asegúrate de que los tests pasen antes de enviar un Pull Request.

## Licencia

(Especificar licencia si aplica, ej. MIT, ISC)
