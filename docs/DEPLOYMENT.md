# Despliegue

Esta guía cubre los pasos y consideraciones para desplegar la aplicación backend de CV Creator en un entorno de producción o staging.

## 1. Requisitos Previos del Entorno

Antes de desplegar, asegúrate de que tu servidor o plataforma de despliegue cumpla con los siguientes requisitos:

- **Node.js**: Versión compatible con el proyecto (generalmente la última LTS).
- **PNPM**: Gestor de paquetes utilizado en el proyecto.
- **Base de Datos PostgreSQL**: Una instancia de PostgreSQL accesible por la aplicación.
- **Variables de Entorno**: Un mecanismo para gestionar las variables de entorno de forma segura.
- **Firewall/Reglas de Red**: Configurado para permitir el tráfico entrante en el puerto de la aplicación (y saliente si es necesario para servicios externos).
- **(Opcional pero Recomendado) Un Process Manager**: Como PM2, para mantener la aplicación en ejecución, gestionarla y monitorizarla.
- **(Opcional pero Recomendado) Un Reverse Proxy**: Como Nginx o Apache, para manejar SSL/TLS, balanceo de carga, servir assets estáticos (si aplica), etc.

## 2. Preparación para la Producción

### 2.1. Configuración de Variables de Entorno

Crea un archivo `.env` en el servidor de producción con la configuración adecuada. **Nunca comitas este archivo al repositorio si contiene secretos.**

Variables clave para producción:

- `NODE_ENV=production`
- `PORT`: Puerto en el que se ejecutará la aplicación (ej. 3000, 8080).
- `DATABASE_URL`: Cadena de conexión a tu base de datos PostgreSQL de producción.
- `JWT_API_SECRET`: Un secreto JWT **fuerte y único** para producción.
- `JWT_EXPIRATION_TIME`: Tiempo de expiración para los JWTs (ej. `15m`, `1h`, `1d`).
- (Si se usa Refresh Tokens) `JWT_REFRESH_SECRET` y `JWT_REFRESH_EXPIRATION_TIME`.
- Credenciales y URLs para servicios externos (ej. Tefpay, servicio de email).

### 2.2. Construcción (Build) de la Aplicación

Desde tu máquina de desarrollo o un servidor de CI/CD, ejecuta el script de construcción:

```bash
pnpm run build
```

Esto compilará el código TypeScript a JavaScript en la carpeta `dist`.

### 2.3. Empaquetado para Despliegue

Necesitarás transferir los siguientes archivos/carpetas a tu servidor de producción:

- La carpeta `dist/` generada.
- `node_modules/` (o puedes ejecutar `pnpm install --prod` en el servidor).
- `package.json` y `pnpm-lock.yaml` (necesarios si instalas dependencias en el servidor).
- La carpeta `prisma/` (especialmente `schema.prisma` y la carpeta `migrations`).
- El archivo `.env` configurado para producción.

Una forma común es crear un archivo comprimido (ej. `.tar.gz` o `.zip`) con estos contenidos, o usar herramientas de despliegue que manejen esto.

## 3. Despliegue en el Servidor

### 3.1. Transferir Archivos

Sube los archivos empaquetados a tu servidor (usando `scp`, `rsync`, FTP, o herramientas de despliegue específicas de tu plataforma).

### 3.2. Instalar Dependencias de Producción (si no se incluyeron)

Si no incluiste `node_modules` en tu paquete de despliegue, navega al directorio de la aplicación en el servidor y ejecuta:

```bash
pnpm install --prod
```

Esto instalará solo las dependencias necesarias para producción, omitiendo las `devDependencies`.

### 3.3. Aplicar Migraciones de la Base de Datos

Es crucial aplicar las migraciones de Prisma a tu base de datos de producción antes de iniciar la aplicación:

```bash
pnpm prisma migrate deploy
```

Este comando aplica todas las migraciones pendientes que se encuentran en la carpeta `prisma/migrations` y que aún no se han aplicado a la base de datos de producción. **No genera nuevas migraciones ni modifica el esquema localmente; solo aplica las existentes.**

### 3.4. (Opcional) Generar Prisma Client

Aunque el cliente Prisma suele generarse durante la instalación o el build, puedes asegurarte de que esté actualizado ejecutando:

```bash
pnpm prisma generate
```

## 4. Iniciar la Aplicación

### 4.1. Usando `npm start:prod` (Básico)

Puedes iniciar la aplicación usando el script definido en `package.json`:

```bash
pnpm run start:prod
```

Esto típicamente ejecuta `node dist/main.js`.

### 4.2. Usando un Process Manager (Recomendado)

Para producción, es altamente recomendable usar un gestor de procesos como PM2. PM2 ayuda a mantener tu aplicación viva, permite reinicios sin caídas (zero-downtime reloads), facilita la gestión de logs y monitorización.

**Instalación de PM2 (globalmente):**

```bash
sudo npm install -g pm2
```

**Iniciar la aplicación con PM2:**

```bash
pm2 start dist/main.js --name cvcreator-backend
```

O, si tienes un archivo de ecosistema PM2 (ej. `ecosystem.config.js`):

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "cvcreator-backend",
      script: "dist/main.js",
      instances: "max", // o un número específico de instancias
      exec_mode: "cluster", // Habilita el modo cluster de Node.js
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
        // Aquí puedes definir variables de entorno específicas para PM2
        // aunque es mejor gestionarlas con un archivo .env y dotenv
      },
    },
  ],
};
```

Luego iniciar con:

```bash
pm2 start ecosystem.config.js --env production
```

**Comandos útiles de PM2:**

- `pm2 list`: Lista todas las aplicaciones gestionadas por PM2.
- `pm2 logs cvcreator-backend`: Muestra los logs de la aplicación.
- `pm2 restart cvcreator-backend`: Reinicia la aplicación.
- `pm2 stop cvcreator-backend`: Detiene la aplicación.
- `pm2 delete cvcreator-backend`: Elimina la aplicación de la lista de PM2.
- `pm2 startup` y `pm2 save`: Para que PM2 se inicie automáticamente al reiniciar el servidor.

## 5. Configuración de un Reverse Proxy (Nginx/Apache)

Configurar un reverse proxy como Nginx delante de tu aplicación Node.js es una práctica estándar por varias razones:

- **SSL/TLS Termination**: Manejar las conexiones HTTPS.
- **Balanceo de Carga**: Si ejecutas múltiples instancias de tu aplicación.
- **Servir Assets Estáticos**: Aunque esta API es principalmente backend.
- **Seguridad y Caching**: Añadir capas adicionales de seguridad y caching.

**Ejemplo de configuración básica de Nginx:**

```nginx
# /etc/nginx/sites-available/cvcreator.com

server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Redirigir HTTP a HTTPS (si tienes SSL)
    # location / {
    #     return 301 https://$host$request_uri;
    # }

    location / {
        proxy_pass http://localhost:PORT; # El puerto donde corre tu app NestJS
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Si tienes SSL (ej. con Let's Encrypt):
# server {
#     listen 443 ssl http2;
#     server_name tu-dominio.com www.tu-dominio.com;
#
#     ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
#     include /etc/letsencrypt/options-ssl-nginx.conf;
#     ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
#
#     location / {
#         proxy_pass http://localhost:PORT;
#         # ... mismas directivas proxy_set_header que arriba ...
#     }
# }
```

No olvides habilitar el sitio y reiniciar Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/cvcreator.com /etc/nginx/sites-enabled/
sudo nginx -t # Testear configuración
sudo systemctl restart nginx
```

## 6. Monitorización y Logging

- **Logging**: Configura tu aplicación NestJS para un logging adecuado en producción. Puedes usar el logger incorporado o librerías como Winston o Pino. PM2 también gestiona logs.
- **Monitorización**: Utiliza herramientas de monitorización para supervisar el rendimiento de la aplicación, uso de CPU, memoria, y para detectar errores (ej. Sentry, New Relic, Datadog, o soluciones auto-alojadas como Prometheus/Grafana).

## 7. Seguridad Adicional

- **Actualizaciones Regulares**: Mantén Node.js, PNPM, las dependencias del proyecto y el sistema operativo del servidor actualizados.
- **Firewall**: Configura un firewall (ej. `ufw` en Linux) para permitir solo el tráfico necesario.
- **Protección contra Vulnerabilidades Comunes**: NestJS proporciona cierta protección por defecto (ej. contra XSS si se usan plantillas del lado del servidor, lo cual no es común en APIs REST). Considera usar `helmet` para cabeceras de seguridad HTTP.
- **Limitación de Tasa (Rate Limiting)**: Implementa limitación de tasa para proteger tu API contra abusos (ej. con `@nestjs/throttler`).

## 8. Backups de la Base de Datos

Implementa una estrategia de backups regulares y probados para tu base de datos PostgreSQL.

Esta guía proporciona una base para el despliegue. Los detalles específicos pueden variar según tu proveedor de hosting o plataforma (ej. Docker, Kubernetes, AWS, Heroku, Vercel para backends Serverless, etc.).
