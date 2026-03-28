# REQUIREMENTS — [Nombre del Proyecto]

> Requerimientos funcionales del sistema. Cada RF tiene un ID único. No se modifica la descripción original — si cambia, se agrega RF nuevo marcando el anterior como reemplazado.

---

## Módulos del sistema

| ID | Módulo | Estado |
|----|--------|--------|
| M01 | [Nombre del módulo] | pendiente / en desarrollo / completado |

---

## Requerimientos funcionales

### M01 — [Nombre del módulo]

#### RF-001 — [Título corto]
**Descripción:** [Qué debe hacer el sistema]
**Actor:** [Quién lo usa]
**Prioridad:** Alta / Media / Baja
**Estado:** pendiente / en desarrollo / completado
**Notas:** [Restricciones, edge cases, dependencias]

#### RF-002 — [Título corto]
**Descripción:**
**Actor:**
**Prioridad:**
**Estado:**
**Notas:**

---

## Requerimientos no funcionales

| ID | Requerimiento | Criterio de aceptación |
|----|--------------|----------------------|
| RNF-001 | Soft delete en todas las tablas | Nunca ejecutar DELETE en producción |
| RNF-002 | Audit trail inmutable | Tabla historial insert-only |
| RNF-003 | RLS en Supabase | Toda tabla tiene policy activa |
| RNF-004 | Variables de entorno | Ninguna credential en código |

---

## Fuera de alcance (explícito)

> Esto NO se construye en este proyecto (aunque el cliente lo mencione).

- [Item fuera de alcance]

---

*Última actualización: YYYY-MM-DD*
