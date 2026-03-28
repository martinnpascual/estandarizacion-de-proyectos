# MÓDULOS — Biblioteca de Módulos Reutilizables

> Cada módulo es una solución documentada, probada en al menos un proyecto real, lista para ser aplicada o adaptada en proyectos nuevos.

---

## Cómo usar este catálogo

1. Al iniciar un proyecto nuevo → identificar qué módulos aplican desde el INTAKE
2. Al implementar un módulo → leer el .md correspondiente antes de codear
3. Al mejorar un módulo en un proyecto → actualizar el .md aquí con la mejora
4. Al encontrar un patrón nuevo → crear un .md nuevo aquí

---

## Catálogo

### Módulos universales (todos los proyectos)

| Módulo | Archivo | Stack | Proyectos que lo usan | Madurez |
|--------|---------|-------|----------------------|---------|
| Autenticación Supabase | `auth-supabase.md` | B + D | Todos | ★★★★★ |
| CRUD base + RLS | `crud-base.md` | B + D | Todos | ★★★★☆ |
| Audit trail / Historial | `audit-historial.md` | B + D | Todos | ★★★★★ |
| Soft deletes | incluido en crud-base | B + D | Todos | ★★★★★ |

### Módulos de interfaz

| Módulo | Archivo | Stack | Proyectos que lo usan | Madurez |
|--------|---------|-------|----------------------|---------|
| Dashboard shell | `dashboard-shell.md` | B + D | DM Cars, Prestamista, GoJulito, JoseYbarra | ★★★★☆ |
| Design tokens / tema | `design-tokens.md` | B | JoseYbarra, GoJulito | ★★★☆☆ |

### Módulos de automatización

| Módulo | Archivo | Stack | Proyectos que lo usan | Madurez |
|--------|---------|-------|----------------------|---------|
| Bot Telegram + n8n | `bot-telegram-n8n.md` | A + B + D | Prestamista, GoJulito | ★★★★☆ |
| Notificaciones multi-canal | `notifications.md` | D | Prestamista | ★★★☆☆ |

### Módulos de documentos

| Módulo | Archivo | Stack | Proyectos que lo usan | Madurez |
|--------|---------|-------|----------------------|---------|
| PDF Generator | `pdf-generator.md` | D | DM Cars, Prestamista | ★★★★☆ |

### Módulos financieros

| Módulo | Archivo | Stack | Proyectos que lo usan | Madurez |
|--------|---------|-------|----------------------|---------|
| Tracking de pagos | `payments-tracking.md` | B + D | Prestamista, GoJulito, JoseYbarra | ★★★★☆ |
| IDs legibles (human-readable) | `readable-ids.md` | B | GoJulito | ★★★☆☆ |

### Módulos de deploy

| Módulo | Archivo | Stack | Proyectos que lo usan | Madurez |
|--------|---------|-------|----------------------|---------|
| Deploy Dokploy + Next.js | `deploy-dokploy.md` | B | GoJulito, JoseYbarra | ★★★★☆ |
| Deploy Docker Compose | `deploy-docker.md` | D | DM Cars, Prestamista | ★★★★☆ |

### Módulos específicos Argentina

| Módulo | Archivo | Stack | Proyectos que lo usan | Madurez |
|--------|---------|-------|----------------------|---------|
| Facturación ARCA/AFIP | `afip-invoicing.md` | D | DM Cars | ★★★☆☆ |
| Formato ARS | `formato-ars.md` | B + D | JoseYbarra, DM Cars | ★★★★☆ |

---

## Leyenda de madurez

| Estrellas | Significado |
|-----------|-------------|
| ★★★★★ | Probado en múltiples proyectos, estable, documentado |
| ★★★★☆ | Probado en 1-2 proyectos, documentado |
| ★★★☆☆ | Funciona, documentación básica |
| ★★☆☆☆ | En construcción |
| ★☆☆☆☆ | Idea, no implementado |

---

## Módulos pendientes de documentar

> Identificados en proyectos existentes pero sin .md propio todavía.

- [ ] `crud-base.md` — extraer patrones de soft delete + RLS de todos los proyectos
- [ ] `audit-historial.md` — trigger de historial de GoJulito + Finanzas-jy
- [ ] `design-tokens.md` — sistema de colores de JoseYbarra
- [ ] `readable-ids.md` — API route de GoJulito
- [ ] `afip-invoicing.md` — integración MrBot de DM Cars
- [ ] `formato-ars.md` — utilidades de JoseYbarra
- [ ] `notifications.md` — n8n + Telegram + SMTP de Prestamista

---

## Cómo crear un módulo nuevo

1. Copiar este template:

```markdown
# MÓDULO: [nombre-en-kebab-case]

## Descripción
[Qué resuelve este módulo en 2-3 líneas]

## Stack
- B (Next.js) / D (FastAPI) / Ambos

## Proyectos que lo usan
- [Proyecto] — versión/variante usada

## Cuándo aplicarlo
[Criterios para decidir si usar este módulo]

## Implementación

### Stack B (Next.js)
[código o referencia]

### Stack D (FastAPI)
[código o referencia]

## Variables de entorno requeridas
[si aplica]

## Consideraciones
[gotchas, edge cases, cosas a tener en cuenta]

## Historial de cambios
| Fecha | Cambio | Proyecto origen |
|-------|--------|----------------|
```

2. Guardarlo en `MODULOS/[nombre-modulo].md`
3. Agregarlo a este README en la tabla correspondiente
4. Registrar en `SISTEMA/MEJORAS.md`

---

*Última actualización: 2026-03-28*
