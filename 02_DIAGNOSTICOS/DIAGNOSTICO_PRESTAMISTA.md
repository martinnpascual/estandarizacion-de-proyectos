# 🔍 DIAGNÓSTICO — APP.PRESTAMISTA

> **Fecha de diagnóstico:** 2025 (estimado)
> **Estado actual:** Activo en producción
> **Repo:** github.com/martinnpascual/APP.PRESTAMISTA

---

## RESUMEN EJECUTIVO

Sistema de gestión de préstamos para prestamistas independientes con cobradores. Maneja el ciclo completo del préstamo: otorgamiento, cuotas, cobros, mora, penalidades y notificaciones automáticas. Uno de los proyectos técnicamente más maduros del portfolio.

---

## STACK IMPLEMENTADO

- **Backend:** FastAPI + Python 3.11+
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Base de datos:** Supabase (PostgreSQL)
- **Generación PDF:** WeasyPrint + Jinja2
- **Notificaciones:** n8n (Telegram Bot + SMTP)
- **Deployment:** Vercel (frontend) + Railway (backend)

**Decisión de stack:** Correcto. Cálculo de amortizaciones y jobs nocturnos requieren FastAPI.

---

## MÓDULOS IMPLEMENTADOS

| Módulo | Estado | Notas |
|--------|--------|-------|
| Auth + RBAC | ✅ Completo | Admin, Cobrador, Read-only |
| Gestión de Préstamos | ✅ Completo | CRUD + amortizaciones |
| Motor de Cálculo | ✅ Completo | Flat, balance, custom |
| Gestión de Cobros | ✅ Completo | Por cobrador |
| Penalidades por mora | ✅ Automático | Job nocturno 00:30 |
| Generación PDF | ✅ Completo | Contratos, estados de cuenta |
| Notificaciones Telegram | ✅ Completo | Alertas de vencimiento |
| Notificaciones Email | ✅ Completo | SMTP |
| Dashboard | ✅ Básico | |
| Reportes | ✅ Básico | |

---

## ARQUITECTURA RELEVANTE

### Tres niveles de acceso (RBAC)
```
Admin → acceso total
Cobrador → solo sus clientes asignados + tareas diarias
Read-only → dashboards y reportes
```

### Motor de cálculo de préstamos
```python
# Fórmulas de interés configurables:
# - Flat: sobre capital original
# - Balance: sobre saldo restante
# - Custom: fórmula personalizable

# Schedules de pago:
# - Diario, Semanal, Quincenal, Mensual
```

### Job de procesamiento nocturno (00:30 daily)
```python
# APScheduler en FastAPI
# - Identifica pagos vencidos
# - Aplica penalidades configuradas
# - Genera notificaciones Telegram
# - Registra en log de auditoría
```

### Seguridad crítica
- Service role key de Supabase: **solo backend, nunca frontend**
- JWT validado en cada request del backend
- Soft deletes con `is_active = false` (nunca DELETE)

---

## PATRONES TÉCNICOS PARA REUTILIZAR

### n8n + Supabase para notificaciones
```
Supabase trigger → n8n webhook → Telegram/Email
```

### PDFs con WeasyPrint
```python
# Template Jinja2 → HTML → PDF
# PDFs almacenados en Supabase Storage con URLs firmadas
```

### Workflow de Docker para desarrollo
```yaml
# docker-compose.yml con:
# - Backend FastAPI
# - Frontend React (dev server)
# - Configuración de hot reload
```

---

## LECCIONES APRENDIDAS

1. **Service role key solo en backend** — Crítico para seguridad. Nunca exponer al frontend.
2. **APScheduler en FastAPI** es robusto para jobs nocturnos — patrón replicable para cualquier sistema con tareas programadas
3. **WeasyPrint + Jinja2** produce PDFs de alta calidad con lógica de negocio — mejor que alternativas JS para sistemas complejos
4. **n8n para Telegram** funciona perfectamente. Combinado con Supabase webhooks es muy potente
5. **Soft deletes con `is_active`** en lugar de `is_deleted` — consistencia de naming a definir en estándar
6. **RUNBOOK.md + architecture.md** en `/docs` — patrón de documentación a replicar en todos los proyectos

---

## DEUDA TÉCNICA IDENTIFICADA

| Item | Prioridad | Descripción |
|------|-----------|-------------|
| Tests unitarios | 🟡 Media | No hay tests automatizados |
| Typing estricto Python | 🟢 Baja | Algunos endpoints sin type hints |
| Dashboard avanzado | 🟢 Baja | Dashboard básico, falta profundidad |

---

## MEJORAS IDENTIFICADAS PARA OTROS PROYECTOS

| Mejora | Aplica a | Estado |
|--------|----------|--------|
| RUNBOOK.md + architecture.md | Todos | 📋 Pendiente en GoJulito, Finanzas-JY |
| Service role key solo backend | DM Cars (verificar) | 📋 Pendiente verificar |
| APScheduler para jobs nocturnos | Cualquier proyecto con alertas | ✅ Documentado en 04_MODULOS/ |
| docker-compose para dev | Finanzas-JY (ya tiene) | ✅ |

---
*Diagnóstico generado desde análisis del repositorio — Actualizar con cada release*
