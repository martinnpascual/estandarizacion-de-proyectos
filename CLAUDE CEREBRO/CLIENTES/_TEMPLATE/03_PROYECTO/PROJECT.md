# PROJECT — [Nombre del Proyecto]

> Contexto técnico permanente del proyecto. No es el estado (eso es STATE.md). Es la arquitectura, las decisiones y el stack. Se actualiza cuando hay decisiones de arquitectura, no en cada sesión.

---

## Resumen

**Cliente:** [Nombre]
**Proyecto:** [Nombre del proyecto / app]
**Responsable:** Martin / Edu
**Stack:** Perfil X — [descripción breve]
**Repo:** github.com/[owner]/[repo]
**Deploy:** [URL de producción]
**Inicio:** YYYY-MM-DD
**Estado:** en desarrollo / en producción / pausado

---

## Descripción

[Qué hace el sistema en 3-5 oraciones. Para qué sirve. Quién lo usa.]

---

## Stack técnico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| | | |

---

## Arquitectura

### Base de datos (Supabase)

**Tablas principales:**

| Tabla | Descripción | RLS |
|-------|-------------|-----|
| | | ✓/✗ |

**Relaciones clave:**
- `tabla_a` → `tabla_b` (FK: campo)

**Convenciones:**
- Soft delete: campo `deleted_at TIMESTAMPTZ`
- Audit trail: tabla `historial` (insert-only)
- IDs: UUID por defecto

### Roles y permisos

| Rol | Permisos |
|-----|---------|
| | |

### Integraciones externas

| Servicio | Para qué | Credencial en .env |
|----------|----------|-------------------|
| | | |

---

## Módulos aplicados

> De CLAUDE CEREBRO/MODULOS/ — versión aplicada en este proyecto

| Módulo | Versión/fecha aplicada | Adaptaciones |
|--------|----------------------|-------------|
| auth-supabase | | |
| crud-base | | |
| | | |

---

## Decisiones de arquitectura

> Registrar decisiones importantes con fecha y justificación. Esto evita re-debatir lo ya decidido.

### [YYYY-MM-DD] — [Título de la decisión]
**Decisión:** qué se decidió
**Alternativas consideradas:** qué más se evaluó
**Razón:** por qué se eligió esta opción
**Consecuencias:** qué implica a futuro

---

## Variables de entorno requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# [Otras según el proyecto]
```

---

## Comandos del proyecto

```bash
# Desarrollo
[comando de dev]

# Build
[comando de build]

# Deploy
[proceso de deploy]
```

---

*Última actualización: YYYY-MM-DD*
