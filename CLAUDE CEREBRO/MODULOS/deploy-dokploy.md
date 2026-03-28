# MÓDULO: deploy-dokploy

## Descripción

Configuración estándar de deploy de aplicaciones Next.js a Dokploy usando Docker con `output: standalone`. Incluye Dockerfile, next.config.mjs, manejo de variables de entorno en build time, y Node 20 Alpine.

## Stack
B (Next.js) — Dokploy como plataforma de hosting

## Proyectos que lo usan
- GoJulito — deploy en Dokploy
- Finanzas-jy — deploy en Dokploy (pendiente al 2026-03-28)

---

## Dockerfile estándar

```dockerfile
# Node 20 Alpine — CRÍTICO: Node 18 no es compatible con shadcn CLI
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables públicas de Supabase — necesarias en BUILD TIME
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

---

## next.config.mjs

```javascript
// next.config.mjs — output standalone REQUERIDO por Dokploy
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // ← CRÍTICO para Dokploy
}

export default nextConfig
```

---

## Variables de entorno en Dokploy

### Variables de BUILD TIME (NEXT_PUBLIC_*)
Las variables públicas de Supabase deben pasarse como **Build Arguments** en Dokploy, no como env vars runtime:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Variables de RUNTIME (secretos del servidor)
Estas se configuran como env vars normales en Dokploy:

```
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # NUNCA como NEXT_PUBLIC_
```

### ADVERTENCIA CRÍTICA
`SUPABASE_SERVICE_ROLE_KEY` NO debe ser `NEXT_PUBLIC_` nunca — quedaría expuesta en el bundle del cliente.

---

## Checklist de deploy

- [ ] `output: 'standalone'` en next.config.mjs
- [ ] Dockerfile usa `node:20-alpine` (no 18)
- [ ] `NEXT_PUBLIC_*` configuradas como Build Arguments en Dokploy
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada como Runtime Env Var (NO Build Arg)
- [ ] `npm run build` local exitoso antes del deploy
- [ ] Puerto 3000 expuesto

---

## Seed data con patrón OR (evita duplicados en re-runs)

```sql
-- Usar INSERT ... ON CONFLICT DO NOTHING para seeds idempotentes
INSERT INTO profiles (id, nombre, rol)
VALUES ('uuid-aqui', 'Admin', 'admin')
ON CONFLICT (id) DO NOTHING;
```

## Consideraciones

- shadcn/ui **no funciona** con `npx shadcn@latest init` en Node 18 — usar Node 20 siempre
- El archivo `.next/standalone` incluye todo lo necesario — no copiar `node_modules` completo al runner
- `output: standalone` genera un `server.js` que se usa como entry point

## Historial de cambios

| Fecha | Cambio | Proyecto origen |
|-------|--------|----------------|
| 2026-03-28 | Módulo creado desde GoJulito + Finanzas-jy | CEREBRO |

*Madurez: ★★★☆☆*
