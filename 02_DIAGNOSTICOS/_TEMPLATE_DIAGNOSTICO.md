# 📊 TEMPLATE DE DIAGNÓSTICO RÁPIDO

> Usar este template para hacer diagnósticos en < 2 horas para proyectos pequeños.
> Para diagnósticos completos, usar el template en `01_ONBOARDING_CLIENTES/_TEMPLATES/03_DIAGNOSTICO_TECNICO.md`

---

## DATOS BÁSICOS

| Campo | Detalle |
|-------|---------|
| Cliente | |
| Industria | |
| Fecha | |
| Proyecto | |

---

## PROBLEMA CENTRAL (1 línea)

```
[EL PROBLEMA MÁS IMPORTANTE EN UNA ORACIÓN]
```

---

## ESTADO ACTUAL vs ESTADO DESEADO

| Área | Estado Actual | Estado Deseado |
|------|--------------|----------------|
| Gestión de [X] | Manual en Excel / WhatsApp | Sistema digital centralizado |
| Seguimiento de [Y] | No hay trazabilidad | Historial completo con auditoría |
| Reportes | No existen / son manuales | Dashboard en tiempo real |
| Notificaciones | Manuales (llamadas/mensajes) | Automatizadas |

---

## MÓDULOS NECESARIOS

Marcar los módulos que aplican:

**Módulos del sistema maestro (reutilizables):**
- [ ] Auth + RBAC (siempre)
- [ ] Dashboard + KPIs
- [ ] Notificaciones n8n (Telegram/Email)
- [ ] Generación PDF

**Módulos específicos a desarrollar:**
- [ ] [Módulo específico 1]
- [ ] [Módulo específico 2]
- [ ] [Módulo específico 3]

---

## STACK RECOMENDADO

Usar árbol de decisión en `00_SISTEMA/STACK_DECISION_TREE.md`

- [ ] Next.js 14 + Supabase → Gestión operativa
- [ ] FastAPI + React + Supabase → Financiero/cálculos

---

## ESTIMACIÓN RÁPIDA

| Fase | Módulos | Semanas | Costo estimado |
|------|---------|---------|----------------|
| MVP | Auth + [Core] | | $ |
| Fase 2 | [Módulos adicionales] | | $ |
| **TOTAL** | | | **$** |

---

## FLAG DE COMPLEJIDAD

- [ ] 🟢 Simple (< $X, < 6 semanas) — Usar template kickoff directamente
- [ ] 🟡 Medio ($X - $Y, 6-12 semanas) — Diagnóstico completo recomendado
- [ ] 🔴 Complejo (> $Y, > 12 semanas) — Diagnóstico completo obligatorio

---
*Template v1.0*
