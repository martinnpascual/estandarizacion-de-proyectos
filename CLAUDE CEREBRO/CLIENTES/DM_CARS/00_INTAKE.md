# INTAKE — DM Cars

**Fecha de intake:** 2026 (aprox)
**Responsable:** Martin Pascual
**Estado:** completo — proyecto en desarrollo

---

## Información del negocio

| Campo | Valor |
|-------|-------|
| Nombre del negocio | DM Cars |
| Rubro / industria | Concesionaria automotriz |
| Ubicación | Argentina |
| Stack seleccionado | Perfil D (FastAPI + React + Supabase) |

---

## Dolores identificados

1. Gestión de stock manual (vehículos nuevos, usados, consignación)
2. Sin pipeline de ventas estructurado (CRM)
3. Facturación electrónica ARCA/AFIP no automatizada
4. Taller sin sistema de órdenes de trabajo
5. Caja sin control multi-moneda

---

## Módulos identificados

- auth-supabase (roles: admin, vendedor, cajero, mecánico)
- crud-base (stock, clientes, ventas)
- dashboard-shell (KPIs)
- pdf-generator (contratos, remitos, facturas)
- audit-historial
- deploy-docker

---

## Repo

github.com/martinnpascual/CONSECIONARIA.MD

---

## Notas

- Integración con MrBot API para ARCA/AFIP
- 12 agentes IA especializados definidos en AGENTS.md del repo
- Documentación extensa: PRD.md (24KB), PLAN_SESIONES.md (19KB), CHECKLIST.md (12KB)
