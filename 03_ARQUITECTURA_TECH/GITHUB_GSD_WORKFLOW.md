# 🔧 GITHUB + GSD — WORKFLOW ESTÁNDAR

> **Versión:** 1.0 | **Fecha:** 2026-03-28
> **Metodología:** GSD (Get Shit Done) — github.com/gsd-build/get-shit-done

---

## ESTRUCTURA DE REPOSITORIO GSD

Todo proyecto nuevo debe tener esta estructura desde el día 1:

```
[proyecto]/
├── .planning/
│   ├── PROJECT.md        ← Visión del proyecto (siempre cargado)
│   ├── REQUIREMENTS.md   ← Features v1/v2 con scope definido
│   ├── ROADMAP.md        ← Fases con progreso
│   ├── STATE.md          ← Decisiones y blockers (memoria cross-session)
│   └── PLAN.md           ← Tareas atómicas XML con pasos de verificación
└── CLAUDE.md             ← Contexto para Claude en la raíz
```

---

## FLUJO DE TRABAJO GSD (6 FASES)

### Fase 1: Inicializar Proyecto (`/gsd:new-project`)
- Preguntas → Investigación → Requisitos → Creación del roadmap
- **Output:** `.planning/PROJECT.md` + `REQUIREMENTS.md` + `ROADMAP.md`

### Fase 2: Discutir (`/gsd:discuss-phase`)
- Resolver ambigüedades antes de planear: layout, diseño API, tono UI
- **Output:** Decisiones documentadas en `STATE.md`

### Fase 3: Planear (`/gsd:plan-phase`)
- Agentes de investigación paralelos → planificación de tareas → loops de verificación
- **Output:** `PLAN.md` con tareas atómicas en formato XML

### Fase 4: Ejecutar (`/gsd:execute-phase`)
- Ejecución en waves (paralela para independientes, secuencial para dependientes)
- Contexto fresco de 200k tokens por tarea
- Commits atómicos por cada tarea completada

### Fase 5: Verificar (`/gsd:verify-work`)
- UAT manual por el usuario
- Diagnóstico automático de fallos

### Fase 6: Ship (`/gsd:ship`)
- PR, merge, loop a siguiente fase

---

## TEMPLATES DE ARCHIVOS GSD

### PROJECT.md

```markdown
# [Nombre del Proyecto]

## Visión
[Una oración: qué hace este sistema y para quién]

## Problema que resuelve
[El pain point central]

## Usuarios
- Admin: [qué puede hacer]
- [Rol 2]: [qué puede hacer]

## Stack
- [Stack tecnológico elegido]

## Restricciones importantes
- [Restricción 1]
- [Restricción 2]

## Fuera de scope (v1)
- [Lo que NO se va a hacer en v1]
```

### REQUIREMENTS.md

```markdown
# Requerimientos — [Nombre Proyecto]

## v1.0 — MVP (EN SCOPE)

### Módulo: Auth
- [ ] REQ-001: Login con email/password via Supabase
- [ ] REQ-002: Roles: Admin y [Rol 2]
- [ ] REQ-003: Protección de rutas por rol

### Módulo: [Módulo Core]
- [ ] REQ-010: [Descripción]
- [ ] REQ-011: [Descripción]

## v2.0 — Deferred
- [ ] REQ-100: [Feature postergada]
```

### ROADMAP.md

```markdown
# Roadmap — [Nombre Proyecto]

## Fase 01: Setup + Auth [COMPLETADA ✅]
- Setup inicial
- Auth con Supabase
- Layout base

## Fase 02: [Módulo Core] [EN PROGRESO 🔄]
- [ ] CRUD completo
- [ ] Validaciones

## Fase 03: [Siguiente módulo] [PENDIENTE ⏳]
```

### STATE.md

```markdown
# Estado del Proyecto — [Nombre Proyecto]

## Última actualización: [FECHA]
## Fase actual: [Número y nombre]

## Decisiones tomadas
| Decisión | Razón | Fecha |
|----------|-------|-------|
| Usar [X] en lugar de [Y] | [Razón] | |

## Blockers activos
| Blocker | Impacto | Plan de resolución |
|---------|---------|-------------------|
| | | |

## Deuda técnica conocida
| Item | Prioridad |
|------|-----------|
| | |

## Contexto importante para Claude
- [Algo que Claude necesita saber para trabajar bien en este proyecto]
```

---

## BRANCH STRATEGY ESTÁNDAR

```
main          ← Producción. Solo merge desde develop tras review
develop       ← Integración. Siempre debe buildear sin errores
feature/[x]   ← Una feature por branch. Merge a develop.
fix/[x]       ← Bug fixes. Merge a develop (urgentes a main)
```

**Ejemplo:**
```
feature/auth-login
feature/clientes-crud
fix/login-redirect-bug
```

---

## COMMIT CONVENTION ESTÁNDAR

Formato: `tipo(scope): descripción corta`

| Tipo | Cuándo usar |
|------|-------------|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `refactor` | Refactoring sin cambio de comportamiento |
| `docs` | Solo documentación |
| `style` | Formatting, sin cambio de lógica |
| `test` | Tests |
| `chore` | Setup, dependencias, CI/CD |
| `db` | Migraciones de base de datos |

**Ejemplos:**
```
feat(auth): agregar login con email y password
feat(clientes): CRUD completo con soft delete
fix(pagos): corregir cálculo de interés mensual
db(clientes): agregar tabla clientes con RLS
chore: setup inicial Next.js + Supabase
docs(api): documentar endpoints de préstamos
```

---

## CHECKLIST DE INICIO DE SESIÓN CON CLAUDE

Antes de cada sesión de desarrollo, asegurarse que Claude tiene contexto:

```
1. Lee .planning/PROJECT.md
2. Lee .planning/STATE.md
3. Lee CLAUDE.md
4. Confirma la fase actual del ROADMAP.md
5. Revisa si hay blockers en STATE.md
```

---

## REGLAS DE CALIDAD EN GIT

- [ ] Nunca commitear `.env` o archivos con credenciales
- [ ] Nunca commitear `node_modules/` o `__pycache__/`
- [ ] Cada commit debe buildear sin errores
- [ ] Mensajes de commit en español o inglés (elegir uno y ser consistente)
- [ ] Al terminar una fase, crear un tag: `v1.0`, `v1.1`, etc.

---
*Estándar v1.0 — Basado en GoJulito y APP.PRESTAMISTA con GSD*
