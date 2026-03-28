# 🤖 GUÍA DE INTEGRACIÓN n8n

> **Versión:** 1.0 | **Fecha:** 2026-03-28
> **Proyectos de referencia:** GoJulito (bot Alfred), APP.PRESTAMISTA (alertas + Telegram)

---

## CUÁNDO USAR n8n

n8n es la herramienta estándar para automatizaciones en todos los proyectos. Usar cuando:

- Notificaciones automáticas (Telegram, WhatsApp, Email)
- Jobs periódicos (vencimientos, alertas, reportes diarios)
- Integraciones con APIs externas
- Bots conversacionales
- Flujos multi-paso con lógica condicional
- Sincronización entre sistemas

---

## ARQUITECTURA ESTÁNDAR

```
SUPABASE
  ↓ (Webhook / Database Trigger)
n8n WORKFLOW
  ↓
TELEGRAM / EMAIL / WHATSAPP
```

### Para bots conversacionales:
```
TELEGRAM BOT (Webhook)
  ↓
n8n WORKFLOW
  ↓
SUPABASE (guardar histórico)
  ↓
RESPUESTA AL USUARIO
```

---

## SETUP DE n8n

### Opción 1: Railway (recomendado para producción)

```yaml
# railway.toml
[build]
  builder = "DOCKERFILE"

[deploy]
  startCommand = "n8n start"

# Variables de entorno en Railway:
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=[usuario]
N8N_BASIC_AUTH_PASSWORD=[password]
WEBHOOK_URL=https://[tu-proyecto].railway.app/
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=https
```

### Opción 2: Docker en servidor propio

```yaml
# docker-compose.yml
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - WEBHOOK_URL=https://[tu-dominio]
    volumes:
      - n8n_data:/home/node/.n8n
```

---

## PATRONES DE WORKFLOW

### Patrón 1: Alerta por vencimiento (APP.PRESTAMISTA)

```
TRIGGER: Cron (todos los días a las 08:00)
  → Supabase: SELECT préstamos WHERE fecha_vencimiento = HOY
  → IF hay préstamos vencidos:
      → Telegram: Enviar mensaje al prestamista
      → Email: Enviar resumen diario
  → Supabase: Actualizar log de notificaciones
```

### Patrón 2: Bot Telegram consulta (GoJulito - Alfred)

```
TRIGGER: Telegram Webhook (mensaje recibido)
  → Supabase: Guardar mensaje en historial (JSONB)
  → Supabase: Consultar datos solicitados
  → Telegram: Responder con datos formateados
```

**Tabla de histórico para bots:**
```sql
CREATE TABLE telegram_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL,
  message_id TEXT,
  message JSONB NOT NULL,           -- Mensaje completo en JSONB
  direction TEXT CHECK (direction IN ('in', 'out')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Patrón 3: Notificación en evento (ej: nuevo cliente registrado)

```
TRIGGER: Supabase Webhook (INSERT en tabla clientes)
  → n8n: Recibe payload del webhook
  → Formatear mensaje
  → Telegram: Notificar al admin
```

**Configurar webhook en Supabase:**
```sql
-- En Supabase: Database → Webhooks → Create webhook
-- Tabla: clientes
-- Evento: INSERT
-- URL: https://[n8n-instance]/webhook/nuevo-cliente
```

---

## CONFIGURACIÓN DE CREDENCIALES EN n8n

### Supabase
```
Type: HTTP Header Auth
Name: Authorization
Value: Bearer [SERVICE_ROLE_KEY]
```

### Telegram Bot
```
1. Crear bot con @BotFather en Telegram
2. Obtener TOKEN
3. En n8n: Credentials → Telegram API → Ingresar TOKEN
4. Configurar webhook: https://api.telegram.org/bot[TOKEN]/setWebhook?url=[n8n-url]/webhook/telegram
```

### Gmail / SMTP
```
Type: SMTP
Host: smtp.gmail.com
Port: 587
User: [email]
Password: [App Password de Google]
```

---

## BUENAS PRÁCTICAS

1. **Siempre guardar histórico de notificaciones** en Supabase — no fiar solo en n8n
2. **Manejo de errores** — cada workflow debe tener un nodo de error que notifique al admin
3. **Variables de entorno** — nunca hardcodear credenciales en workflows, usar variables de n8n
4. **Exportar workflows** — guardar JSON de workflows en `/n8n/workflows/` del repo
5. **Nombres descriptivos** — nombrar workflows con el patrón: `[Proyecto] - [Función]`
6. **Rate limiting** — respetar límites de Telegram (30 msgs/seg, 20 msgs/min por chat)

---

## VARIABLES DE ENTORNO DEL PROYECTO CON n8n

```env
# .env.example — agregar estas variables si el proyecto usa n8n
N8N_BASE_URL=https://[n8n-instance].railway.app
N8N_WEBHOOK_SECRET=[secret-para-verificar-webhooks]
TELEGRAM_BOT_TOKEN=[token-del-bot]
TELEGRAM_CHAT_ID=[chat-id-admin]
```

---

## FORMATO DE MENSAJES TELEGRAM ESTÁNDAR

```
# Patrón de mensaje para alertas:
🔔 *[TIPO DE ALERTA]*

📋 *Descripción:* [descripción]
📅 *Fecha:* [fecha]
💰 *Monto:* $[monto]

[Detalles adicionales]

---
_Enviado automáticamente por [Nombre Sistema]_
```

---
*Guía v1.0 — Basado en implementaciones de GoJulito y APP.PRESTAMISTA*
