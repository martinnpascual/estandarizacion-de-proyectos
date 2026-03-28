# GSD — Get Shit Done: Integración en el Sistema

> GSD (github.com/gsd-build/get-shit-done) es el motor de workflow para todos los proyectos. Este documento explica cómo integrarlo en cada contexto.

---

## Qué hace GSD

GSD previene el "context rot" — la degradación de calidad cuando el contexto de IA se llena. Lo hace con:
- Artifacts separados por propósito (PROJECT, REQUIREMENTS, ROADMAP, STATE)
- Fases definidas de workflow
- 55+ comandos `/gsd:*` para Claude Code
- Commits atómicos por tarea para trazabilidad

---

## Instalación en un proyecto nuevo

```bash
# Desde la raíz del proyecto
npx get-shit-done-cc@latest
```

Esto crea los archivos de configuración de GSD en el proyecto.

**Luego crear manualmente** (o usar `/gsd:new-project`):
```
PROJECT.md       ← contexto, stack, arquitectura, decisiones
REQUIREMENTS.md  ← RF-### requerimientos funcionales
ROADMAP.md       ← milestones y fases con fechas
STATE.md         ← estado actual (se actualiza cada sesión)
```

---

## Uso en CLAUDE CEREBRO (este workspace)

GSD actúa como motor del sistema maestro:

| Comando | Cuándo usarlo |
|---------|--------------|
| `/gsd:new-project` | Al iniciar un cliente nuevo |
| `/gsd:discuss-phase` | Al definir alcance con el cliente |
| `/gsd:plan-phase` | Al diseñar arquitectura |
| `/gsd:execute-phase` | Durante desarrollo |
| `/gsd:verify-work` | Al revisar módulos |
| `/gsd:session-report` | Al comenzar cada sesión |
| `/gsd:progress` | Para ver estado general |
| `/gsd:health` | Para check de salud del workspace |
| `/gsd:map-codebase` | Para mapear estructura |
| `/gsd:complete-milestone` | Al terminar una fase |
| `/gsd:ship` | Al hacer deploy |
| `/gsd:forensics` | Para debug de contexto perdido |

---

## Flujo de sesión estándar con GSD

### Inicio de sesión
```
1. /gsd:session-report           → ¿dónde quedamos?
2. Leer STATE.md del proyecto     → contexto técnico actual
3. Leer ROADMAP.md               → ¿en qué fase estamos?
```

### Durante la sesión
```
4. /gsd:execute-phase            → ejecutar tareas planificadas
5. Commit atómico por cada tarea completada
6. Si surge algo inesperado → /gsd:discuss-phase para re-evaluar
```

### Cierre de sesión
```
7. Actualizar STATE.md           → estado actual para próxima sesión
8. /gsd:session-report           → resumen de lo hecho
9. Si se generó un módulo reutilizable → actualizar MODULOS/ en CEREBRO
```

---

## STATE.md: estructura estándar

```markdown
# STATE — [Nombre Proyecto]
*Última actualización: YYYY-MM-DD*

## Estado actual
[Descripción en 2-3 líneas de dónde está el proyecto]

## Completado
- [x] Feature / módulo terminado (fecha)
- [x] Feature / módulo terminado (fecha)

## En progreso
- [ ] Tarea actual con contexto

## Próximos pasos
1. Siguiente tarea prioritaria
2. ...

## Decisiones tomadas (sesión actual)
- Decisión: [qué] — Razón: [por qué] — Fecha: [fecha]

## Blockers / Pendiente de cliente
- [Si hay algo bloqueado, con fecha]

## Sesión actual
- Sesión #N
- Stack: [Profile X]
- Branch: main / feature/xxx
```

---

## Fases GSD mapeadas a fases de CEREBRO

| Fase CEREBRO | Fase GSD | Artefactos principales |
|-------------|----------|----------------------|
| 0 Prospecto | - | Nota breve en CLIENTES/[NOMBRE]/00_INTAKE.md |
| 1 Intake | discuss | 00_INTAKE.md |
| 2 Propuesta diagnóstico | discuss | 01_PROPUESTA_DIAGNOSTICO.md |
| 3 Diagnóstico | plan | 02_DIAGNOSTICO_COMPLETO.md + PROJECT.md + REQUIREMENTS.md |
| 4 Desarrollo | execute → verify → ship | ROADMAP.md + STATE.md |
| 5 Mejoras | discuss → execute | 04_MEJORAS.md + STATE.md |

---

## Perfiles de modelo GSD

| Perfil | Cuándo usar |
|--------|-----------|
| quality | Diagnósticos, arquitectura, decisiones importantes |
| balanced | Desarrollo normal (default) |
| budget | Tareas mecánicas, actualizaciones de docs |

---

## Commits atómicos: convención

```
feat(modulo): descripción corta

Ejemplos:
feat(auth): add RLS policies for clientes table
fix(payments): correct partial payment calculation
docs(cerebro): update módulo pdf-generator con patrón de WeasyPrint
refactor(crud): extract soft-delete helper a módulo base
```

*Última actualización: 2026-03-28*
