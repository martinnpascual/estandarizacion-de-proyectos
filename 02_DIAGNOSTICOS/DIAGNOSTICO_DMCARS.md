# 🔍 DIAGNÓSTICO — DM Cars (CONSECIONARIA)

> **Fecha de diagnóstico:** 2024-2025 (estimado)
> **Estado actual:** Activo en producción
> **Repo:** github.com/martinnpascual/CONSECIONARIA.MD

---

## RESUMEN EJECUTIVO

DM Cars es un DMS (Dealer Management System) completo para la concesionaria Dante Mostajo. Es el proyecto más complejo del portfolio: combina gestión operativa (stock, CRM, taller) con lógica financiera avanzada (facturación electrónica AFIP, multi-moneda ARS/USD). Es el mejor ejemplo del stack FastAPI + React.

---

## STACK IMPLEMENTADO

- **Backend:** FastAPI + Python 3.11+
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Base de datos:** Supabase (PostgreSQL)
- **Generación documentos:** WeasyPrint + Jinja2
- **Facturación:** ARCA (AFIP) via MrBot API
- **Deployment:** Vercel (frontend) + [Railway/Render backend]

**Decisión de stack:** Correcto. AFIP + cálculos financieros + multi-moneda requieren FastAPI.

---

## MÓDULOS IMPLEMENTADOS

| Módulo | Estado | Notas |
|--------|--------|-------|
| Auth + RBAC | ✅ Completo | Admin, Vendedor, Cajero, Mecánico |
| Stock | ✅ Completo | Nuevos, usados, consignación + galería |
| CRM | ✅ Completo | Pipeline Kanban + historial |
| Ventas | ✅ Completo | Cotizaciones, reservas, financiación |
| Taller | ✅ Completo | Órdenes de trabajo, presupuestos |
| Caja | ✅ Completo | Multi-moneda ARS/USD |
| Facturación AFIP | ✅ Completo | Tipos A/B/C con CAE |
| Generación PDF | ✅ Completo | Contratos, cotizaciones, remitos |
| Reportes | ✅ Completo | Stock, ventas, comisiones, caja |

---

## ARQUITECTURA DE ROLES (más compleja del portfolio)

```
Admin → Acceso total a todo el sistema
Vendedor → Stock (lectura) + Sus ventas + Sus leads
Cajero → Operaciones de caja y pagos
Mecánico → Solo órdenes de trabajo asignadas
```

**Aprendizaje:** Con 4+ roles, la arquitectura RBAC debe estar muy bien planificada en la etapa de diagnóstico.

---

## PATRONES TÉCNICOS ÚNICOS

### Integración AFIP (ARCA/MrBot)
```python
# Punto de complejidad más alto del proyecto
# Requiere:
# - Certificados digitales
# - CAE en tiempo real
# - Fallback offline
# - Tipos de comprobante: A, B, C
```

### Multi-moneda (ARS/USD)
```python
# Todas las transacciones almacenan:
# - Monto en moneda original
# - Tipo de cambio al momento
# - Equivalente en moneda base
```

### Pipeline Kanban para CRM
```typescript
// Drag & drop de leads entre etapas
// Historial de interacciones inmutable
// Recordatorios automáticos
```

---

## LECCIONES APRENDIDAS

1. **Facturación electrónica = complejidad altísima** — Siempre cotizar como módulo separado con tiempo extra
2. **Multi-moneda desde el inicio** — No se puede agregar después sin refactor complejo
3. **4 roles de usuario** requieren diseño cuidadoso de RLS en Supabase. Testear exhaustivamente
4. **Galería de fotos para stock** — Supabase Storage + signed URLs funciona bien
5. **Pipeline Kanban** es un módulo complejo. Considerar librerías (dnd-kit) antes de hacerlo custom
6. **Proyecto más grande del portfolio** — Dividir en fases fue clave para entregarlo sin bugs críticos

---

## MÓDULOS REUTILIZABLES IDENTIFICADOS

| Módulo | Reutilizable | Proyectos que lo necesitan |
|--------|-------------|---------------------------|
| Auth + RBAC (4 roles) | ✅ Sí | Cualquier proyecto con múltiples roles |
| Generación PDF WeasyPrint | ✅ Sí | Prestamista (ya lo tiene) |
| Multi-moneda | ⚠️ Específico | Solo proyectos que lo requieran |
| AFIP/ARCA | ⚠️ Muy específico | Proyectos con facturación argentina |
| Pipeline Kanban CRM | ✅ Sí | Cualquier CRM/pipeline |
| Galería de fotos | ✅ Sí | Proyectos con inventario visual |

---

## DEUDA TÉCNICA IDENTIFICADA

| Item | Prioridad | Descripción |
|------|-----------|-------------|
| Tests de integración | 🔴 Alta | Sin tests para facturación AFIP |
| n8n no implementado | 🟡 Media | No tiene notificaciones automáticas todavía |
| Documentación API | 🟡 Media | FastAPI genera OpenAPI pero sin ejemplos |

---

## MEJORA PENDIENTE: INTEGRAR n8n

DM Cars es el único proyecto del portfolio que no tiene n8n. Oportunidades:
- Alertas cuando un vehículo lleva > X días en stock
- Recordatorio de seguimiento de leads en el CRM
- Notificación al vendedor cuando se acerca vencimiento de reserva

---
*Diagnóstico generado desde análisis del repositorio — El proyecto más complejo del portfolio*
