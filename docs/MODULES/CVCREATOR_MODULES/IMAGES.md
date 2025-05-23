# Módulo de Imágenes

Este módulo es responsable de gestionar la carga, almacenamiento y recuperación de imágenes dentro de la aplicación `cvcreator-backend`. Está integrado dentro de `CvCreatorModule`.

## Propósito

- Permitir a los usuarios cargar imágenes (por ejemplo, fotos de perfil, activos para CVs).
- Almacenar metadatos de imágenes en la base de datos.
- Almacenar los archivos de imagen en el sistema de archivos del servidor (en la carpeta `uploads/images`).
- Proporcionar puntos de conexión para recuperar, actualizar y eliminar imágenes.

## Estructura de Archivos

El módulo se encuentra en `src/cvcreator/images/`:

```
src/
└── cvcreator/
    └── images/
        ├── dto/
        │   ├── create-image.dto.ts
        │   ├── update-image.dto.ts
        │   └── image.dto.ts
        ├── images.controller.ts
        ├── images.module.ts
        └── images.service.ts
```

## Componentes Clave

### `images.controller.ts`

Define los puntos de conexión de la API para las operaciones con imágenes. Utiliza `FileInterceptor` de NestJS para manejar la carga de archivos.

**Puntos de Conexión Principales:**

- `POST /images`:
  - Sube un archivo de imagen y crea un nuevo registro de imagen.
  - Utiliza `@UseInterceptors(FileInterceptor('file'))` y `@ApiConsumes('multipart/form-data')`.
  - Valida el archivo usando `ParseFilePipe` con `MaxFileSizeValidator` (5MB) y `FileTypeValidator` (jpeg, png, gif, webp).
  - Body: `CreateImageDto` (metadatos) y el archivo de imagen.
  - Respuesta: `ImageDto`.
- `GET /images`: Obtiene una lista de todas las imágenes (metadatos).
  - Respuesta: `ImageDto[]`.
- `GET /images/:id`: Obtiene los metadatos de una imagen específica por su ID.
  - Respuesta: `ImageDto`.
- `PATCH /images/:id`: Actualiza los metadatos de una imagen existente.
  - Body: `UpdateImageDto`.
  - Respuesta: `ImageDto`.
  - Nota: La actualización del archivo en sí no está implementada directamente en este punto de conexión en el código proporcionado, pero se sugiere como una posible extensión.
- `DELETE /images/:id`: Elimina una imagen (tanto el registro en la base de datos como el archivo del sistema de archivos).
  - Respuesta: `ImageDto` (los datos de la imagen eliminada).

### `images.service.ts`

Contiene la lógica de negocio para la gestión de imágenes.

**Métodos Principales:**

- `create(createImageDto: CreateImageDto, file: Express.Multer.File)`: Guarda el archivo de imagen en `uploads/images/` con un nombre de archivo generado por UUID, y crea un registro en la base de datos con los metadatos de la imagen y la ruta al archivo.
- `findAll()`: Recupera todos los registros de imágenes de la base de datos.
- `findOne(id: string)`: Encuentra un registro de imagen por su ID.
- `update(id: string, updateImageDto: UpdateImageDto)`: Actualiza los metadatos de una imagen en la base de datos. No maneja la actualización del archivo físico en la versión actual.
- `remove(id: string)`: Elimina el registro de la imagen de la base de datos y el archivo correspondiente del sistema de archivos.
- `mapPrismaImageToDto(image: Image)`: Método privado para mapear el objeto `Image` de Prisma a `ImageDto`.
- `isValidLocalImageType(typeString: any)`: Valida si el tipo de imagen proporcionado es uno de los tipos definidos en `LocalImageType`.

### DTOs (Objetos de Transferencia de Datos)

- **`image.dto.ts (`ImageDto`)`**: Define la estructura principal de un objeto de imagen, incluyendo `id`, `user_id`, `type` (usando el enum `ImageType` de `src/types/ImageType.ts`), `image_name`, `image_type` (MIME type), `image_url`, `image_path`, `image_size`, `image_data` (para metadatos JSON adicionales), `createdAt`, y `updatedAt`.
- **`create-image.dto.ts (`CreateImageDto`)`**: Hereda de `ImageDto` (omitiendo `id`, `createdAt`, `updatedAt`). Se utiliza para los datos que acompañan a la carga de la imagen.
- **`update-image.dto.ts (`UpdateImageDto`)`**: Permite la actualización parcial de campos de `ImageDto`, omitiendo `id`, `user_id`, `createdAt`, y `updatedAt`.

### `images.module.ts`

Declara `ImagesController` y `ImagesService`, y exporta `ImagesService`. Este módulo es importado por `CvCreatorModule`.

## Lógica Específica

- **Almacenamiento de Archivos**: Las imágenes se guardan en el directorio `uploads/images/` dentro del servidor. La ruta se construye dinámicamente.
- **Nomenclatura de Archivos**: Se utiliza `uuidv4()` para generar nombres de archivo únicos para evitar colisiones.
- **Validación de Tipos**: El servicio valida el campo `type` de la imagen contra un enum `LocalImageType` definido en `src/types/ImageType.ts`.
- **Manejo de Errores**: El servicio utiliza `NotFoundException`, `InternalServerErrorException`, y `BadRequestException` para manejar diferentes escenarios de error.
- **Seguridad**: La validación del tamaño y tipo de archivo en el controlador ayuda a prevenir la carga de archivos maliciosos o excesivamente grandes.

## Dependencias

- `@nestjs/common`, `@nestjs/platform-express`
- `@nestjs/swagger` para la documentación de la API.
- `../../prisma/prisma.service` para la interacción con la base de datos.
- `express` (tipos para `Multer.File`).
- `fs/promises` para operaciones asíncronas del sistema de archivos.
- `path` para la manipulación de rutas de archivos.
- `uuid` para generar identificadores únicos.
- `../../../types/ImageType` para el enum de tipos de imagen.
