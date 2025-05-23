## Testing

Describe la estrategia de pruebas del proyecto, cómo ejecutar las pruebas y cualquier configuración específica relacionada con las pruebas.

### Pruebas Unitarias

Las pruebas unitarias se encuentran en el directorio `test/unit` y se centran en probar unidades de código aisladas, como servicios o controladores.

**Ejecución:**

```bash
pnpm test:unit
```

### Pruebas de Integración

Las pruebas de integración están en `test/integration` y prueban la interacción entre diferentes partes del módulo o la aplicación, como la correcta instanciación de módulos y la resolución de dependencias.

**Ejecución:**

```bash
pnpm test:integration
```

### Pruebas End-to-End (E2E)

Las pruebas E2E se encuentran en `test` (por ejemplo, `app.e2e-spec.ts`) y prueban el flujo completo de la aplicación a través de peticiones HTTP.

**Ejecución:**

```bash
pnpm test:e2e
```

### Cobertura de Código

Para generar un informe de cobertura de código, puedes usar:

```bash
pnpm test:cov
```
