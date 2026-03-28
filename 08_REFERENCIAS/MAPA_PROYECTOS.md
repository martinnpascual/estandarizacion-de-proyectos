# 🗺️ MAPA DE PROYECTOS ACTIVOS

> **Última actualización:** 2026-03-28
> **Actualizar:** Al completar cada milestone o al inicio de mes

---

## ESTADO GENERAL DEL PORTFOLIO

| Proyecto | Cliente | Stack | Estado | Versión | Repo |
|----------|---------|-------|--------|---------|------|
| GoJulito | Julio Correa | Next.js 14 + Supabase | 🟡 En desarrollo | v1.2 | [github.com/edubd4/gojulito](https://github.com/edubd4/gojulito) |
| APP.PRESTAMISTA | Martin (prestamista) | FastAPI + React + Supabase | 🟢 Producción | v1.x | [github.com/martinnpascual/APP.PRESTAMISTA](https://github.com/martinnpascual/APP.PRESTAMISTA) |
| DM Cars | Dante Mostajo | FastAPI + React + Supabase | 🟢 Producción | v1.x | [github.com/martinnpascual/CONSECIONARIA.MD](https://github.com/martinnpascual/CONSECIONARIA.MD) |
| Finanzas-JY | José Ybarra | Next.js + Supabase | 🔵 Inicio | v0.1 | [github.com/edubd4/Finanzas-jy](https://github.com/edubd4/Finanzas-jy) |
| EduWorkspace | Sistema interno | Master | 🟢 Activo | v1.0 | [github.com/edubd4/EduWorkspace](https://github.com/edubd4/EduWorkspace) |

**Leyenda:** 🔵 Inicio | 🟡 En desarrollo | 🟢 Producción | 🔴 Pausado | ⚫ Finalizado

---

## DETALLE POR PROYECTO

### GoJulito
- **Industria:** Gestión de visas y seminarios de viajes
- **Módulos:** Auth, Clientes, Visas, Pagos, Seminarios, Bot Telegram (Alfred), Calendario
- **Próximo:** Completar BOT-02, dashboard KPIs
- **GSD activo:** ✅ Sí
- **n8n:** ✅ Sí (bot Alfred)
- **Diagnóstico:** `02_DIAGNOSTICOS/DIAGNOSTICO_GOJULITO.md`

### APP.PRESTAMISTA
- **Industria:** Préstamos particulares con cobradores
- **Módulos:** Auth, Préstamos, Motor de cálculo, Cobros, Penalidades, PDF, Notificaciones Telegram+Email
- **Próximo:** Tests automatizados, dashboard avanzado
- **GSD activo:** ✅ Sí
- **n8n:** ✅ Sí (alertas + Telegram)
- **Diagnóstico:** `02_DIAGNOSTICOS/DIAGNOSTICO_PRESTAMISTA.md`

### DM Cars (CONSECIONARIA)
- **Industria:** Concesionaria automotriz
- **Módulos:** Auth (4 roles), Stock, CRM Kanban, Ventas, Taller, Caja multi-moneda, Facturación AFIP, PDF, Reportes
- **Próximo:** Integrar n8n para alertas
- **GSD activo:** ⚠️ No verificado
- **n8n:** ❌ Pendiente
- **Diagnóstico:** `02_DIAGNOSTICOS/DIAGNOSTICO_DMCARS.md`

### Finanzas-JY
- **Industria:** Finanzas personales/empresariales
- **Módulos:** En definición
- **Próximo:** Definir REQUIREMENTS.md completo, confirmar módulos
- **GSD activo:** ✅ Sí (tiene .planning/)
- **n8n:** ❓ Por definir
- **Diagnóstico:** `02_DIAGNOSTICOS/DIAGNOSTICO_FINANZASJY.md`

---

## HITOS COMPLETADOS (historial)

| Proyecto | Hito | Fecha |
|----------|------|-------|
| GoJulito | v1.0 — MVP | 2025 |
| GoJulito | v1.1 — Bot Alfred + Calendario | 2025-2026 |
| GoJulito | v1.2 — Config admin | 2026-03-24 |
| APP.PRESTAMISTA | v1.0 — Sistema completo con notificaciones | 2025 |
| DM Cars | v1.0 — Sistema completo con AFIP | 2024-2025 |
| Finanzas-JY | v0.1 — Setup inicial | 2026-03-26 |

---

## ALERTAS ACTIVAS

| Proyecto | Alerta | Prioridad |
|----------|--------|-----------|
| DM Cars | Sin n8n para alertas | 🟡 Media |
| DM Cars | GSD no confirmado | 🟡 Media |
| GoJulito | BOT-02 endpoint pendiente | 🟡 Media |
| Todos | Verificar service_role_key no expuesta al frontend | 🔴 Alta |

---
*Actualizar este mapa al completar cada milestone*
