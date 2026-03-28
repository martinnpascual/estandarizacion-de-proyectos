# 🔄 MEJORAS CROSS-PROJECT

> **Versión:** 1.0 | **Fecha:** 2026-03-28
> Proceso para propagar mejoras entre proyectos del portfolio.

---

## CONCEPTO

Cuando un problema se resuelve en un proyecto, o cuando se crea un patrón mejor, otros proyectos del portfolio que tienen el mismo problema deben beneficiarse de ese aprendizaje.

**Regla:** Un bug resuelto una vez no debería aparecer en otro proyecto.

---

## PROCESO DE PROPAGACIÓN

### Paso 1: Identificar la mejora

Cuando se resuelve algo relevante, registrarlo:

```
¿La mejora afecta a más de un proyecto?
  ├─ SÍ → Registrar en 08_REFERENCIAS/MEJORAS_PENDIENTES.md
  └─ NO → Solo documentar en el diagnóstico del proyecto
```

### Paso 2: Categorizar la mejora

| Categoría | Qué actualizar |
|-----------|----------------|
| Patrón de código nuevo | `03_ARQUITECTURA_TECH/` o `07_APIS/` |
| Módulo mejorado | `04_MODULOS/[modulo]/README.md` |
| Bug de seguridad | URGENTE → todos los proyectos afectados |
| Mejora de UX | `06_UX_UI/` |
| Proceso nuevo | `05_PROCESOS/` |

### Paso 3: Aplicar en proyectos afectados

Al trabajar en cada proyecto, revisar `08_REFERENCIAS/MEJORAS_PENDIENTES.md` y aplicar las pendientes para ese proyecto.

---

## MEJORAS DETECTADAS ACTUALMENTE

### 🔴 URGENTES

| ID | Mejora | Detectada en | Aplica a | Estado |
|----|--------|-------------|----------|--------|
| M001 | Verificar que service_role_key NO está expuesta al frontend | APP.PRESTAMISTA | DM Cars, GoJulito (verificar) | ⏳ Pendiente |

### 🟡 IMPORTANTES

| ID | Mejora | Detectada en | Aplica a | Estado |
|----|--------|-------------|----------|--------|
| M002 | Agregar RUNBOOK.md + architecture.md en /docs/ | APP.PRESTAMISTA | GoJulito, DM Cars, Finanzas-JY | ⏳ Pendiente |
| M003 | Audit logging inmutable (INSERT-only) | GoJulito | APP.PRESTAMISTA, DM Cars (verificar) | ⏳ Pendiente |
| M004 | Integrar n8n para alertas automáticas | APP.PRESTAMISTA | DM Cars | ⏳ Pendiente |
| M005 | Exportar workflows n8n como JSON al repo | APP.PRESTAMISTA, GoJulito | Ambos | ⏳ Pendiente |

### 🟢 MEJORAS DESEABLES

| ID | Mejora | Detectada en | Aplica a | Estado |
|----|--------|-------------|----------|--------|
| M006 | Tokens CSS personalizados por proyecto | GoJulito (gj-*) | Finanzas-JY | ⏳ Pendiente |
| M007 | Tags de versión en Git al completar cada fase | APP.PRESTAMISTA | Todos | ⏳ Pendiente |
| M008 | Dashboard KPIs avanzado | GoJulito (pendiente) | Todos | ⏳ Pendiente |

---

## MEJORAS YA PROPAGADAS ✅

| ID | Mejora | Origen | Propagada a | Fecha |
|----|--------|--------|------------|-------|
| - | Patrón `{ data, error }` | Supabase SDK | Documentado en 07_APIS/ | 2026-03-28 |
| - | Soft delete estándar | Todos | Documentado en 03_ARQUITECTURA_TECH/ | 2026-03-28 |
| - | GSD desde el kickoff | GoJulito | Finanzas-JY (ya lo usa) | 2026-03-28 |

---

## TEMPLATE PARA REGISTRAR UNA MEJORA

```markdown
### M[XXX]: [Nombre descriptivo de la mejora]

**Detectada en:** [Proyecto]
**Fecha:** DD/MM/AAAA
**Categoría:** [Seguridad / Patrón / UX / Proceso / Bug]
**Descripción:**
[Qué se mejoró y por qué es relevante para otros proyectos]

**Solución aplicada:**
```[código o descripción de la solución]```

**Proyectos afectados:**
- [Proyecto A] — Estado: [Pendiente / En progreso / Aplicado]
- [Proyecto B] — Estado: [Pendiente / En progreso / Aplicado]

**Prioridad:** [Urgente / Importante / Deseable]
```

---
*Proceso v1.0 — Actualizar cuando se detecten o resuelvan mejoras*
