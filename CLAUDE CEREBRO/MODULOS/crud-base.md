# MÓDULO: crud-base

## Descripción

Patrón base de CRUD con soft delete, RLS en Supabase, historial de auditoría e IDs legibles. Aplicado en todos los proyectos. Incluye convenciones de ENUMs, Zod validation, y patrón de 3 clientes Supabase (Stack B).

## Stack
Ambos (B y D), con implementación diferente.

## Proyectos que lo usan
- DM Cars — CRUD de vehículos, clientes, ventas, etc. (Stack D)
- APP.PRESTAMISTA — CRUD de clientes, préstamos, cuotas, pagos (Stack D)
- GoJulito — CRUD de clientes, visas, seminarios (Stack B)
- Finanzas-jy — CRUD de movimientos (Stack B)

---

## Convenciones universales

### Soft delete — SIEMPRE usar esto, NUNCA `DELETE`

```sql
-- En todas las tablas operativas
ALTER TABLE nombre_tabla ADD COLUMN deleted_at TIMESTAMPTZ;

-- Para filtrar registros activos en queries
SELECT * FROM nombre_tabla WHERE deleted_at IS NULL;
```

```python
# Stack D — FastAPI: nunca hacer DELETE
# Soft delete:
supabase.table("clientes").update({"deleted_at": datetime.now().isoformat()}).eq("id", id).execute()
```

```typescript
// Stack B — Next.js: nunca hacer DELETE
await supabase.from('clientes').update({ deleted_at: new Date().toISOString() }).eq('id', id)
```

### RLS policies estándar

```sql
-- Habilitar RLS en toda tabla nueva
ALTER TABLE nombre_tabla ENABLE ROW LEVEL SECURITY;

-- Política básica: usuario autenticado ve todo (ajustar según el proyecto)
CREATE POLICY "auth_select" ON nombre_tabla FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_insert" ON nombre_tabla FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update" ON nombre_tabla FOR UPDATE USING (auth.uid() IS NOT NULL);
-- NO crear policy de DELETE — usamos soft delete

-- Política con roles (usando JWT metadata)
CREATE POLICY "admin_all" ON nombre_tabla FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "user_own" ON nombre_tabla FOR SELECT USING (user_id = auth.uid());
```

### Helpers RLS en SQL (patrón de APP.PRESTAMISTA)

```sql
-- Funciones helper para usar en policies
CREATE OR REPLACE FUNCTION get_user_rol() RETURNS TEXT AS $$
  SELECT rol FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT get_user_rol() = 'admin';
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## Stack B — Implementación Next.js

### Estructura de archivos

```
app/
├── (protected)/
│   └── [entidad]/
│       ├── page.tsx           # lista
│       └── [id]/
│           └── page.tsx       # detalle/edición
└── api/
    └── [entidad]/
        ├── route.ts           # GET lista + POST crear
        └── [id]/
            └── route.ts       # GET uno + PATCH + DELETE(soft)
```

### Schema Zod

```typescript
// lib/validations/cliente.ts
import { z } from 'zod'

export const ClienteSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email().optional(),
  telefono: z.string().optional(),
})

export const ClienteUpdateSchema = ClienteSchema.partial()
export type Cliente = z.infer<typeof ClienteSchema>
```

### GET + POST route

```typescript
// app/api/clientes/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ClienteSchema } from '@/lib/validations/cliente'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = ClienteSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createAdminClient() // admin para bypass RLS en insert
  const { data, error } = await supabase.from('clientes').insert(parsed.data).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
```

### PATCH + soft DELETE route

```typescript
// app/api/clientes/[id]/route.ts
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()
  const parsed = ClienteUpdateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clientes').update(parsed.data).eq('id', params.id).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  // SOFT DELETE — nunca DELETE real
  const { error } = await supabase
    .from('clientes').update({ deleted_at: new Date().toISOString() }).eq('id', params.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return new Response(null, { status: 204 })
}
```

---

## Stack D — Implementación FastAPI

```python
# app/routers/clientes.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.core.auth import get_current_user
from app.core.db import get_supabase

router = APIRouter(prefix="/clientes", tags=["clientes"])

class ClienteCreate(BaseModel):
    nombre: str
    email: Optional[str] = None
    telefono: Optional[str] = None

class ClienteUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None

@router.get("/")
async def listar_clientes(user=Depends(get_current_user), supabase=Depends(get_supabase)):
    result = supabase.table("clientes").select("*").is_("deleted_at", "null").execute()
    return result.data

@router.post("/", status_code=201)
async def crear_cliente(cliente: ClienteCreate, user=Depends(get_current_user), supabase=Depends(get_supabase)):
    result = supabase.table("clientes").insert(cliente.model_dump()).execute()
    return result.data[0]

@router.patch("/{id}")
async def actualizar_cliente(id: str, cliente: ClienteUpdate, user=Depends(get_current_user), supabase=Depends(get_supabase)):
    data = {k: v for k, v in cliente.model_dump().items() if v is not None}
    result = supabase.table("clientes").update(data).eq("id", id).execute()
    if not result.data:
        raise HTTPException(404, "Cliente no encontrado")
    return result.data[0]

@router.delete("/{id}", status_code=204)
async def eliminar_cliente(id: str, user=Depends(get_current_user), supabase=Depends(get_supabase)):
    # SOFT DELETE
    supabase.table("clientes").update({"deleted_at": datetime.now().isoformat()}).eq("id", id).execute()
```

---

## IDs legibles (human-readable IDs)

```sql
-- Función SQL para generar IDs legibles (patrón de GoJulito)
CREATE OR REPLACE FUNCTION generate_readable_id(prefix TEXT, tabla TEXT)
RETURNS TEXT AS $$
DECLARE
  contador INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO contador FROM nombre_tabla;
  RETURN prefix || '-' || LPAD(contador::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Uso en trigger:
-- CLI-0001, VIS-0001, PRE-0001, etc.
```

---

## ADVERTENCIA CRÍTICA — Bug registrado en EduWorkspace

**El nombre de la columna de ownership varía por tabla.** Antes de usar `user_id` en RLS policies o queries, verificar el nombre real de la columna en el schema. En GoJulito causó fallo completo del CRUD. Siempre hacer:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'nombre_tabla' AND column_name LIKE '%user%' OR column_name LIKE '%owner%';
```

## Historial de cambios

| Fecha | Cambio | Proyecto origen |
|-------|--------|----------------|
| 2026-03-28 | Módulo creado consolidando los 4 proyectos activos | CEREBRO |

*Madurez: ★★★★☆*
