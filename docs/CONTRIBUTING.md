# Guía de Contribución

¡Gracias por tu interés en contribuir al backend de CV Creator! Agradecemos cualquier ayuda, desde la corrección de errores y la mejora de la documentación hasta la implementación de nuevas características.

Para asegurar un proceso de contribución fluido y efectivo, por favor sigue estas directrices.

## 1. Cómo Contribuir

Hay muchas formas de contribuir:

- **Reportando Bugs**: Si encuentras un error, por favor crea un issue detallado en el gestor de issues del proyecto (ej. GitHub Issues).
- **Sugiriendo Mejoras o Nuevas Características**: Crea un issue describiendo tu sugerencia.
- **Escribiendo o Mejorando la Documentación**: La buena documentación es crucial.
- **Escribiendo Tests**: Ayuda a mejorar la cobertura y la fiabilidad del código.
- **Escribiendo Código**: Para corregir bugs o implementar nuevas características.

## 2. Antes de Empezar

- **Revisa los Issues Existentes**: Antes de reportar un bug o sugerir una nueva característica, comprueba si ya existe un issue similar.
- **Comunica tu Intención**: Si planeas trabajar en un issue existente o implementar una característica significativa, es una buena idea comentarlo en el issue o crear uno nuevo para discutir tu enfoque. Esto ayuda a evitar la duplicación de esfuerzos y asegura que tu contribución se alinee con los objetivos del proyecto.
- **Configura tu Entorno de Desarrollo**: Asegúrate de tener el proyecto configurado y funcionando localmente como se describe en el `README.md`.

## 3. Proceso de Contribución de Código

1.  **Haz un Fork del Repositorio**: Crea una copia (fork) del repositorio principal en tu propia cuenta de GitHub (o la plataforma de control de versiones que se esté utilizando).

2.  **Clona tu Fork**: Clona tu fork a tu máquina local:

    ```bash
    git clone <URL_DE_TU_FORK>
    cd cvcreator-backend
    ```

3.  **Crea una Nueva Rama (Branch)**: Crea una rama descriptiva para tus cambios. Usa un prefijo como `fix/`, `feat/`, `docs/`, `refactor/` seguido de un nombre conciso.

    ```bash
    git checkout -b feat/nueva-caracteristica-asombrosa
    # o para un bug:
    # git checkout -b fix/error-en-login
    ```

4.  **Realiza tus Cambios**: Escribe tu código, tests y documentación. Sigue las guías de estilo de código (ver sección abajo).

5.  **Prueba tus Cambios**: Asegúrate de que todos los tests existentes pasen y, si estás añadiendo nueva funcionalidad, escribe nuevos tests para cubrirla.

    ```bash
    pnpm run test       # Tests unitarios
    pnpm run test:e2e   # Tests E2E (asegúrate que la DB de test esté configurada)
    ```

6.  **Haz Commit de tus Cambios**: Escribe mensajes de commit claros y descriptivos. Se recomienda seguir la convención de [Commits Convencionales](https://www.conventionalcommits.org/).

    ```bash
    git add .
    git commit -m "feat: Implementa nueva característica X que hace Y"
    # Ejemplo para un fix:
    # git commit -m "fix: Corrige error en el cálculo de Z cuando ocurre W"
    ```

7.  **Mantén tu Rama Actualizada (Rebase)**: Antes de enviar tu Pull Request, actualiza tu rama con los últimos cambios del repositorio principal (upstream). Es preferible usar `rebase` para mantener un historial limpio.

    ```bash
    git remote add upstream <URL_DEL_REPOSITORIO_PRINCIPAL>
    git fetch upstream
    git rebase upstream/main  # o la rama principal que se esté usando (ej. develop)
    ```

    Resuelve cualquier conflicto que pueda surgir durante el rebase.

8.  **Envía tus Cambios a tu Fork (Push)**:

    ```bash
    git push origin feat/nueva-caracteristica-asombrosa
    ```

9.  **Abre un Pull Request (PR)**:

    - Ve a la página del repositorio principal en GitHub.
    - Verás una notificación para crear un Pull Request desde tu rama recién subida. Haz clic en ella.
    - Asegúrate de que el PR se dirige a la rama principal correcta del repositorio upstream (ej. `main` o `develop`).
    - Proporciona un título claro y una descripción detallada de tus cambios en el PR. Si tu PR resuelve un issue existente, referencia el issue (ej. `Closes #123`).
    - Explica el "por qué" de tus cambios, no solo el "qué".

10. **Revisión de Código**: Uno o más mantenedores del proyecto revisarán tu PR. Pueden solicitar cambios o hacer preguntas. Por favor, responde a los comentarios y realiza los ajustes necesarios.

11. **Merge**: Una vez que tu PR sea aprobado y pase todas las comprobaciones de CI (Integración Continua), será fusionado (merged) en la rama principal.

## 4. Guías de Estilo de Código

- **TypeScript**: Sigue las mejores prácticas de TypeScript. Usa tipos siempre que sea posible.
- **NestJS**: Adhiérete a las convenciones y patrones de diseño de NestJS.
- **ESLint/Prettier**: El proyecto utiliza ESLint para el análisis estático del código y Prettier para el formateo. Asegúrate de que tu código cumpla con las reglas configuradas. Puedes ejecutar los linters localmente:
  ```bash
  pnpm run lint
  pnpm run format # o pnpm run prettier:write
  ```
  Muchos editores pueden configurarse para aplicar estas reglas automáticamente al guardar.
- **Nombres Descriptivos**: Usa nombres claros y descriptivos para variables, funciones, clases y archivos.
- **Comentarios**: Comenta el código cuando la lógica no sea obvia, pero evita comentarios innecesarios para código auto-explicativo.

## 5. Reporte de Problemas de Seguridad

Si descubres una vulnerabilidad de seguridad, por favor **NO** crees un issue público. En su lugar, contacta a los mantenedores del proyecto de forma privada. Proporciona detalles sobre la vulnerabilidad y cómo podría ser explotada.

## 6. Código de Conducta

Se espera que todos los contribuidores sigan el Código de Conducta del proyecto (si existe uno, enlazarlo aquí). El objetivo es fomentar una comunidad abierta, acogedora y respetuosa.

¡Gracias de nuevo por tu contribución!
