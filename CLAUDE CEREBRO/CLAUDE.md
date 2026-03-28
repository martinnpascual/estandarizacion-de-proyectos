# CLAUDE.md — CLAUDE CEREBRO

Este es el workspace maestro de estandarización. NO contiene código ejecutable.

## Qué hace este repositorio

- Metodología y ciclo de vida de clientes
- Biblioteca de módulos reutilizables
- Diagnósticos estandarizados
- Fuente de verdad para decisiones de arquitectura

## Reglas en este workspace

1. **Solo markdown** — no crear archivos de código aquí
2. **Actualizar siempre MEJORAS.md** cuando se resuelva algo en un proyecto
3. **Propagar módulos** — si algo es reutilizable, documentarlo en `MODULOS/`
4. **Mantener STATE.md actualizado** por cliente
5. **Fechas absolutas** — nunca "la semana pasada", siempre "2026-03-28"

## Cómo trabajar aquí con GSD

```bash
# Instalar GSD en este workspace (una sola vez)
npx get-shit-done-cc@latest

# Comandos útiles
/gsd:health          # estado del workspace
/gsd:progress        # progreso de tareas activas
/gsd:session-report  # resumen de sesión
/gsd:map-codebase    # mapa de estructura
```

## Agentes disponibles en este contexto

Cuando se trabaja en documentación de un cliente específico, el agente debe:
1. Leer `CLIENTES/[NOMBRE]/STATE.md` primero
2. Leer el módulo correspondiente en `MODULOS/` si aplica
3. Nunca modificar otros proyectos sin leer su CLAUDE.md

## Convenciones de nombres

- Carpetas de clientes: `NOMBRE_APELLIDO/` o `NOMBRE_EMPRESA/` en mayúsculas
- Módulos: `nombre-en-kebab-case.md`
- Diagnósticos archivados: `YYYYMMDD_NOMBRE.md`

## Stack de referencia rápida

| Profile | Stack | Responsable |
|---------|-------|-------------|
| A | Google Sheets + n8n + Telegram + Claude API | Edu |
| B | Next.js 14 + Supabase + Tailwind + Dokploy | Edu |
| C | Híbrido A→B | Edu |
| D | FastAPI + React 18 + Supabase + Docker | Martin |

Ver detalle completo en `SISTEMA/STACKS.md`
