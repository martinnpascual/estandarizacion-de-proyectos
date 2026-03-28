# METODOLOGÍA — Ciclo de Vida del Cliente

> Extiende `edubd4/EduWorkspace/SISTEMA/METODOLOGIA.md` para cubrir ambos stacks (Martin + Edu) y el ciclo completo desde primer contacto hasta mejoras continuas.

---

## Las 6 Fases

```
FASE 0        FASE 1        FASE 2              FASE 3             FASE 4         FASE 5
PROSPECTO  →  INTAKE  →  PROP. DIAGNÓSTICO  →  DIAGNÓSTICO  →  DESARROLLO  →  MEJORAS
```

Ninguna fase puede saltarse. Cada fase tiene un entregable concreto.

---

## FASE 0 — PROSPECTO

**Cuándo:** Primer contacto, antes de comprometerse a nada.

**Objetivo:** Decidir si el cliente es viable (técnica y comercialmente).

**Acciones:**
- Llamada/reunión inicial (30-45 min máx)
- Identificar stack adecuado (A/B/C/D)
- Evaluar complejidad estimada
- Decidir: ¿avanzamos a Intake?

**Entregable:** Decisión binaria (avanzar / no avanzar) + nota breve.

**Criterios de rechazo:**
- Requiere tecnologías fuera del stack estándar sin justificación clara
- Presupuesto incompatible con el esfuerzo estimado
- Cliente no tiene claridad mínima sobre lo que necesita

---

## FASE 1 — INTAKE

**Cuándo:** Cliente aprobado para continuar.

**Objetivo:** Capturar toda la información del negocio necesaria para el diagnóstico.

**Plantilla:** `CLIENTES/_TEMPLATE/00_INTAKE.md`

**Datos a capturar:**
- Nombre del negocio, rubro, tamaño
- Contacto principal y forma de comunicación preferida
- Procesos actuales (cómo lo hacen hoy)
- Dolores principales (qué no funciona)
- Herramientas actuales (Excel, WhatsApp, papel, etc.)
- Usuarios del sistema y sus roles
- Presupuesto aproximado y urgencia
- Fecha primer contacto

**Entregable:** `00_INTAKE.md` completo y firmado.

**Duración típica:** 1-2 reuniones de 1 hora.

---

## FASE 2 — PROPUESTA DE DIAGNÓSTICO

**Cuándo:** Intake completo.

**Objetivo:** Presentar al cliente un documento que describe qué se va a diagnosticar, cómo y cuánto cuesta el diagnóstico.

**Plantilla:** `CLIENTES/_TEMPLATE/01_PROPUESTA_DIAGNOSTICO.md`

**Incluye:**
- Resumen de lo entendido (devolver lo que dijeron)
- Alcance del diagnóstico
- Metodología del diagnóstico
- Entregables del diagnóstico
- Costo y tiempo del diagnóstico
- Próximos pasos si se aprueba

**Entregable:** Documento PDF/Notion presentado al cliente + aprobación.

**IMPORTANTE:** El diagnóstico se cobra. No es gratis.

---

## FASE 3 — DIAGNÓSTICO COMPLETO

**Cuándo:** Propuesta de diagnóstico aprobada y pagada.

**Objetivo:** Entender profundamente el negocio y generar el plan técnico + propuesta de proyecto.

**Plantilla:** `CLIENTES/_TEMPLATE/02_DIAGNOSTICO_COMPLETO.md`
**Template de diagnóstico:** `DIAGNOSTICOS/TEMPLATE.md`

**Incluye:**
- Análisis de procesos actuales (AS-IS)
- Mapa de entidades de datos
- Roles de usuario identificados
- Integraciones necesarias
- Stack recomendado y justificación
- Módulos aplicables del catálogo
- Propuesta de proyecto (alcance, fases, costos, tiempos)
- Riesgos identificados

**Entregable:** Documento de diagnóstico + propuesta de proyecto.

**Duración típica:** 1-2 semanas según complejidad.

---

## FASE 4 — DESARROLLO

**Cuándo:** Diagnóstico aprobado y proyecto iniciado.

**Objetivo:** Ejecutar el proyecto con la metodología GSD.

**Estructura de archivos del proyecto:**
```
CLIENTES/[NOMBRE]/03_PROYECTO/
├── PROJECT.md        ← contexto, stack, decisiones de arquitectura
├── REQUIREMENTS.md   ← RF-### requerimientos funcionales
├── ROADMAP.md        ← milestones y fases
└── STATE.md          ← estado actual (fuente de verdad de sesión a sesión)
```

**Workflow GSD por sesión:**
1. Leer `STATE.md` para retomar contexto
2. `/gsd:session-report` para ver dónde quedamos
3. Ejecutar tareas del sprint actual
4. Actualizar `STATE.md` al terminar
5. Commit atómico por tarea completada

**Convenciones de desarrollo (ambos stacks):**
- Soft deletes siempre (`deleted_at`, nunca `DELETE`)
- Historial/audit inmutable (insert-only)
- RLS en todas las tablas de Supabase
- TypeScript strict (Next.js) / Python type hints (FastAPI)
- Variables de entorno nunca en código
- CLAUDE.md en cada proyecto con instrucciones para el agente

**Entregable por sprint:** Features deployadas + STATE.md actualizado.

---

## FASE 5 — MEJORAS CONTINUAS

**Cuándo:** Proyecto en producción.

**Objetivo:** Registrar, priorizar y ejecutar mejoras. Propagar módulos mejorados al resto de proyectos.

**Plantilla:** `CLIENTES/_TEMPLATE/04_MEJORAS.md`

**Proceso:**
1. Cliente o equipo identifica mejora
2. Se clasifica (bug crítico / mejora UX / nueva feature / módulo)
3. Si es módulo → se actualiza en `MODULOS/` y se evalúa propagación
4. Se registra en `SISTEMA/MEJORAS.md` con fecha y proyectos afectados
5. Se ejecuta con ciclo GSD reducido (sin Fase 0-3)

**Cadencia recomendada:** Review mensual de mejoras por cliente.

---

## Regla de oro: propagación de módulos

```
Resolvés algo en Proyecto A
    ↓
¿Es reutilizable?
    ↓ SÍ
Documentarlo en MODULOS/
    ↓
¿Qué otros proyectos lo necesitan?
    ↓
Actualizar esos proyectos + registrar en MEJORAS.md
```

---

## Tiempos orientativos por fase

| Fase | Duración típica | Variable |
|------|----------------|----------|
| 0 Prospecto | 1-3 días | Velocidad de respuesta del cliente |
| 1 Intake | 3-7 días | 1-2 reuniones |
| 2 Propuesta | 2-3 días | Tiempo de elaboración |
| 3 Diagnóstico | 7-15 días | Complejidad del negocio |
| 4 Desarrollo | 4-16 semanas | Alcance del proyecto |
| 5 Mejoras | Continuo | Cadencia mensual |

---

## Señales de alerta por fase

| Fase | Señal | Acción |
|------|-------|--------|
| Intake | Cliente no puede describir sus procesos | Hacer sesión de mapeo guiado |
| Diagnóstico | Scope crece 50%+ durante diagnóstico | Re-proponer con nuevo costo |
| Desarrollo | STATE.md desactualizado > 2 sesiones | Sesión de limpieza de contexto |
| Mejoras | Backlog > 20 items sin priorizar | Session de priorización con cliente |

*Última actualización: 2026-03-28*
