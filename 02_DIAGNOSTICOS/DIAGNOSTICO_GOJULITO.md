# 🔍 DIAGNÓSTICO — GoJulito

> **Fecha de diagnóstico:** 2025 (estimado)
> **Estado actual:** v1.2 en desarrollo activo (2026-03-24)
> **Repo:** github.com/edubd4/gojulito

---

## RESUMEN EJECUTIVO

GoJulito es el sistema de gestión operativa para el negocio de visas y seminarios de viajes de Julio Correa. Centraliza la gestión de clientes, visas, pagos y seminarios. Incluye integración con bot Telegram (Alfred) para operaciones desde el celular.

---

## STACK IMPLEMENTADO

- **Framework:** Next.js 14 App Router + TypeScript (strict)
- **Backend:** Supabase (RLS habilitado)
- **Styling:** Tailwind CSS + tokens personalizados `gj-*`
- **Automatizaciones:** n8n (bot Alfred vía Telegram)
- **Deployment:** Vercel

**Decisión de stack:** Gestión operativa → Next.js correcto.

---

## MÓDULOS IMPLEMENTADOS

| Módulo | Estado | Notas |
|--------|--------|-------|
| Auth + RBAC | ✅ Completo | Admin + Colaborador |
| Gestión de Clientes | ✅ Completo | CRUD + auditoría |
| Gestión de Visas | ✅ Completo | Estados, historial |
| Gestión de Pagos | ✅ Completo | Tracking de pagos |
| Gestión de Seminarios | ✅ Completo | Ediciones, asistentes |
| Bot Telegram (Alfred) | ✅ v1.1 | Consultas via n8n |
| Calendario | ✅ v1.1 | Vista mensual |
| Configuración precios | ✅ v1.1 | Solo admin |
| Dashboard KPIs | 🔄 Pendiente | v2.0 |
| Export CSV | ⏳ Deferred | v2.0 |

---

## PATRONES TÉCNICOS RELEVANTES PARA REUTILIZAR

### Patrón de respuesta unificado
```typescript
// Todos los handlers retornan: { data, error }
async function getCliente(id: string) {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}
```

### Soft deletes (NUNCA hard delete)
```sql
-- Todas las tablas tienen:
is_deleted BOOLEAN DEFAULT false
deleted_at TIMESTAMPTZ
```

### Validación solo en servidor
- No hay validación en el cliente que no esté replicada en el servidor
- Zod para schemas de validación

### Prohibiciones arquitectónicas (documentadas en STATE.md)
- ❌ NO Server Actions
- ❌ NO hard deletes
- ❌ NO validación solo client-side
- ❌ Nodo 18.18.1 (shadcn CLI no compatible)

---

## LECCIONES APRENDIDAS

1. **Tokens CSS personalizados** (`gj-*`) facilitan el mantenimiento del design system por proyecto — patrón replicable
2. **Audit logging inmutable** (INSERT-only) es la solución correcta para trazabilidad — replicar en todos los proyectos financieros
3. **n8n para el bot de Telegram** funciona muy bien. El patrón de webhook + tabla de historial JSONB es reutilizable
4. **RLS en Supabase** bien configurado desde el inicio evita retrabajos — nunca dejarlo para "después"
5. **Restricción de shadcn CLI** con Node 18.18.1 — documentar la versión de Node en CLAUDE.md

---

## MEJORAS IDENTIFICADAS PARA OTROS PROYECTOS

| Mejora | Aplica a | Estado |
|--------|----------|--------|
| Patrón `{ data, error }` unificado | Todos | ✅ Documentado en 07_APIS/ |
| Audit logging inmutable | Prestamista, DM Cars | 📋 Pendiente verificar |
| Tokens CSS por proyecto | Todos | ✅ Documentado en 06_UX_UI/ |
| n8n webhook + JSONB history | Todos con bot | ✅ Documentado en 04_MODULOS/ |

---

## ESTADO ACTUAL (2026-03-28)

- **Versión:** 1.2
- **Fase completada:** 07 — Calendario y configuración admin
- **Próxima fase:** Completar BOT-02 (endpoint de búsqueda de clientes)
- **Deuda técnica:** Dashboard KPIs pendiente

---
*Diagnóstico generado desde análisis del repositorio — Actualizar con cada milestone*
