# 🧠 MASTER OVERVIEW — Sistema de Estandarización de Proyectos

> **Versión:** 1.0 | **Fecha:** 2026-03-28 | **Autor:** MasterBrain / EduWorkspace
> **Propósito:** Carpeta maestra de referencia para la consultoría. Cubre el ciclo completo desde el primer contacto con el cliente hasta la mejora continua del sistema.

---

## ¿QUÉ ES ESTE SISTEMA?

Este sistema es la **espina dorsal operativa** de la consultoría. Centraliza:

- Los procesos de onboarding y diagnóstico de clientes
- Los estándares técnicos para construir proyectos escalables
- Los módulos reutilizables entre proyectos
- Las referencias cruzadas para detectar oportunidades de mejora
- Las guías de decisión de stack tecnológico
- La integración con GSD (Get Shit Done) como metodología de desarrollo

**Principio rector:** Cada proyecto nuevo debe mejorar este sistema. Cada módulo creado debe poder reutilizarse. Cada decisión tomada debe quedar documentada.

---

## CICLO DE VIDA COMPLETO DE UN PROYECTO

```
ETAPA 0: CONTACTO INICIAL
    → Primer contacto, evaluación de fit, firma de NDA/propuesta diagnóstico
    → Archivo: 01_ONBOARDING_CLIENTES/PROCESO_ONBOARDING.md

ETAPA 1: DIAGNÓSTICO
    → Relevamiento técnico, procesos, pain points, oportunidades
    → Entregable: Documento de Diagnóstico Técnico
    → Template: 02_DIAGNOSTICOS/_TEMPLATE_DIAGNOSTICO.md

ETAPA 2: PROPUESTA DE PROYECTO
    → Definición de scope, stack, estimación, fases, equipo
    → Entregable: Propuesta formal con presupuesto
    → Template: 01_ONBOARDING_CLIENTES/_TEMPLATES/04_PROPUESTA_PROYECTO.md

ETAPA 3: KICKOFF + SETUP INICIAL
    → Creación de repo GitHub, proyecto Supabase, workspace GSD
    → Entregable: Entorno funcional listo para desarrollo
    → Guía: 03_ARQUITECTURA_TECH/ + 05_PROCESOS/GSD_INTEGRATION.md

ETAPA 4: DESARROLLO (con GSD)
    → Ciclos: Discuss → Plan → Execute → Verify → Ship
    → Módulos reutilizados desde 04_MODULOS/
    → Estándares aplicados desde 03, 06, 07

ETAPA 5: ENTREGA + DOCUMENTACIÓN
    → Runbook, arquitectura, guía de usuario
    → Deploy final en Vercel/Railway/Supabase

ETAPA 6: MEJORA CONTINUA
    → Learnings actualizados en este sistema
    → Módulos mejorados propagados al resto de proyectos
    → Claude automatizado detecta actualizaciones posibles
```

---

## MAPA DE LA CARPETA

| Carpeta | Propósito |
|---------|-----------|
| `00_SISTEMA/` | Este archivo + árbol de decisión de stack + guía de auto-mejora |
| `01_ONBOARDING_CLIENTES/` | Proceso y templates para cada etapa con el cliente |
| `02_DIAGNOSTICOS/` | Template de diagnóstico + diagnósticos de proyectos existentes |
| `03_ARQUITECTURA_TECH/` | Estándares de arquitectura por stack (Next.js/FastAPI) + Supabase + GitHub + n8n |
| `04_MODULOS/` | Módulos reutilizables: Auth/RBAC, Notificaciones, PDF, Dashboard |
| `05_PROCESOS/` | GSD, commits, code review, deploy, mejoras cross-project |
| `06_UX_UI/` | Design system, patrones UX, componentes comunes |
| `07_APIS/` | Estándares REST, naming, error handling |
| `08_REFERENCIAS/` | Mapa de proyectos activos, módulos por proyecto, mejoras pendientes |

---

## RELACIÓN CON CLAUDE CEREBRO

**Este sistema extiende `CLAUDE CEREBRO/`** (la carpeta raíz del workspace).

| Sistema | Rol | Dónde vivir |
|---------|-----|------------|
| `CLAUDE CEREBRO/` | **Base:** metodología, cliente workspace, catálogo de módulos, GSD | Aquí mismo — la fuente de verdad |
| `00_SISTEMA/` (este) | **Extensión:** overview + árbol de decisión detallado | Complementa CEREBRO |
| `01_ONBOARDING_CLIENTES/` | **Templates detallados:** formularios y docs de cliente | Complementa CEREBRO/CLIENTES/_TEMPLATE/ |
| `02_DIAGNOSTICOS/` | **Diagnósticos por proyecto:** análisis de repos existentes | Complementa CEREBRO/DIAGNOSTICOS/ |
| `03_ARQUITECTURA_TECH/` | **Guías técnicas:** código, estructura, setup completo por stack | Extiende CEREBRO/SISTEMA/STACKS.md |
| `04_MODULOS/` | **Implementación detallada:** código de módulos con ejemplos | Extiende CEREBRO/MODULOS/ |
| `05_PROCESOS/` | **Procesos de dev:** GSD, commits, mejoras cross-project | Complementa CEREBRO/SISTEMA/ |
| `06_UX_UI/` | **Design system:** componentes, colores, patrones | Nuevo |
| `07_APIS/` | **Estándares REST:** naming, respuestas, seguridad | Nuevo |
| `08_REFERENCIAS/` | **Mapa vivo:** proyectos activos, módulos, mejoras pendientes | Complementa CEREBRO/SISTEMA/MEJORAS.md |

**Regla:** Para contexto de negocio y workflow → usar CLAUDE CEREBRO. Para implementación técnica → usar estas carpetas.

---

## PROYECTOS ACTIVOS

| Proyecto | Stack | Responsable | Estado | Repo |
|----------|-------|-------------|--------|------|
| GoJulito | B (Next.js + Supabase + n8n) | Edu | v1.2 activo | github.com/edubd4/gojulito |
| APP.PRESTAMISTA | D (FastAPI + React + Supabase + n8n) | Martin | Producción | github.com/martinnpascual/APP.PRESTAMISTA |
| DM Cars | D (FastAPI + React + Supabase + AFIP) | Martin | Producción | github.com/martinnpascual/CONSECIONARIA.MD |
| Finanzas-JY | B (Next.js + Supabase) | Edu | En desarrollo | github.com/edubd4/Finanzas-jy |
| Jamrock | B/TBD | Edu | - | (privado) |

---

## REGLA DE ORO: ACTUALIZACIÓN DEL SISTEMA

Cada vez que se complete un proyecto o un módulo nuevo, se debe:

1. Actualizar `08_REFERENCIAS/MAPA_PROYECTOS.md` con el estado actual
2. Actualizar `08_REFERENCIAS/MODULOS_POR_PROYECTO.md` si se creó/mejoró un módulo
3. Si el módulo es reutilizable → moverlo a `04_MODULOS/` con su documentación
4. Registrar learnings técnicos en la carpeta de arquitectura correspondiente
5. Disparar el proceso de auto-mejora (ver `00_SISTEMA/AUTO_MEJORA_CLAUDE.md`)

---

## DECISIÓN RÁPIDA DE STACK

```
¿Es un sistema financiero, de préstamos, o con lógica de cálculo compleja?
  → FastAPI + React + Supabase (ver 03_ARQUITECTURA_TECH/FASTAPI_REACT_SUPABASE_STANDARD.md)

¿Es un sistema de gestión operativa, CRM, agenda, viajes, o panel de control?
  → Next.js 14 + Supabase (ver 03_ARQUITECTURA_TECH/NEXTJS_SUPABASE_STANDARD.md)

¿Requiere automatizaciones, notificaciones, bots o integraciones externas?
  → Agregar n8n en ambos casos (ver 03_ARQUITECTURA_TECH/N8N_INTEGRATION_GUIDE.md)
```

Para el árbol completo → `00_SISTEMA/STACK_DECISION_TREE.md`

---

*Este documento es el punto de entrada al sistema. Actualizar con cada evolución.*
