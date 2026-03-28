# 🧩 MÓDULOS POR PROYECTO

> **Última actualización:** 2026-03-28
> Mapa de qué módulo está implementado en qué proyecto y en qué versión/estado.

---

## MATRIZ DE MÓDULOS

| Módulo | GoJulito | PRESTAMISTA | DM Cars | Finanzas-JY |
|--------|----------|-------------|---------|-------------|
| **Auth + RBAC** | ✅ 2 roles | ✅ 3 roles | ✅ 4 roles | 🔄 Pendiente |
| **Dashboard + KPIs** | ⚠️ Básico | ✅ Básico | ✅ Completo | 🔄 Pendiente |
| **Notificaciones n8n** | ✅ Bot Telegram | ✅ Telegram + Email | ❌ No tiene | ❓ Por definir |
| **Generación PDF** | ❌ No necesita | ✅ WeasyPrint | ✅ WeasyPrint | ❓ Por definir |
| **Bot conversacional** | ✅ Alfred | ❌ | ❌ | ❌ |
| **Soft delete** | ✅ | ✅ | ✅ | 🔄 Pendiente |
| **Audit logging** | ✅ Inmutable | ⚠️ Básico | ⚠️ Básico | 🔄 Pendiente |
| **Multi-moneda** | ❌ | ❌ | ✅ ARS/USD | ❌ |
| **Facturación AFIP** | ❌ | ❌ | ✅ Completo | ❌ |
| **GSD (.planning/)** | ✅ | ✅ | ⚠️ Por verificar | ✅ |
| **RUNBOOK.md** | ❌ | ✅ | ✅ | ❌ |
| **architecture.md** | ❌ | ✅ | ✅ | ❌ |
| **Tests automatizados** | ❌ | ❌ | ❌ | ❌ |
| **Docker** | ❌ | ✅ | ⚠️ | ✅ |

**Leyenda:** ✅ Implementado | ⚠️ Parcial/básico | 🔄 Pendiente | ❌ No aplica/no tiene | ❓ Por definir

---

## VERSIÓN CANÓNICA DE CADA MÓDULO

Para cada módulo, identificamos cuál proyecto tiene la implementación más avanzada:

| Módulo | Versión canónica en | Por qué |
|--------|---------------------|---------|
| Auth + RBAC | DM Cars | 4 roles, más complejo |
| Dashboard KPIs | DM Cars | Más métricas |
| Notificaciones n8n | APP.PRESTAMISTA | Job nocturno + Telegram + Email |
| Bot Telegram | GoJulito (Alfred) | Más desarrollado, historial JSONB |
| PDF WeasyPrint | APP.PRESTAMISTA | Más templates |
| Soft delete | Todos (igual) | Patrón estándar |
| Audit logging | GoJulito | INSERT-only inmutable |
| Multi-moneda | DM Cars | Único proyecto que lo necesita |
| AFIP/ARCA | DM Cars | Único proyecto que lo necesita |

---

## OPORTUNIDADES DE REUSO

### GoJulito → puede recibir mejoras de:
- Patrón de PDF de APP.PRESTAMISTA (si necesita exportar reportes)
- RUNBOOK.md de APP.PRESTAMISTA (documentación operacional)

### APP.PRESTAMISTA → puede recibir mejoras de:
- Bot Telegram de GoJulito (Alfred más avanzado)
- Audit logging inmutable de GoJulito

### DM Cars → puede recibir mejoras de:
- n8n de APP.PRESTAMISTA (alertas automáticas pendientes)
- Bot Telegram de GoJulito (si el cliente lo necesita)

### Finanzas-JY → puede recibir mejoras de:
- Auth de GoJulito (mismo stack Next.js)
- Dashboard de cualquier proyecto
- GSD pattern de GoJulito

---

## MÓDULOS PENDIENTES DE CREAR

Módulos que se van a necesitar en proyectos futuros y no están documentados:

| Módulo | Utilidad | Prioridad |
|--------|---------|-----------|
| Export CSV/Excel | Reportes exportables | 🟡 Media |
| Filtros avanzados de tabla | UX de tablas | 🟡 Media |
| Upload de imágenes | Inventario con fotos (DM Cars pattern) | 🟢 Baja |
| Calendar view | GoJulito ya lo tiene | 🟢 Documentar |
| Kanban board | DM Cars CRM ya lo tiene | 🟢 Documentar |

---
*Actualizar cuando se implemente o mejore un módulo en cualquier proyecto*
