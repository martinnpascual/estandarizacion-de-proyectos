# STATE — Finanzas-jy (Jose Ybarra)

*Última actualización: 2026-03-28 — Phase 1 ~75% — Deploy pendiente*

---

## Estado actual

**Phase 1 código completo (~75%).** Todos los módulos de Phase 1 implementados y code-complete. Pendiente: configurar `SERVICE_ROLE_KEY` en Dokploy + deploy + QA de aceptación. GSD state: Phase 01-02-PLAN.md (QA) es el próximo paso.

**Stack:** Next.js 14 (App Router) + TypeScript strict + Supabase + Tailwind CSS (`jy-*`) + Radix UI + Zod + Fraunces + DM Sans
**Repo:** github.com/edubd4/Finanzas-jy
**Deploy:** Dokploy (Node 20 Alpine, `output: standalone`)
**También en:** edubd4/EduWorkspace/CLIENTES/JoseYbarra/

---

## Modules — Phase 1 estado

| ID | Módulo | Estado |
|----|--------|--------|
| AUTH | Autenticación + protección de rutas | ✅ code-complete |
| DASH | Dashboard resumen financiero | ✅ code-complete |
| MOV | Registro de movimientos (4 tipos) | ✅ code-complete |
| HIST | Historial con filtros | ✅ code-complete |
| VIEW | Vistas por tipo (ingresos/gastos/inversiones) | ✅ code-complete |
| CONF | Configuración de cuenta | ✅ code-complete |
| DEPL | Deploy a Dokploy | ⏳ pendiente |

---

## Requerimientos Phase 1

| ID | Requerimiento | Estado |
|----|--------------|--------|
| RF-101–104 | Auth (login, logout, session, redirect) | ✅ |
| RF-201–205 | Dashboard (resumen, 4 categorías, totales, gráficos) | ✅ |
| RF-301–307 | Registro de movimientos (CRUD, validación Zod) | ✅ |
| RF-401–406 | Historial (lista, filtros, búsqueda, paginación) | ✅ |
| RF-501–503 | Vistas por tipo | ✅ |
| RF-601–603 | Configuración | ✅ |
| RF-701–703 | Deploy (Dokploy, Docker, env vars) | ⏳ pendiente |
| RNF-01–04 | Soft delete, audit trail, RLS, env vars | ✅ |

---

## Base de datos

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Usuario único (Jose Ybarra) |
| `movimientos` | Transacciones con tipo, monto, fecha, descripción |
| `historial` | Audit trail insert-only con soft delete (`deleted_at`) |
| `config` | Configuración del usuario |

**ENUM `TIPO_MOVIMIENTO`:** ingreso, compromiso_fijo, gasto_variable, inversion

---

## Design system (`jy-*`)

| Token | Color | Uso |
|-------|-------|-----|
| `jy-bg` | `#0d1b2a` | Background base |
| `jy-surface` | `#112240` | Tarjetas/paneles |
| Ingreso | `#10b981` (verde) | Transacciones de ingreso |
| Compromiso fijo | `#f59e0b` (amarillo) | Gastos fijos |
| Gasto variable | `#ef4444` (rojo) | Gastos variables |
| Inversión | `#6366f1` (violeta) | Inversiones |

**Tipografía:** Fraunces (display/títulos) + DM Sans (body)
**Formato ARS:** sin decimales, localización española (`es-AR`)

---

## Tres clientes Supabase (patrón crítico)

```typescript
// browser — solo auth, Client Components
// server  — RLS-aware, Server Components + API Routes
// admin   — service role, SOLO API Routes (nunca cliente)
```

**Bug conocido (registrado en EduWorkspace MODULOS):** verificar nombre columna ownership antes de deploy — causó crash en CRUD de GoJulito.

---

## Decisiones de arquitectura

| Decisión | Razón | Fecha |
|---------|-------|-------|
| `node:20-alpine` en Dockerfile | Node 18 incompatible con shadcn CLI | 2026-03-26 |
| `output: standalone` en next.config.mjs | Requerido por Dokploy | 2026-03-26 |
| NEXT_PUBLIC_* como build ARGs Docker | Variables públicas necesarias en build time | 2026-03-26 |
| Seed data con OR pattern | Evita duplicados en re-runs | 2026-03-26 |

---

## Próximos pasos

1. Configurar `SUPABASE_SERVICE_ROLE_KEY` en Dokploy (no exponer como NEXT_PUBLIC_)
2. `npm run build` local para verificar antes del deploy
3. Deploy a Dokploy
4. QA de aceptación (01-02-PLAN.md)
5. Definir Phase 2: Préstamos + mejoras UX

---

## Phase 2 — Backlog (RF-LOAN-01–05)

- Módulo de préstamos personales
- Tracking de cuotas
- Alertas de vencimiento
- Estadísticas de deuda

---

## Módulos reutilizables generados

- `design-tokens` → sistema `jy-*` (patrón para crear tokens por cliente)
- `formato-ars` → utilidad de formateo ARS sin decimales
- `auth-supabase` Stack B → 3 clientes Supabase (browser/server/admin)
- `deploy-dokploy` → Dockerfile + output:standalone + build ARGs

*Responsable: Edu (Eduardo Barreiro)*
*Intake: 2026-03-26*
