# ⚡ ESTÁNDAR: FastAPI + React + Supabase

> **Versión:** 1.0 | **Fecha:** 2026-03-28
> **Proyectos de referencia:** APP.PRESTAMISTA, DM Cars (CONSECIONARIA)

---

## SETUP INICIAL ESTÁNDAR

### 1. Estructura de repositorio

```
[nombre-proyecto]/
├── .planning/                    ← GSD (obligatorio)
│   ├── PROJECT.md
│   ├── REQUIREMENTS.md
│   ├── ROADMAP.md
│   ├── STATE.md
│   └── PLAN.md
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               ← FastAPI app
│   │   ├── config.py             ← Settings desde .env
│   │   ├── dependencies.py       ← Auth, DB deps
│   │   ├── models/               ← Pydantic models
│   │   ├── routers/              ← Endpoints por módulo
│   │   ├── services/             ← Lógica de negocio
│   │   └── utils/                ← Utilidades
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/               ← Componentes base
│   │   │   └── [modulo]/         ← Componentes por módulo
│   │   ├── pages/                ← Si usa React Router
│   │   ├── hooks/                ← Custom hooks
│   │   ├── services/             ← Llamadas a la API
│   │   ├── types/                ← TypeScript types
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
├── db/
│   └── migrations/               ← Archivos SQL
├── n8n/
│   └── workflows/                ← Exports de workflows n8n
├── docs/
│   ├── architecture.md           ← Diagrama y descripción de arquitectura
│   └── RUNBOOK.md                ← Guía operacional
├── docker-compose.yml            ← Para desarrollo local
├── CLAUDE.md
├── .env.example
└── vercel.json                   ← Config deploy frontend
```

---

## BACKEND: FastAPI

### Instalación base

```bash
# requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.30.0
python-dotenv==1.0.1
supabase==2.9.0
python-jose[cryptography]==3.3.0   # JWT
pydantic==2.8.0
pydantic-settings==2.5.0
httpx==0.27.0
```

### Para proyectos con features adicionales

```bash
# Generación de PDFs
weasyprint==62.3
jinja2==3.1.4

# Jobs programados
apscheduler==3.10.4

# Envío de emails
aiosmtplib==3.0.1
```

### main.py estándar

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, [modulo1], [modulo2]

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/api/docs" if settings.DEBUG else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router([modulo1].router, prefix="/api/[modulo1]", tags=["[modulo1]"])

@app.get("/health")
def health_check():
    return {"status": "ok"}
```

### config.py estándar

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "[Nombre Proyecto]"
    DEBUG: bool = False

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str  # ⚠️ Solo backend, NUNCA al frontend
    SUPABASE_JWT_SECRET: str

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"

settings = Settings()
```

### dependencies.py — Auth middleware

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.config import settings

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token inválido")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

# Verificar rol específico
def require_role(*roles: str):
    async def role_checker(current_user=Depends(get_current_user)):
        user_role = current_user.get("user_metadata", {}).get("role")
        if user_role not in roles:
            raise HTTPException(status_code=403, detail="Sin permisos")
        return current_user
    return role_checker
```

### Patrón de router estándar

```python
# routers/clientes.py
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user, require_role
from app.models.cliente import ClienteCreate, ClienteResponse
from app.services.cliente_service import ClienteService

router = APIRouter()

@router.get("/", response_model=list[ClienteResponse])
async def listar_clientes(
    current_user=Depends(get_current_user),
    service: ClienteService = Depends()
):
    return await service.listar(user_id=current_user["sub"])

@router.post("/", response_model=ClienteResponse, status_code=201)
async def crear_cliente(
    cliente: ClienteCreate,
    current_user=Depends(require_role("admin", "operador")),
    service: ClienteService = Depends()
):
    return await service.crear(cliente, user_id=current_user["sub"])

@router.delete("/{id}", status_code=204)
async def eliminar_cliente(
    id: str,
    current_user=Depends(require_role("admin")),
    service: ClienteService = Depends()
):
    # SOFT DELETE — NUNCA hard delete
    await service.desactivar(id, user_id=current_user["sub"])
```

---

## FRONTEND: React + Vite

### package.json base

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "react-router-dom": "^6.0.0",
    "zod": "^3.0.0",
    "react-hook-form": "^7.0.0",
    "@hookform/resolvers": "^3.0.0",
    "axios": "^1.6.0",
    "lucide-react": "^0.383.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0"
  }
}
```

### Servicio de API base

```typescript
// services/api.ts
import axios from 'axios'
import { supabase } from './supabase'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Interceptor: agregar JWT automáticamente
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

export default api
```

---

## DOCKER COMPOSE PARA DESARROLLO

```yaml
# docker-compose.yml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    volumes:
      - ./backend:/app
    command: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
    command: npm run dev -- --host
    depends_on:
      - backend
```

---

## VARIABLES DE ENTORNO

```env
# .env.example — Backend
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # ⚠️ NUNCA al frontend
SUPABASE_JWT_SECRET=your-jwt-secret
DEBUG=false
ALLOWED_ORIGINS=https://[tu-dominio].vercel.app

# .env.example — Frontend
VITE_API_URL=https://[backend].railway.app
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...      # ✅ OK para frontend
```

---

## DEPLOY ESTÁNDAR

| Servicio | Deployment |
|---------|------------|
| Frontend (React/Vite) | Vercel |
| Backend (FastAPI) | Railway |
| Base de datos | Supabase |
| Automatizaciones | n8n en Railway |

---

## CLAUDE.md TEMPLATE PARA ESTE STACK

```markdown
# [Nombre Proyecto]

## Stack
- Backend: FastAPI + Python 3.11+
- Frontend: React 18 + TypeScript + Vite + Tailwind
- DB: Supabase PostgreSQL
- n8n [si aplica]
- Deploy: Vercel (frontend) + Railway (backend)

## Comandos
\`\`\`bash
# Backend
cd backend && uvicorn app.main:app --reload
# Frontend
cd frontend && npm run dev
# Todo junto
docker-compose up
\`\`\`

## Variables de entorno
Ver .env.example (raíz del proyecto)

## Reglas CRÍTICAS
- service_role_key solo en backend — NUNCA frontend
- Soft deletes siempre (is_active = false)
- Validación en backend con Pydantic
- JWT validado en cada endpoint protegido
- Roles: [listar roles]

## Arquitectura
Ver docs/architecture.md
```

---
*Estándar v1.0 — Basado en APP.PRESTAMISTA y DM Cars*
