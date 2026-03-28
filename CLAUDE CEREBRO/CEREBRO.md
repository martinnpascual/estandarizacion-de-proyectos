# CLAUDE CEREBRO — Sistema Maestro de Estandarización

> **Propósito:** Repositorio central de metodología, módulos reutilizables y gestión de clientes para los proyectos de Martin Pascual y Edu. Este repositorio NO contiene código ejecutable — es el cerebro operativo que estandariza y mejora cada proyecto.

---

## Qué es esto

CLAUDE CEREBRO es el sistema que conecta todos los proyectos activos bajo una metodología común. Cada vez que se resuelve un problema en un proyecto, se genera un módulo reutilizable aquí. Cada cliente nuevo sigue el mismo ciclo estandarizado. Cada mejora sistémica se registra y propaga.

**No es:** un proyecto con código, un dashboard, un boilerplate.
**Es:** la metodología viva, los módulos documentados, el historial de decisiones y el punto de partida de todo proyecto nuevo.

---

## Estructura

```
CLAUDE CEREBRO/
├── CEREBRO.md              ← estás aquí (índice maestro)
├── CLAUDE.md               ← instrucciones para Claude Code en este workspace
│
├── SISTEMA/                ← metodología, stacks, roles, GSD
│   ├── METODOLOGIA.md      ← ciclo completo de cliente (6 fases)
│   ├── STACKS.md           ← perfiles tecnológicos A/B/C/D
│   ├── ROLES.md            ← Martin, Edu, agentes IA
│   ├── MEJORAS.md          ← log de mejoras cross-proyectos
│   └── GSD_SETUP.md        ← cómo instalar y usar GSD en cada proyecto
│
├── CLIENTES/               ← workspace por cliente
│   ├── _TEMPLATE/          ← plantilla para cliente nuevo (copiar al crear)
│   ├── DM_CARS/            ← CONSECIONARIA.MD (Martin)
│   ├── PRESTAMISTA/        ← APP.PRESTAMISTA (Martin)
│   ├── GOJULITO/           ← gojulito (Edu)
│   ├── JOSE_YBARRA/        ← Finanzas-jy (Edu)
│   └── JAMROCK/            ← Jamrock (Edu)
│
├── MODULOS/                ← biblioteca de módulos reutilizables
│   └── README.md           ← catálogo con estado por proyecto
│
└── DIAGNOSTICOS/           ← diagnósticos estandarizados
    ├── TEMPLATE.md         ← plantilla de diagnóstico
    ├── CHECKLIST.md        ← checklist pre-diagnóstico
    └── ARCHIVO/            ← diagnósticos completados
```

---

## Ciclo de vida de un cliente

```
PROSPECTO → INTAKE → PROPUESTA DIAGNÓSTICO → DIAGNÓSTICO → PROYECTO → MEJORAS
   00           01            02                   03           04          05
```

Cada etapa tiene su template en `CLIENTES/_TEMPLATE/`.
El estado de cada cliente en Notion: [Ver workspace →](notion://)

---

## Proyectos activos

| Cliente | Repo | Stack | Responsable | Estado | Sesión |
|---------|------|-------|-------------|--------|--------|
| DM Cars | martinnpascual/CONSECIONARIA.MD | FastAPI + React + Supabase | Martin | Desarrollo | - |
| Prestamista | martinnpascual/APP.PRESTAMISTA | FastAPI + React + Supabase + n8n | Martin | S-16 activo | session_log.jsonl |
| Julio Correa | edubd4/gojulito | Next.js + Supabase + n8n + Telegram | Edu | Activo | - |
| Jose Ybarra | edubd4/Finanzas-jy | Next.js + Supabase | Edu | Activo | - |
| Jamrock | (privado) | TBD | Edu | - | - |

---

## Módulos identificados (resumen)

Ver catálogo completo en `MODULOS/README.md`

| Módulo | Proyectos que lo usan |
|--------|----------------------|
| auth-supabase | Todos |
| crud-base + RLS | Todos |
| audit-historial | Todos |
| dashboard-shell | DM Cars, Prestamista, GoJulito, JoseYbarra |
| bot-telegram-n8n | Prestamista, GoJulito |
| pdf-generator | DM Cars, Prestamista |
| payments-tracking | Prestamista, GoJulito, JoseYbarra |
| deploy-dokploy | GoJulito, JoseYbarra |
| deploy-docker | DM Cars, Prestamista |

---

## Cómo usar este repositorio

### Al iniciar sesión de trabajo
1. Leer `SISTEMA/METODOLOGIA.md` si es la primera vez
2. Abrir el cliente en `CLIENTES/[NOMBRE]/`
3. Revisar el `STATE.md` del proyecto activo
4. Usar GSD: `/gsd:session-report` para contexto

### Al crear cliente nuevo
1. Copiar `CLIENTES/_TEMPLATE/` → `CLIENTES/[NOMBRE]/`
2. Completar `00_INTAKE.md`
3. Seguir el ciclo de fases en orden

### Al resolver un problema en un proyecto
1. Documentar la solución
2. Evaluar si es un módulo reutilizable
3. Si lo es → actualizar el módulo correspondiente en `MODULOS/`
4. Registrar en `SISTEMA/MEJORAS.md`
5. Evaluar qué otros proyectos se benefician → propagar

### Al terminar un sprint/sesión
1. Actualizar `STATE.md` del proyecto
2. Registrar mejoras en `SISTEMA/MEJORAS.md` si aplica
3. Commit en el repo del proyecto

---

## Relación con EduWorkspace

Este sistema **extiende** `edubd4/EduWorkspace`. EduWorkspace cubre los proyectos de Edu (Next.js). CLAUDE CEREBRO cubre ambos stacks (Martin + Edu) y agrega:
- Stack D (FastAPI + React, de Martin)
- GSD como motor de workflow
- Ciclo completo de cliente documentado
- Diagnósticos estandarizados
- Notion como capa de visibilidad externa

---

*Última actualización: 2026-03-28*
