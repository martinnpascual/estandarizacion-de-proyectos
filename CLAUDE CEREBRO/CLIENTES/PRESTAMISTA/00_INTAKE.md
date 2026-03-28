# INTAKE — APP.PRESTAMISTA

**Fecha de intake:** 2025 (previo a CEREBRO)
**Responsable:** Martin
**Estado:** completo (proyecto entregado — S-16 complete)

---

## Información del negocio

| Campo | Valor |
|-------|-------|
| Nombre del negocio | APP.PRESTAMISTA |
| Rubro / industria | Financiero — préstamos personales / microcréditos |
| Ubicación | Argentina |
| Tamaño (empleados) | Pequeño (cobradores en campo + admin) |
| Años en el mercado | — |
| Sitio web / redes | — |

## Contacto principal

| Campo | Valor |
|-------|-------|
| Nombre | — |
| Rol en el negocio | Dueño / administrador |
| WhatsApp | — |
| Email | — |
| Preferencia de comunicación | — |

---

## Procesos actuales

- Gestión manual de préstamos y cuotas
- Cobranza en campo por zonas
- Seguimiento de mora sin automatización
- Contratos en papel

## Qué necesitaba

- Sistema completo de gestión de préstamos
- Cuotas automáticas con amortización
- Mora automática (job nocturno)
- Vista de cobros por zona para cobradores móviles
- Generación de contratos y recibos PDF
- Bot Telegram para notificaciones a cobradores
- Registro inmutable de pagos

## Roles de usuario

| Rol | Descripción |
|-----|-------------|
| admin | Acceso total, configuración, reportes |
| cobrador | Vista de cobros del día, registrar pagos |
| supervisor | Reportes de cartera, mora, rendimiento |

## Integraciones requeridas

- [x] Telegram (notificaciones a cobradores)
- [x] n8n (automatización de alertas)
- [x] Supabase Storage (PDFs de contratos)
- [ ] AFIP / ARCA

---

## Evaluación interna

**Stack asignado:** D (FastAPI + React 18 + Supabase + Docker)
**Módulos aplicados:** payments-tracking, pdf-generator, bot-telegram-n8n, auth-supabase, crud-base, audit-historial, dashboard-shell
**Complejidad estimada:** Alta
**Responsable técnico:** Martin

## Notas

- Supabase project ID: `obyfkrprseobehfxusdi` (sa-east-1)
- 9 tablas, 3 vistas SQL, 5 jobs APScheduler
- Mobile-first para cobradores en campo
- Semáforo visual (amarillo/naranja/rojo) para estado de cuotas
- Mora automática: job diario a 00:30 con días de gracia configurables
