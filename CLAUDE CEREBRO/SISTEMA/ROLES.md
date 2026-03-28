# ROLES — Equipo y Agentes IA

---

## Equipo humano

### Martin Pascual
- **GitHub:** github.com/martinnpascual
- **Especialidad:** Stack D (FastAPI + React + Supabase + Docker)
- **Proyectos:** DM Cars, APP.PRESTAMISTA
- **Responsabilidades:** Backend Python, Docker, integraciones complejas, deploy Railway/Render/Vercel
- **Nota:** Contexto argentino (ARCA/AFIP, ARS)

### Edu
- **GitHub:** github.com/edubd4
- **Especialidad:** Stack B/C (Next.js + Supabase) y Stack A (automatización)
- **Proyectos:** GoJulito, Finanzas-jy, Jamrock, EduWorkspace
- **Responsabilidades:** Frontend Next.js, automatización n8n, metodología, EduWorkspace
- **Nota:** Propietario de EduWorkspace (metodología base)

---

## Agentes IA por contexto

### Agente CEREBRO (este workspace)
**Rol:** Arquitecto y coordinador del sistema maestro
**Acciones típicas:**
- Diseñar estructura de nuevos proyectos
- Actualizar módulos con aprendizajes
- Estandarizar diagnósticos
- Propagar mejoras entre proyectos
- Mantener MEJORAS.md actualizado

### Agentes por Stack D (proyectos Martin — FastAPI/React)

| Agente | Responsabilidad |
|--------|----------------|
| DB Architect | Schema Supabase, migraciones SQL, RLS policies |
| Auth Agent | JWT, roles, permisos Supabase Auth |
| Backend Agent | Routers FastAPI, servicios, Pydantic models |
| Frontend Agent | Componentes React, Zustand, llamadas API |
| PDF Agent | WeasyPrint, Jinja2 templates |
| n8n Agent | Workflows de automatización, Telegram bot |
| QA Agent | Tests, validaciones, revisión de seguridad |
| Deploy Agent | Docker Compose, variables de entorno, Dokploy/Railway |

### Agentes por Stack B (proyectos Edu — Next.js)

| Agente | Responsabilidad |
|--------|----------------|
| DB Architect | Schema Supabase, migraciones SQL, RLS policies |
| Auth Agent | Supabase Auth, middleware.ts, session handling |
| Frontend Agent | Server Components, Client Components, shadcn/ui |
| API Agent | API Routes Next.js, validación Zod |
| n8n Agent | Workflows, Telegram bot |
| Deploy Agent | Dockerfile, Dokploy, variables de entorno |

---

## Reglas de colaboración entre Martin y Edu

1. **Módulos documentados aquí** son la referencia compartida — antes de implementar algo, revisar si ya existe
2. **Cuando Martin resuelve algo en Stack D** que tiene equivalente en Stack B → Edu lo adapta (o viceversa)
3. **Diagnósticos** — cualquiera puede hacerlos; usar siempre `DIAGNOSTICOS/TEMPLATE.md`
4. **Notion** — ambos pueden actualizar el estado de los proyectos
5. **Conflictos de arquitectura** → documentar la decisión en el PROJECT.md del proyecto afectado con fecha y justificación

---

## Matriz de responsabilidades

| Tarea | Martin | Edu | Ambos |
|-------|--------|-----|-------|
| Proyectos Stack D | ✓ | | |
| Proyectos Stack B/C | | ✓ | |
| Automatizaciones n8n | | ✓ | |
| Diagnósticos nuevos | | | ✓ |
| Actualizar MODULOS/ | | | ✓ |
| Actualizar MEJORAS.md | | | ✓ |
| Notion tracking | | | ✓ |
| EduWorkspace | | ✓ | |
| CLAUDE CEREBRO | | | ✓ |

*Última actualización: 2026-03-28*
