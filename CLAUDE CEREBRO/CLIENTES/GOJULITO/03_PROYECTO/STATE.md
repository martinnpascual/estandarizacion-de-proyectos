# STATE — GoJulito (Julio Correa)

*Última actualización: 2026-03-28 — v1.2 en progreso*

---

## Estado actual

**v1.0 y v1.1 en producción.** v1.2 "Canales y Operación Avanzada" en progreso — Phase 07 completa (2026-03-24). Milestone v1.2 finalizado según GSD STATE. Plataforma de gestión de visas y seminarios de viaje para Julio Correa. Dashboard web + Bot Telegram Alfred.

**Stack:** Next.js 14 (App Router) + TypeScript + Supabase + Tailwind CSS (`gj-*` tokens) + shadcn/ui (manual) + n8n + Telegram
**Repo:** github.com/edubd4/gojulito
**Deploy:** Dokploy (Node 18.18.1)
**También en:** edubd4/EduWorkspace/CLIENTES/GoJulito/

---

## Versiones

| Versión | Estado | Fecha |
|---------|--------|-------|
| v1.0 Core Operativo | ✅ shipped | 2026-03-22 aprox |
| v1.1 Core Hardening | ✅ shipped | 2026-03-22 |
| v1.2 Canales + Operación Avanzada | 🔄 en progreso (Phase 07 completa) | 2026-03-24 |

---

## Módulos v1.2 — estado por fase

| Fase | Módulo | Estado |
|------|--------|--------|
| Phase 04 | Seminarios Core (SEM-01–03) | ✅ completa |
| Phase 05 | Seminarios Asistentes (SEM-04) | ✅ completa |
| Phase 06 | Bot Telegram Alfred (BOT-01–03) | ✅ completa |
| Phase 07 | Calendario + Configuración (CAL-01–02, CFG-01–02) | ✅ completa |
| Phase 08 | Design System Hardening | ⏸ pendiente |

---

## Base de datos — 9+ tablas

| Tabla | Descripción |
|-------|-------------|
| `clientes` | Clientes con grupos familiares y estado de visa |
| `visas` | Tracking de estado de trámites de visa |
| `pagos` | Historial de pagos por cliente |
| `familias` | Grupos familiares vinculados |
| `seminarios` | Seminarios disponibles |
| `inscripciones` | Inscripciones a seminarios |
| `telegram_historial` | Historial de conversaciones del bot Alfred (JSONB) |
| `historial` | Audit trail insert-only |
| `config` | Configuración del sistema |

**IDs legibles:** prefijos por entidad (ej: `CLI-0001`, `VIS-0001`) via función SQL `generate_readable_id`

---

## Bot Telegram Alfred

- **Arquitectura:** n8n workflow + OpenAI + Supabase
- **Endpoints webhook:** `/api/webhooks/alfred` con header `x-api-key`
- **Sesión/memoria:** `telegram_historial` tabla con JSONB context window
- **Funciones:** consulta de estado de visa, pagos pendientes, inscripción a seminarios, respuestas contextuales
- **Workflow:** `Gojulitofiles/agente_gojulito.json` (23KB)

---

## Design system (`gj-*`)

Dark theme con tokens Tailwind `gj-*`:
- Background base: `#0a0f1e`
- Superficie: `#111827`
- Primary: `#6366f1`
- Text principal: `#f9fafb`

**Problema identificado (UI Review 2026-03-24):**
- Score: 16/24 — dual styling system (Tailwind + hardcoded hex)
- 843 valores hex hardcodeados en el código
- Pendiente: unificación en Phase 08

---

## Requerimientos v1.2

| ID | Requerimiento | Estado |
|----|--------------|--------|
| SEM-01 | CRUD seminarios | ✅ |
| SEM-02 | Lista de seminarios | ✅ |
| SEM-03 | Gestión de fechas | ✅ |
| SEM-04 | Gestión de asistentes | ✅ |
| BOT-01 | Bot Telegram Alfred operativo | ✅ |
| BOT-02 | Consulta de estado visa | ✅ |
| BOT-03 | Respuestas contextuales con memoria | ✅ |
| CAL-01 | Vista calendario | ✅ |
| CAL-02 | Eventos en calendario | ✅ |
| CFG-01 | Página de configuración | ✅ |
| CFG-02 | Gestión de usuarios del sistema | ✅ |

---

## Próximos pasos

1. Phase 08: Design System Hardening (resolver 843 hex hardcodeados)
2. v1.3: backlog pendiente de definir con cliente
3. Mejora: unificar sistema de diseño `gj-*` completo

---

## Módulos reutilizables generados

- `bot-telegram-n8n` → Alfred agent pattern (ver MODULOS/bot-telegram-n8n.md)
- `readable-ids` → `generate_readable_id` SQL function
- `audit-historial` → `telegram_historial` con JSONB para contexto de bot
- `dashboard-shell` → con `gj-*` design tokens

*Responsable: Edu (Eduardo Barreiro)*
