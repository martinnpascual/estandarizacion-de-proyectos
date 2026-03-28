# STATE — DM Cars (CONSECIONARIA.MD)

*Última actualización: 2026-03-28 — Post-auditoría*

---

## Estado actual

**Sistema DMS completo para DM Cars (Dante Mostajo).** Todos los 11 módulos están implementados y auditados (auditoría 2026-03-17). Se corrigieron 4 bugs críticos. El sistema está listo para deploy — pendiente configuración de producción (16 tareas de go-live).

**Stack:** FastAPI (Python 3.11+) + React 18 + TypeScript + Vite + TailwindCSS + Supabase + WeasyPrint + MrBot API (ARCA)
**Repo:** github.com/martinnpascual/CONSECIONARIA.MD
**Deploy target:** Hostinger VPS + Dokploy (backend:8000 + frontend:80) + Supabase Cloud

---

## Módulos — todos completos ✅

| ID | Módulo | Estado |
|----|--------|--------|
| M01 | Stock (nuevos, usados, consignación + fotos) | ✅ completo |
| M02 | CRM (pipeline Kanban, leads, historial) | ✅ completo |
| M03 | Ventas (cotizaciones, reservas, financiamiento, comisiones) | ✅ completo |
| M04 | Toma de usados (appraisal, trade-in) | ✅ completo |
| M05 | Taller (órdenes de trabajo, presupuestos, historial por vehículo) | ✅ completo |
| M06 | Caja (movimientos, multi-moneda ARS/USD, cuenta corriente) | ✅ completo |
| M07 | Documentos PDF (boleto, cotización, acta entrega, contratos) | ✅ completo |
| M08 | Facturación electrónica ARCA/AFIP (Factura A/B/C, CAE vía MrBot) | ✅ completo |
| M09 | Consignaciones | ✅ completo |
| M10 | Reportes (stock valorizado, ventas, comisiones, caja) | ✅ completo |
| M11 | Dashboard KPIs + Supabase Realtime | ✅ completo |

---

## Bugs corregidos en auditoría (2026-03-17)

| Bug | Descripción | Estado |
|-----|-------------|--------|
| BUG-01 | Prop `open` vs `isOpen` mismatch en 4 modales | ✅ corregido |
| BUG-02 | VehicleCard destructurando JSX como objeto (crash runtime) | ✅ corregido |
| BUG-03 | Import faltante de `react-hook-form` | ✅ corregido |
| BUG-04 (crítico) | 4 URLs de API incorrectas en `useCaja.ts` | ✅ corregido |

---

## Pendiente para go-live (16 tareas — PLAN_DEPLOY_DOKPLOY.md)

**Críticas:**
- [ ] Configurar variables de entorno en producción (`.env` real)
- [ ] Configurar secrets ARCA/AFIP (CUIT, punto de venta, certificados)
- [ ] Configurar MrBot API key en producción
- [ ] Setup Hostinger VPS + instalar Dokploy
- [ ] Conectar GitHub repo a Dokploy (CI/CD)
- [ ] Configurar DNS y dominio
- [ ] Deploy `docker-compose.prod.yml`
- [ ] Verificar VITE_* build args en frontend

**Importantes:**
- [ ] Setup Supabase Storage policies para fotos de vehículos
- [ ] Configurar backup automático de Supabase
- [ ] Tests de aceptación con el cliente (Dante Mostajo)
- [ ] Capacitación al cliente

---

## Base de datos — 19 tablas + RLS

**Tablas principales:**
`vehiculos`, `clientes`, `leads`, `cotizaciones`, `ventas`, `cuotas_venta`, `tomas_usados`,
`ordenes_taller`, `presupuestos_taller`, `movimientos_caja`, `facturas`, `documentos`,
`consignaciones`, `comisiones`, `config_negocio`, `profiles`, `historial`
+ vistas de reportes

**RLS:** habilitado en todas las tablas
**Soft delete:** `deleted_at TIMESTAMPTZ` en todas las tablas operativas
**Auth roles:** admin, vendedor, cajero, mecánico

---

## API Endpoints — ~50 endpoints FastAPI

| Área | Endpoints |
|------|-----------|
| Auth | /auth/login, /auth/me, /auth/refresh |
| Stock | /vehiculos CRUD + /vehiculos/stock-valorizado |
| CRM | /clientes CRUD, /leads CRUD + /leads/pipeline |
| Ventas | /cotizaciones, /ventas, /reservas, /comisiones |
| Taller | /ordenes-taller, /presupuestos-taller |
| Caja | /movimientos-caja, /apertura, /cierre, /saldo |
| Documentos | /documentos/generar/{tipo} |
| Facturación | /facturas + integración MrBot ARCA |
| Reportes | /reportes/ventas, /reportes/stock, /reportes/caja |
| Dashboard | /dashboard/kpis |

---

## Sesiones completadas

| Sesión | Contenido |
|--------|-----------|
| S-00 | Estructura repo + CLAUDE.md |
| S-01 | Schema DB + migraciones SQL + RLS |
| S-02 | Backend base FastAPI + Auth |
| S-03 | Módulo Stock |
| S-04 | Módulo CRM |
| S-05 | Módulo Ventas + Toma de Usados |
| S-06 | Módulo Taller |
| S-07 | Módulo Caja |
| S-08 | Módulo Documentos PDF |
| S-09 | Módulo Facturación ARCA + Consignaciones + Reportes |
| AUDIT | Auditoría completa + 4 bugs corregidos (2026-03-17) |

**Sesiones pendientes:**
| S-10 | Frontend: Caja + Consignaciones |
| S-11 | Frontend: Documentos + Dashboard Realtime |
| S-12 | Hardening: tests, error boundaries, RUNBOOK |

---

## Integraciones

| Servicio | Uso | Credencial |
|---------|-----|-----------|
| Supabase | DB + Auth + Storage + Realtime | SUPABASE_URL, SUPABASE_ANON_KEY, SERVICE_ROLE_KEY |
| MrBot API | Facturación electrónica ARCA/AFIP | MRBOT_EMAIL, MRBOT_API_KEY |
| ARCA/AFIP | Emisión CAE facturas A/B/C | AFIP_CUIT, AFIP_PUNTO_VENTA, certificados |

---

## Contexto de negocio

- **Cliente:** Dante Mostajo — DM Cars
- **Operación:** 30-80 vehículos en stock, 10-30 ventas/mes, 5-10 usuarios del sistema
- **Multi-moneda:** ARS y USD (taller/repuestos en ARS, vehículos en USD/ARS)
- **Contexto regulatorio:** ARCA/AFIP — facturación electrónica obligatoria

---

## Módulos reutilizables generados

- `pdf-generator` → WeasyPrint + Jinja2 (ver MODULOS/pdf-generator.md)
- `afip-invoicing` → MrBot API integration (ver MODULOS/afip-invoicing.md)
- `auth-supabase` Stack D → aplicado con 4 roles
- `dashboard-shell` Stack D → con Supabase Realtime

*Responsable: Martin Pascual*
