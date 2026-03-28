# STACKS TECNOLÓGICOS

> Perfiles de stack aprobados. Todo proyecto nuevo debe usar uno de estos perfiles. Si se necesita uno nuevo, documentarlo aquí antes de usarlo.

---

## Perfil A — Automatización sin Web

**Cuándo usar:** Cliente sin necesidad de app web. Procesos de automatización, notificaciones, tracking simple.

| Capa | Tecnología |
|------|-----------|
| Lógica / Automatización | n8n |
| Datos | Google Sheets (simple) / Supabase (si crece) |
| Interface | Telegram Bot |
| IA | Claude API (Anthropic) |
| Notificaciones | n8n → Telegram / Email |

**Responsable:** Edu
**Ejemplos de uso:** Tracking de clientes por Telegram, reportes automáticos, alertas de vencimiento.

---

## Perfil B — Web App (Edu)

**Cuándo usar:** Cliente necesita dashboard web, gestión de datos, múltiples usuarios.

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js App Router | 14+ |
| Lenguaje | TypeScript | strict mode |
| Estilos | Tailwind CSS | + shadcn/ui |
| Base de datos | Supabase | PostgreSQL + RLS |
| Auth | Supabase Auth | JWT |
| Deploy | Dokploy | VPS propio |
| Contenedor | Docker | - |
| Validación | Zod | - |
| Estado global | Context API / Zustand | según complejidad |

**Responsable:** Edu
**Proyectos actuales:** GoJulito, Finanzas-jy, Jamrock

**Estructura de carpetas estándar:**
```
/
├── app/                  # routes (App Router)
│   ├── (auth)/           # rutas públicas: login, register
│   ├── (protected)/      # rutas con auth: dashboard, etc.
│   └── api/              # API routes
├── components/           # componentes reutilizables
├── lib/
│   ├── supabase/
│   │   ├── client.ts     # browser (solo auth)
│   │   ├── server.ts     # server (RLS-aware)
│   │   └── admin.ts      # service role (solo API routes)
│   └── validations/      # schemas Zod
├── [CLIENTE]/            # carpeta con docs del cliente
├── .claude/              # configuración Claude Code
├── .planning/            # archivos GSD
├── middleware.ts         # auth redirect
├── CLAUDE.md
└── README.md
```

---

## Perfil C — Híbrido (A → B)

**Cuándo usar:** Cliente empieza con automatización simple y va a escalar a app web.

**Fase 1:** Implementar Perfil A
**Fase 2:** Migrar/extender a Perfil B cuando el negocio lo justifique

**Regla:** Usar Supabase desde el principio (incluso en Fase 1) para no migrar datos después.

---

## Perfil D — Web App Full-Stack (Martin)

**Cuándo usar:** Proyectos con lógica de negocio compleja en backend, PDFs, integraciones externas de peso, o cuando el cliente necesita un API robusto.

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Backend | FastAPI | Python 3.11+ |
| Frontend | React + TypeScript + Vite | React 18 |
| Estilos | Tailwind CSS | - |
| Base de datos | Supabase | PostgreSQL + RLS |
| Auth | Supabase Auth | JWT |
| PDF | WeasyPrint + Jinja2 | - |
| Estado global | Zustand | - |
| Contenedor | Docker + Docker Compose | dev + prod |
| Deploy | Dokploy / Railway / Vercel | según capa |
| Notificaciones | n8n + Telegram + SMTP | - |

**Responsable:** Martin
**Proyectos actuales:** DM Cars (CONSECIONARIA.MD), APP.PRESTAMISTA

**Estructura de carpetas estándar:**
```
/
├── backend/
│   ├── app/
│   │   ├── api/          # routers FastAPI
│   │   ├── models/       # Pydantic models
│   │   ├── services/     # lógica de negocio
│   │   └── core/         # config, auth, DB
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/        # o routes/ con React Router
│   │   ├── store/        # Zustand
│   │   ├── services/     # API calls
│   │   └── types/
│   ├── Dockerfile
│   └── vite.config.ts
├── db/                   # migraciones SQL
├── n8n/                  # workflows exportados
├── docs/                 # documentación técnica
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── CLAUDE.md
└── README.md
```

---

## Comparativa de perfiles

| Criterio | A | B | C | D |
|---------|---|---|---|---|
| Web app | No | Sí | Sí | Sí |
| Backend propio | No | No (Supabase) | No/Sí | Sí |
| n8n automatización | Sí | Opcional | Sí | Sí |
| PDF generation | No | Limitado | Limitado | Sí |
| Complejidad inicial | Baja | Media | Baja→Media | Alta |
| Tiempo de arranque | 1-2 sem | 2-4 sem | 1-2 sem | 3-6 sem |
| Responsable | Edu | Edu | Edu | Martin |

---

## Decisión de stack — árbol de preguntas

```
¿Necesita app web?
├── NO → Perfil A
└── SÍ
    ├── ¿Lógica de backend compleja? (PDFs, APIs externas pesadas, cálculos)
    │   ├── SÍ → Perfil D (Martin)
    │   └── NO
    │       ├── ¿Va a empezar simple y escalar? → Perfil C
    │       └── ¿Ya tiene claridad de scope? → Perfil B
```

---

## Estándares comunes (todos los perfiles)

Independientemente del perfil, SIEMPRE:

- **Supabase** como base de datos (PostgreSQL + Auth + RLS)
- **Soft deletes** (`deleted_at TIMESTAMPTZ`, nunca `DELETE`)
- **Historial/audit** inmutable (tabla `historial`, insert-only)
- **RLS** en todas las tablas
- **Variables de entorno** en `.env` (nunca en código)
- **CLAUDE.md** en la raíz del proyecto
- **GSD artifacts** en `.planning/` o raíz: `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`

*Última actualización: 2026-03-28*
