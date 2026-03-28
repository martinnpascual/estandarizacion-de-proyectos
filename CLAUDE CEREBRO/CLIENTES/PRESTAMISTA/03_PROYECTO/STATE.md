# STATE — APP.PRESTAMISTA (prestamos.app)

*Última actualización: 2026-03-28 — S-16 COMPLETO — EN PRODUCCIÓN*

---

## Estado actual

**Sistema completo y en producción.** Todos los 10 módulos implementados. 17 sesiones completadas (S-00 a S-16). Deploy realizado en Railway (backend) + Vercel (frontend) + Supabase Cloud (sa-east-1). Hardening y RUNBOOK completados en S-16.

**Stack:** FastAPI (Python 3.11+) + React 18 + TypeScript + Vite + TailwindCSS + Supabase + WeasyPrint + n8n + Telegram + SMTP
**Repo:** github.com/martinnpascual/APP.PRESTAMISTA
**Deploy:** Vercel (frontend) + Railway (backend) + Supabase Cloud sa-east-1 (`obyfkrprseobehfxusdi`)

---

## Módulos — TODOS COMPLETOS ✅

| ID | Módulo | Sesión completada |
|----|--------|------------------|
| M01 | Ficha de Clientes (CRUD + búsqueda + historial) | S-03 |
| M02 | Calculadora + Motor de Préstamos (flat/sobre_saldo/personalizada, periodicidades mixtas) | S-04 |
| M03 | Gestión de Pagos (total, parcial, anticipado — historial inmutable) | S-05 |
| M04 | Mora Automática (job nocturno, recargo configurable, días de gracia) | S-05 |
| M05 | Cobros del Día (lista por cobrador/zona, semáforo visual, 1 toque) | S-06 + S-11 |
| M06 | Dashboard y KPIs (tiempo real via Supabase Realtime) | S-08 |
| M07 | Documentos PDF (contratos, recibos, tabla amortización, reporte cartera) | S-07 |
| M08 | Reportes del Negocio (CSV exportable) | S-08 |
| M09 | Usuarios y Cobradores (roles, zonas, auditoría) | S-15 |
| M10 | Notificaciones (Telegram + Email — solo al prestamista) | S-13 |

---

## Sesiones completadas — historial completo

| Sesión | Fecha | Contenido |
|--------|-------|-----------|
| S-00 | 2026-03-23 | Estructura repo + CLAUDE.md |
| S-01 | 2026-03-23 | Migraciones SQL + RLS + seeds (Supabase: obyfkrprseobehfxusdi) |
| S-02 | 2026-03-23 | Auth + Backend base (FastAPI + JWT) |
| S-03 | 2026-03-23 | Módulo Clientes (CRUD + búsqueda + historial) |
| S-04 | 2026-03-23 | Módulo Préstamos + Calculadora |
| S-05 | 2026-03-23 | Módulo Pagos + Mora Automática |
| S-06 | 2026-03-24 | Cobros del Día + Rutas (migración 002_cobros) |
| S-07 | 2026-03-24 | Generación PDFs (WeasyPrint) |
| S-08 | 2026-03-24 | Reportes + Panel KPIs |
| S-09 | 2026-03-24 | Frontend Base + Auth + Layout + Stores |
| S-10 | 2026-03-24 | Pantallas Clientes + Préstamos (22 issues corregidos) |
| S-11 | 2026-03-24 | Pantalla Cobros del Día mobile-first |
| S-13 | 2026-03-24 | Notificaciones Telegram + Email (n8n) |
| S-14 | 2026-03-24 | Job Nocturno + Backup Automático |
| S-15 | 2026-03-24 | Usuarios + Permisos + Cobradores |
| S-16 | 2026-03-24 | Deploy + Hardening + RUNBOOK ✅ PRODUCCIÓN |

---

## Base de datos — Schema completo

**Supabase proyecto:** `obyfkrprseobehfxusdi` (sa-east-1)

**9 tablas:**
| Tabla | Descripción |
|-------|-------------|
| `profiles` | Usuarios del sistema (admin, cobrador, solo_lectura) |
| `clientes` | Clientes del prestamista con `telegram_chat_id` |
| `prestamos` | Préstamos con tipo de tasa y periodicidad |
| `cuotas` | Cuotas generadas con estado (pendiente/pagada/mora/parcial/condonada) |
| `pagos` | Registro inmutable de pagos |
| `documentos` | PDFs generados (URLs firmadas Supabase Storage) |
| `config_negocio` | Configuración del negocio (tasas, gracia, etc.) |
| `system_logs` | Logs del sistema |
| `notificaciones` | Historial de notificaciones enviadas |

**3 vistas:**
| Vista | Descripción |
|-------|-------------|
| `v_clientes_deuda` | Clientes con deuda total y cuotas pendientes |
| `v_cobros_hoy` | Cuotas del día con semáforo (amarillo/naranja/rojo) + total a cobrar |
| `v_kpis` | Métricas del dashboard en tiempo real |

**Tabla `visitas`** (migración 002): registro inmutable de visitas de cobrador (cobrado/sin_pago/ausente/promesa_pago)

**ENUMs:**
- `ESTADO_PRESTAMO`: activo, en_mora, cancelado, cerrado, pendiente_aprobacion
- `ESTADO_CUOTA`: pendiente, pagada, mora, pago_parcial, condonada
- `PERIODICIDAD`: diaria, semanal, quincenal, mensual
- `TIPO_TASA`: flat, sobre_saldo, personalizada
- `TIPO_DOCUMENTO`: contrato, recibo, tabla_amortizacion, reporte_cartera
- `ROL_USUARIO`: admin, cobrador, solo_lectura
- `CANAL_NOTIF`: telegram, email

---

## Jobs automáticos (APScheduler)

| Job | Horario | Función |
|-----|---------|---------|
| Mora automática | 00:30 diario | Calcula y aplica recargos por mora |
| Alertas vencimiento | 20:00 diario | Notifica cuotas próximas a vencer |
| Cierre del día | 23:00 diario | Reporte diario al prestamista |
| Notificaciones | Cada 5 min | Procesa cola de notificaciones |
| Backup semanal | Dom 02:00 | Backup automático DB |

---

## n8n Workflow — notificaciones_prestamos.json

**Webhook:** `prestamos-notificaciones`
**8 rutas:** mora / pago / cierre_dia / alerta_vencimiento / pago_cliente / vencimiento_cliente / refinanciacion / cambio_config

Notificaciones solo al lado del prestamista (nunca al cliente, salvo que tenga `telegram_chat_id`).

---

## Módulos reutilizables generados

- `payments-tracking` → lógica de cuotas + mora + pagos parciales
- `pdf-generator` → WeasyPrint + Jinja2 (mismo patrón que DM Cars)
- `bot-telegram-n8n` → workflow n8n exportado en `/n8n/workflows/`
- `auth-supabase` Stack D → 3 roles (admin, cobrador, solo_lectura)
- `crud-base` → soft delete + RLS + historial inmutable

---

## Decisiones de arquitectura tomadas

- `SUPABASE_SERVICE_ROLE_KEY` solo en backend (nunca en `VITE_` vars)
- Soft deletes en toda la BD (`activo=false`, nunca `DELETE`)
- Notificaciones solo al prestamista por defecto
- Motor de cálculo en `services/calculadora.py` (periodicidad mixta)
- Frontend mobile-first (cobradores usan celular en campo)
- Job nocturno con APScheduler (no dependencia de cron del SO)

*Responsable: Martin Pascual*
