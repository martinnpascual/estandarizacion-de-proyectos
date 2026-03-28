# MÓDULO: bot-telegram-n8n

## Descripción

Bot de Telegram integrado vía n8n como middleware de automatización. Permite enviar notificaciones, recibir comandos del usuario y ejecutar workflows automatizados sin código de servidor adicional.

## Stack
A, B, D (n8n como intermediario independiente del stack de la app)

## Proyectos que lo usan
- APP.PRESTAMISTA — alertas de mora, recordatorios de cobranza, notificaciones al prestamista
- GoJulito — gestión de clientes, actualizaciones de estado de visa vía Telegram

---

## Arquitectura

```
App / Supabase → n8n → Telegram Bot API → Usuario
     ↑
     └── Webhook / Polling
```

n8n actúa como intermediario: recibe eventos de la app o de Supabase (via webhooks o cron), y los procesa antes de enviar a Telegram.

---

## Setup básico

### 1. Crear bot en Telegram
1. Hablar con @BotFather en Telegram
2. `/newbot` → elegir nombre y username
3. Guardar el TOKEN: `bot_token = "123456:ABC-DEF..."`

### 2. Configurar n8n

**Workflow de notificación básica:**
```
Trigger (Webhook / Cron / Supabase)
  → Set node (preparar mensaje)
  → Telegram node (enviar)
```

**Variables necesarias en n8n:**
- `TELEGRAM_BOT_TOKEN` — token del bot
- `TELEGRAM_CHAT_ID` — ID del chat destino (obtener con `/start` y la API)

### 3. Obtener Chat ID
```bash
curl https://api.telegram.org/bot{TOKEN}/getUpdates
# Enviar un mensaje al bot primero, luego buscar "chat":{"id": XXXX}
```

---

## Tipos de notificaciones por proyecto

### APP.PRESTAMISTA
```
- Préstamo nuevo creado
- Cuota vencida sin pago (alerta de mora)
- Pago registrado
- Resumen diario de cobranza
- Reporte semanal del portfolio
```

### GoJulito
```
- Cliente nuevo registrado
- Cambio de estado de visa
- Vencimiento próximo de trámite
- Inscripción a seminario confirmada
```

---

## Envío desde la app (webhook a n8n)

### Stack B (Next.js API Route)
```typescript
// app/api/notify/route.ts
export async function POST(request: Request) {
  const { tipo, datos } = await request.json()

  await fetch(process.env.N8N_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo, datos, timestamp: new Date().toISOString() })
  })

  return Response.json({ ok: true })
}
```

### Stack D (FastAPI)
```python
import httpx

async def notificar(tipo: str, datos: dict):
    async with httpx.AsyncClient() as client:
        await client.post(
            os.getenv("N8N_WEBHOOK_URL"),
            json={"tipo": tipo, "datos": datos}
        )
```

---

## Variables de entorno

```env
N8N_WEBHOOK_URL=https://n8n.[dominio]/webhook/[id]
TELEGRAM_BOT_TOKEN=           # en n8n, no en la app
TELEGRAM_CHAT_ID=             # en n8n, no en la app
```

## Consideraciones

- El bot token NUNCA va en el código de la app — solo en n8n
- Para múltiples destinatarios, usar n8n con lista de chat_ids
- Rate limit de Telegram: 30 mensajes/segundo por bot
- Para mensajes con formato: usar `parse_mode: "HTML"` o `"Markdown"`
- Los workflows de n8n deben exportarse como JSON y guardarse en `n8n/` del repo

## Historial de cambios

| Fecha | Cambio | Proyecto origen |
|-------|--------|----------------|
| 2026-03-28 | Módulo creado consolidando Prestamista + GoJulito | CEREBRO |

*Madurez: ★★★★☆*
