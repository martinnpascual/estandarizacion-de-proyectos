# ⚡ ESTÁNDAR: Next.js 14 + Supabase

> **Versión:** 1.0 | **Fecha:** 2026-03-28
> **Proyectos de referencia:** GoJulito, Finanzas-JY

---

## SETUP INICIAL ESTÁNDAR

### 1. Crear proyecto

```bash
npx create-next-app@latest [nombre-proyecto] \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"
```

### 2. Instalar dependencias base

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install zod
npm install lucide-react
npm install -D @types/node
```

### 3. Dependencias opcionales (evaluar por proyecto)

```bash
# Componentes UI
npm install class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-dialog  # shadcn base

# Formularios
npm install react-hook-form @hookform/resolvers

# Fechas
npm install date-fns

# Tablas
npm install @tanstack/react-table

# Gráficos
npm install recharts
```

---

## ESTRUCTURA DE CARPETAS ESTÁNDAR

```
[nombre-proyecto]/
├── .planning/                    ← GSD (obligatorio)
│   ├── PROJECT.md
│   ├── REQUIREMENTS.md
│   ├── ROADMAP.md
│   ├── STATE.md
│   └── PLAN.md
├── app/
│   ├── (auth)/                   ← Grupo de rutas de autenticación
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/              ← Rutas protegidas
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── [modulo]/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── layout.tsx            ← Layout con sidebar/nav
│   ├── api/
│   │   └── [modulo]/
│   │       └── route.ts
│   ├── globals.css
│   └── layout.tsx                ← Root layout
├── components/
│   ├── ui/                       ← Componentes base (botones, inputs, etc.)
│   ├── [modulo]/                 ← Componentes específicos por módulo
│   └── shared/                   ← Componentes compartidos (nav, sidebar, etc.)
├── lib/
│   ├── supabase/
│   │   ├── client.ts             ← Cliente Supabase para componentes client
│   │   ├── server.ts             ← Cliente Supabase para server components
│   │   └── middleware.ts         ← Cliente para middleware
│   ├── validations/              ← Schemas Zod por módulo
│   └── utils.ts                  ← Utilidades generales
├── hooks/                        ← Custom hooks de React
├── types/                        ← TypeScript types e interfaces
├── database/
│   └── migrations/               ← Archivos SQL de migraciones
├── public/
├── CLAUDE.md                     ← Contexto para Claude
├── .env.example
├── .env.local                    ← NO commitear
├── middleware.ts                 ← Auth middleware
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## CONFIGURACIÓN SUPABASE

### Variables de entorno

```env
# .env.example
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# SUPABASE_SERVICE_ROLE_KEY solo si se necesita en API Routes
```

### Cliente para componentes cliente

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Cliente para Server Components / API Routes

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

### Middleware de autenticación

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redirigir a login si no autenticado y ruta protegida
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

---

## PATRONES DE CÓDIGO ESTÁNDAR

### Patrón de respuesta API unificado

```typescript
// Siempre retornar { data, error } — consistente con Supabase
// En API Routes:
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tabla')
    .select('*')

  if (error) {
    return Response.json({ data: null, error: error.message }, { status: 500 })
  }

  return Response.json({ data, error: null })
}
```

### Patrón de validación con Zod

```typescript
// lib/validations/cliente.ts
import { z } from 'zod'

export const clienteSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido').optional(),
  telefono: z.string().min(8, 'Teléfono inválido'),
})

export type ClienteInput = z.infer<typeof clienteSchema>
```

### Soft delete — patrón obligatorio

```typescript
// NUNCA hacer DELETE directo
// Siempre usar soft delete:
const { error } = await supabase
  .from('tabla')
  .update({
    is_deleted: true,
    deleted_at: new Date().toISOString()
  })
  .eq('id', id)
```

---

## RLS (ROW LEVEL SECURITY) — PATRONES ESTÁNDAR

```sql
-- Habilitar RLS en todas las tablas sensibles
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Política: solo ver sus propios registros (si aplica)
CREATE POLICY "usuarios_ven_sus_clientes"
  ON clientes FOR SELECT
  USING (auth.uid() = user_id);

-- Política: admin ve todo
CREATE POLICY "admin_ve_todo"
  ON clientes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );
```

---

## DEPLOY ESTÁNDAR

```bash
# Vercel (recomendado para Next.js)
# 1. Conectar repo a Vercel
# 2. Configurar variables de entorno en Vercel Dashboard
# 3. Deploy automático desde main

# Variables en Vercel:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## CLAUDE.md TEMPLATE PARA ESTE STACK

```markdown
# [Nombre Proyecto]

## Stack
- Next.js 14 App Router + TypeScript
- Supabase (auth, db, storage)
- Tailwind CSS
- n8n [si aplica]
- Deployment: Vercel

## Comandos
\`\`\`bash
npm run dev   # localhost:3000
\`\`\`

## Variables de entorno
Ver .env.example

## Reglas CRÍTICAS
- NUNCA Server Actions
- Soft deletes siempre (is_deleted + deleted_at)
- Validación solo en servidor (Zod en API routes)
- RLS habilitado en Supabase
- Patrón { data, error } en todas las respuestas API

## Roles
- Admin: [descripción]
- [Rol 2]: [descripción]

## Base de datos
- Migraciones en /database/migrations/
- Convención de nombres: snake_case
```

---
*Estándar v1.0 — Basado en GoJulito. Actualizar con cada mejora detectada.*
