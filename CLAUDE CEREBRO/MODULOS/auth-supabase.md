# MÓDULO: auth-supabase

## Descripción

Autenticación completa con Supabase Auth. Cubre: login/logout, protección de rutas, tres tipos de cliente Supabase, RLS policies, y gestión de roles de usuario.

## Stack
Ambos (B y D), con implementación diferente por stack.

## Proyectos que lo usan
- GoJulito — Next.js, roles: admin / colaborador
- Finanzas-jy — Next.js, usuario único con auth
- DM Cars — FastAPI + React, roles: admin / vendedor / cajero / mecánico
- APP.PRESTAMISTA — FastAPI + React, roles: admin / cobrador / read-only

## Cuándo aplicarlo
Siempre. Todos los proyectos usan Supabase Auth.

---

## Implementación Stack B (Next.js)

### Tres tipos de cliente Supabase

```typescript
// lib/supabase/client.ts — Browser (solo para auth, en Client Components)
import { createBrowserClient } from '@supabase/ssr'
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// lib/supabase/server.ts — Server (RLS-aware, en Server Components y API Routes)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
export const createClient = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  )
}

// lib/supabase/admin.ts — Service Role (SOLO en API Routes, NUNCA en cliente)
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
export const createAdminClient = () =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
```

### Middleware de protección de rutas

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options)) } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return supabaseResponse
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
```

---

## Implementación Stack D (FastAPI)

### JWT verification con Supabase
```python
# app/core/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
import os

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))
    try:
        response = supabase.auth.get_user(token)
        return response.user
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
```

---

## RLS Policies estándar

```sql
-- Política básica: usuario solo ve sus propios datos
ALTER TABLE nombre_tabla ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios ven sus datos" ON nombre_tabla
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "usuarios crean sus datos" ON nombre_tabla
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Para roles (usando metadata del token)
CREATE POLICY "solo admin puede ver todo" ON nombre_tabla
  FOR ALL USING (
    (auth.jwt() ->> 'role') = 'admin'
  );
```

---

## Variables de entorno requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # NUNCA exponer en cliente
```

## Consideraciones

- `SUPABASE_SERVICE_ROLE_KEY` NUNCA va en el cliente/frontend — solo en API routes o backend
- El cliente browser solo sirve para auth (login/logout/getUser)
- Para queries de datos, usar siempre el cliente server (respeta RLS)
- Para operaciones admin (bypass RLS), usar admin client solo en API routes

## Historial de cambios

| Fecha | Cambio | Proyecto origen |
|-------|--------|----------------|
| 2026-03-28 | Módulo creado con patrones de todos los proyectos | CEREBRO |

*Madurez: ★★★★★*
