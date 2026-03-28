# 🔔 MÓDULO: Notificaciones con n8n

> **Versión:** 1.0 | **Fecha:** 2026-03-28
> **Implementado en:** GoJulito (bot Telegram), APP.PRESTAMISTA (alertas + Telegram)

---

## DESCRIPCIÓN

Módulo estándar para automatizar notificaciones en proyectos. Cubre alertas proactivas (sistema notifica al usuario) y bots conversacionales (usuario consulta al sistema).

---

## CANALES SOPORTADOS

| Canal | Uso | Proyectos que lo usan |
|-------|-----|----------------------|
| Telegram Bot | Alertas + Bot conversacional | GoJulito, APP.PRESTAMISTA |
| Email (SMTP) | Notificaciones formales | APP.PRESTAMISTA |
| WhatsApp | Por implementar | - |

---

## CASOS DE USO POR TIPO DE PROYECTO

### Sistemas financieros (FastAPI)
- Alerta de cuotas vencidas (job diario)
- Notificación de nuevo préstamo otorgado
- Reporte diario de cobros del día
- Alerta de mora superando X días

### Sistemas de gestión operativa (Next.js)
- Bot de consulta de datos operativos
- Notificación de nuevo cliente registrado
- Recordatorio de seguimiento de leads
- Alerta de vencimiento de documentos

---

## TABLA ESTÁNDAR DE HISTÓRICO

```sql
-- Para proyectos con bot Telegram
CREATE TABLE notificaciones_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,           -- 'telegram', 'email', 'whatsapp'
  destinatario TEXT NOT NULL,   -- chat_id, email, número
  mensaje TEXT NOT NULL,
  payload JSONB,                -- Datos adicionales del mensaje
  estado TEXT DEFAULT 'enviado' CHECK (estado IN ('enviado', 'error', 'pendiente')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Para bots conversacionales (GoJulito pattern)
CREATE TABLE bot_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL,
  message JSONB NOT NULL,       -- Mensaje completo de Telegram/WhatsApp
  direction TEXT CHECK (direction IN ('in', 'out')),
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## WORKFLOWS N8N DOCUMENTADOS

### Workflow 1: Alerta diaria de vencimientos

```json
{
  "name": "[Proyecto] - Alerta Vencimientos",
  "trigger": "Cron - 08:00 diario",
  "nodes": [
    "Cron Trigger",
    "Supabase: Query vencimientos del día",
    "IF: ¿hay registros?",
    "Telegram: Enviar alerta",
    "Supabase: Log de notificación"
  ]
}
```

### Workflow 2: Bot conversacional básico

```json
{
  "name": "[Proyecto] - Bot Telegram",
  "trigger": "Telegram Webhook",
  "nodes": [
    "Telegram Trigger",
    "Supabase: Guardar mensaje entrante",
    "Switch: Tipo de consulta",
    "Supabase: Query datos",
    "Telegram: Responder",
    "Supabase: Guardar respuesta"
  ]
}
```

---

## FORMATO DE MENSAJE TELEGRAM ESTÁNDAR

```
# Para alertas:
🔔 *ALERTA — [TIPO]*

📋 *[Campo 1]:* [Valor]
📅 *Fecha:* [Fecha]
💰 *Monto:* $[Monto]

---
_[Nombre del sistema] · Automático_

# Para respuestas de bot:
✅ *[RESULTADO DE CONSULTA]*

[Datos formateados]

---
_Consulta: "[lo que escribió el usuario]"_
```

---

## CHECKLIST DE IMPLEMENTACIÓN

- [ ] n8n instancia configurada (Railway/Docker)
- [ ] Credenciales Supabase cargadas en n8n
- [ ] Bot Telegram creado con @BotFather (si aplica)
- [ ] Webhook Telegram configurado
- [ ] Tabla `notificaciones_log` creada en Supabase
- [ ] Variables de entorno documentadas
- [ ] Workflows exportados como JSON en `/n8n/workflows/`
- [ ] Error handling configurado en cada workflow

---

## REFERENCIA COMPLETA

Ver: `03_ARQUITECTURA_TECH/N8N_INTEGRATION_GUIDE.md`

---
*Módulo v1.0*
