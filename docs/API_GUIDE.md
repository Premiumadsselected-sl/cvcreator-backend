# Guía de la API de CV Creator Backend

Esta guía proporciona información esencial sobre cómo interactuar con la API RESTful del backend de CV Creator. Todos los endpoints están documentados utilizando Swagger (OpenAPI), y esta guía complementa esa documentación con conceptos generales.

## 1. URL Base de la API

La URL base para todas las solicitudes a la API en un entorno de desarrollo local es típicamente:

`http://localhost:PORT`

Donde `PORT` es el puerto en el que se está ejecutando la aplicación (por defecto, NestJS usa el puerto 3000, pero puede ser configurado).

En entornos de producción o staging, esta URL cambiará.

## 2. Documentación Swagger (OpenAPI)

La API está auto-documentada utilizando Swagger. Puedes acceder a la interfaz de Swagger UI en tu navegador (mientras la aplicación está en ejecución) a través de la ruta:

`http://localhost:PORT/api` (o la ruta configurada en `main.ts` para Swagger).

Swagger UI te permite:

- Ver todos los endpoints disponibles, agrupados por controladores (recursos).
- Ver los métodos HTTP permitidos para cada endpoint (GET, POST, PATCH, DELETE, etc.).
- Inspeccionar los DTOs (Data Transfer Objects) esperados para las solicitudes (payloads) y las respuestas.
- Probar los endpoints directamente desde la interfaz del navegador (especialmente útil para endpoints que no requieren cuerpos de solicitud complejos o autenticación).

**Se recomienda encarecidamente utilizar la documentación de Swagger como la referencia principal para los detalles específicos de cada endpoint.**

## 3. Autenticación

La mayoría de los endpoints de la API requieren autenticación. El sistema utiliza **JSON Web Tokens (JWT)** para este propósito.

### Flujo de Autenticación:

1.  **Inicio de Sesión / Registro:**
    - El usuario se registra o inicia sesión a través de los endpoints específicos del módulo de autenticación (ej. `/auth/login`, `/auth/register`).
    - Si las credenciales son válidas, la API devuelve un `access_token` (JWT).
2.  **Solicitudes Autenticadas:**

    - Para acceder a endpoints protegidos, el cliente debe incluir el `access_token` en la cabecera `Authorization` de la solicitud HTTP, utilizando el esquema `Bearer`.

    **Ejemplo de Cabecera de Autorización:**

    ```
    Authorization: Bearer <TU_ACCESS_TOKEN>
    ```

Si no se proporciona un token válido, la API responderá con un código de estado `401 Unauthorized`.

## 4. Formato de Solicitud y Respuesta

- **Formato de Datos:** La API espera que los cuerpos de las solicitudes (payloads) y envía los cuerpos de las respuestas en formato **JSON**.
- **Cabeceras:**
  - Para solicitudes con cuerpo (POST, PUT, PATCH), asegúrate de incluir la cabecera `Content-Type: application/json`.
  - La cabecera `Accept: application/json` es una buena práctica para indicar que esperas una respuesta JSON.

## 5. Códigos de Estado HTTP Comunes

La API utiliza códigos de estado HTTP estándar para indicar el resultado de una solicitud:

- **`200 OK`**: La solicitud fue exitosa (generalmente para GET, PUT, PATCH, DELETE).
- **`201 Created`**: El recurso fue creado exitosamente (generalmente para POST).
- **`204 No Content`**: La solicitud fue exitosa pero no hay contenido para devolver (ej. después de un DELETE exitoso).
- **`400 Bad Request`**: La solicitud fue inválida. Esto puede deberse a datos faltantes, formato incorrecto o errores de validación en el DTO. El cuerpo de la respuesta a menudo contendrá más detalles sobre los errores de validación.
  ```json
  {
    "statusCode": 400,
    "message": ["email must be an email", "password should not be empty"],
    "error": "Bad Request"
  }
  ```
- **`401 Unauthorized`**: La autenticación falló. El cliente no proporcionó un token JWT válido, el token expiró o las credenciales son incorrectas.
- **`403 Forbidden`**: El usuario está autenticado pero no tiene los permisos necesarios para acceder al recurso solicitado.
- **`404 Not Found`**: El recurso solicitado no existe.
- **`409 Conflict`**: La solicitud no se pudo completar debido a un conflicto con el estado actual del recurso (ej. intentar crear un recurso que ya existe con un identificador único).
- **`500 Internal ServerError`**: Ocurrió un error inesperado en el servidor.

## 6. Validación de Datos (DTOs)

La API utiliza DTOs (Data Transfer Objects) y el `ValidationPipe` de NestJS (con `class-validator`) para validar los datos de entrada. Si una solicitud no cumple con las reglas de validación definidas en los DTOs (ej. campos obligatorios, tipos de datos correctos, formatos específicos como emails), la API responderá con un `400 Bad Request` y un cuerpo de respuesta detallando los errores de validación.

Consulta la documentación de Swagger o los archivos DTO en el código fuente (`src/**/dto/*.dto.ts`) para conocer la estructura y las reglas de validación de cada endpoint.

## 7. Paginación, Filtrado y Ordenación (Convenciones)

Para endpoints que devuelven listas de recursos, se pueden seguir las siguientes convenciones (si están implementadas):

- **Paginación:**
  - `page` (o `offset`): Número de página o desplazamiento.
  - `limit` (o `pageSize`): Número de ítems por página.
  - Ejemplo: `GET /resources?page=2&limit=20`
- **Filtrado:**
  - Los parámetros de consulta se pueden usar para filtrar por campos específicos.
  - Ejemplo: `GET /cvs?status=draft&user_id=some-user-id`
- **Ordenación:**
  - `sortBy`: Campo por el cual ordenar.
  - `sortOrder`: Dirección de ordenación (`asc` o `desc`).
  - Ejemplo: `GET /templates?sortBy=createdAt&sortOrder=desc`

La implementación específica de estas características puede variar por endpoint. Consulta la documentación de Swagger para cada caso.

## 8. Manejo de Errores

Además de los códigos de estado HTTP, las respuestas de error (`4xx`, `5xx`) generalmente incluirán un cuerpo JSON con más información:

```json
{
  "statusCode": <HTTP_STATUS_CODE>,
  "message": "Descripción del error o array de mensajes de validación",
  "error": "Breve descripción del tipo de error (ej. 'Not Found', 'Bad Request')"
}
```

## 9. Versionado de la API (Opcional)

Si la API implementa versionado, la URL podría incluir un prefijo de versión (ej. `/v1/resource`). Actualmente, esta guía no asume un versionado explícito en la URL base, pero es una consideración para futuras evoluciones.
