# INTAKE — Jose Ybarra (Finanzas-jy)

**Fecha de intake:** 2026-03-26
**Responsable:** Edu
**Estado:** completo

---

## Información del negocio

| Campo | Valor |
|-------|-------|
| Nombre del negocio | Finanzas personales (uso privado) |
| Rubro / industria | Fintech personal |
| Ubicación | Argentina |
| Tamaño (empleados) | 1 usuario (uso propio) |
| Años en el mercado | — |
| Sitio web / redes | — |

## Contacto principal

| Campo | Valor |
|-------|-------|
| Nombre | Jose Ybarra |
| Rol en el negocio | Usuario único |
| WhatsApp | — |
| Email | — |
| Preferencia de comunicación | — |

---

## Procesos actuales

- Seguimiento manual de ingresos y gastos en planilla
- Sin historial estructurado ni categorización sistemática
- Sin vista de inversiones separada

## Qué necesitaba

- App web privada para control de finanzas personales
- 4 tipos de movimiento: ingreso, compromiso_fijo, gasto_variable, inversion
- Dashboard con resumen financiero
- Historial con filtros y búsqueda
- Vistas separadas por tipo de movimiento
- Configuración de cuenta

## Roles de usuario

| Rol | Descripción |
|-----|-------------|
| owner | Un único usuario (Jose Ybarra) |

## Integraciones requeridas

- [ ] Ninguna en Phase 1

---

## Evaluación interna

**Stack asignado:** B (Next.js 14 + Supabase + Tailwind + Dokploy)
**Módulos aplicados:** dashboard-shell (tokens `jy-*`), auth-supabase, crud-base, audit-historial
**Complejidad estimada:** Baja-Media
**Responsable técnico:** Edu

## Notas

- Formato ARS: sin decimales, localización `es-AR`
- Design tokens `jy-*`: bg `#0d1b2a`, surface `#112240`
- Tipografía: Fraunces (títulos) + DM Sans (body)
- Repo: `github.com/edubd4/Finanzas-jy`
- Deploy: Dokploy (Node 20 Alpine, output standalone)
- Phase 1 code-complete al 2026-03-28, pendiente deploy + SERVICE_ROLE_KEY en Dokploy
- Phase 2 backlog: módulo de préstamos personales, tracking cuotas, alertas
