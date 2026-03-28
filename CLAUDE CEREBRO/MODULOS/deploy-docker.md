# MÓDULO: deploy-docker

## Descripción

Configuración estándar de Docker para proyectos Stack D (FastAPI + React). Incluye `docker-compose.yml` para desarrollo y producción, Dockerfile del backend FastAPI, y configuración de variables de entorno.

## Stack
D (FastAPI + React + Supabase) — también aplica el backend de Stack C

## Proyectos que lo usan
- DM Cars (CONSECIONARIA.MD) — backend FastAPI + React frontend
- APP.PRESTAMISTA — backend FastAPI + React frontend mobile-first

---

## Estructura de archivos

```
proyecto/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
├── frontend/
│   ├── Dockerfile
│   └── src/
└── docker-compose.yml
```

---

## docker-compose.yml — Producción

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SECRET_KEY=${SECRET_KEY}
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      - VITE_API_URL=${VITE_API_URL}
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
    depends_on:
      - backend
    restart: unless-stopped
```

---

## Dockerfile — Backend FastAPI

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Dependencias del sistema (incluir si se usa WeasyPrint para PDFs)
# RUN apt-get update && apt-get install -y \
#     libpango-1.0-0 libpangoft2-1.0-0 libpangocairo-1.0-0 \
#     libgdk-pixbuf2.0-0 libcairo2 libffi-dev \
#     && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Dockerfile — Frontend React (Vite)

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

# Variables públicas necesarias en build time
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## nginx.conf — SPA routing

```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;  # CRÍTICO para React Router
    }
}
```

---

## .env de ejemplo

```env
# Backend
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
SECRET_KEY=clave-secreta-jwt-aqui

# Frontend
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Comandos útiles

```bash
# Desarrollo
docker compose up --build

# Producción
docker compose -f docker-compose.yml up -d

# Ver logs
docker compose logs -f backend

# Rebuild solo backend
docker compose up --build backend
```

## Consideraciones

- Las variables `VITE_*` son públicas — se embeben en el bundle del frontend
- `SUPABASE_SERVICE_ROLE_KEY` va SOLO en el backend — nunca en el frontend
- Si se usa WeasyPrint: descomentar las dependencias del sistema en el Dockerfile del backend
- `try_files $uri $uri/ /index.html` es esencial para que React Router funcione correctamente

## Historial de cambios

| Fecha | Cambio | Proyecto origen |
|-------|--------|----------------|
| 2026-03-28 | Módulo creado desde DM Cars + APP.PRESTAMISTA | CEREBRO |

*Madurez: ★★★☆☆*
