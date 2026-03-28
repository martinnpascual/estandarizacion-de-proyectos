# 🔌 ESTÁNDARES REST + API

> **Versión:** 1.0 | **Fecha:** 2026-03-28
> Aplica a: API Routes de Next.js y endpoints de FastAPI

---

## NAMING CONVENTIONS

### URLs

```
# Formato: /api/[recurso-en-plural]
GET    /api/clientes              # Listar
POST   /api/clientes              # Crear
GET    /api/clientes/:id          # Obtener uno
PATCH  /api/clientes/:id          # Actualizar parcial
DELETE /api/clientes/:id          # Soft delete (NUNCA borrar)

# Sub-recursos
GET    /api/clientes/:id/pagos    # Pagos de un cliente
POST   /api/clientes/:id/pagos    # Crear pago para un cliente
```

### Nombres de campos en JSON

```json
// Usar snake_case en todas las respuestas (consistente con Supabase/PostgreSQL)
{
  "id": "uuid",
  "nombre_completo": "string",
  "fecha_creacion": "ISO8601",
  "is_active": true
}
```

---

## PATRÓN DE RESPUESTA UNIFICADO

Todas las respuestas API deben seguir este patrón (consistente con Supabase SDK):

```typescript
// ✅ CORRECTO — siempre { data, error }
{
  "data": { ... } | [...] | null,
  "error": "string" | null
}

// Ejemplos:
// Éxito con datos:
{ "data": { "id": "123", "nombre": "Juan" }, "error": null }

// Éxito sin datos (ej: DELETE):
{ "data": null, "error": null }

// Error:
{ "data": null, "error": "Cliente no encontrado" }
```

### Implementación Next.js

```typescript
// Respuesta exitosa
return Response.json({ data: resultado, error: null }, { status: 200 })

// Creación exitosa
return Response.json({ data: nuevo_registro, error: null }, { status: 201 })

// Error de validación
return Response.json({ data: null, error: "Datos inválidos" }, { status: 400 })

// No autenticado
return Response.json({ data: null, error: "No autenticado" }, { status: 401 })

// Sin permisos
return Response.json({ data: null, error: "Sin permisos" }, { status: 403 })

// No encontrado
return Response.json({ data: null, error: "No encontrado" }, { status: 404 })

// Error del servidor
return Response.json({ data: null, error: "Error interno" }, { status: 500 })
```

### Implementación FastAPI

```python
from fastapi import HTTPException
from pydantic import BaseModel
from typing import Generic, TypeVar, Optional

T = TypeVar('T')

class APIResponse(BaseModel, Generic[T]):
    data: Optional[T] = None
    error: Optional[str] = None

# En endpoints:
@router.get("/clientes", response_model=APIResponse[list[ClienteResponse]])
async def listar_clientes():
    try:
        clientes = await service.listar()
        return APIResponse(data=clientes, error=None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## PAGINACIÓN ESTÁNDAR

```typescript
// Query params estándar para paginación
GET /api/clientes?page=1&per_page=20&search=juan&order=created_at&dir=desc

// Respuesta paginada:
{
  "data": {
    "items": [...],
    "total": 150,
    "page": 1,
    "per_page": 20,
    "total_pages": 8
  },
  "error": null
}
```

---

## FILTROS Y BÚSQUEDA

```typescript
// Patrón de query params para filtros
GET /api/prestamos?estado=activo&cobrador_id=xxx&fecha_desde=2026-01-01

// En Supabase:
let query = supabase.from('prestamos').select('*')

if (searchParams.get('estado')) {
  query = query.eq('estado', searchParams.get('estado'))
}
if (searchParams.get('cobrador_id')) {
  query = query.eq('cobrador_id', searchParams.get('cobrador_id'))
}
if (searchParams.get('fecha_desde')) {
  query = query.gte('created_at', searchParams.get('fecha_desde'))
}
```

---

## MANEJO DE ERRORES

### Errores conocidos vs desconocidos

```typescript
// Errores de Supabase (conocidos)
const { data, error } = await supabase.from('tabla').select('*')
if (error) {
  if (error.code === 'PGRST116') {
    return Response.json({ data: null, error: 'No encontrado' }, { status: 404 })
  }
  return Response.json({ data: null, error: error.message }, { status: 500 })
}

// Errores de Zod (validación)
const result = schema.safeParse(body)
if (!result.success) {
  return Response.json({
    data: null,
    error: result.error.errors.map(e => e.message).join(', ')
  }, { status: 400 })
}
```

### Logging de errores

```typescript
// En producción, loggear errores críticos
if (error) {
  console.error(`[API Error] ${request.method} ${request.url}:`, error)
  // Opcional: enviar a Supabase logs o servicio externo
}
```

---

## SOFT DELETE ESTÁNDAR

```typescript
// NUNCA usar DELETE en la base de datos
// ✅ SIEMPRE soft delete:

// Next.js
const { error } = await supabase
  .from('tabla')
  .update({
    is_deleted: true,
    deleted_at: new Date().toISOString(),
    deleted_by: userId
  })
  .eq('id', id)

// FastAPI
@router.delete("/{id}", status_code=204)
async def eliminar(id: str, current_user=Depends(get_current_user)):
    await supabase.table('tabla').update({
        'is_deleted': True,
        'deleted_at': datetime.utcnow().isoformat(),
        'deleted_by': current_user['sub']
    }).eq('id', id).execute()
```

### Filtro de registros activos

```sql
-- Siempre filtrar is_deleted en las queries
-- O usar View para esconder registros borrados:
CREATE VIEW clientes_activos AS
  SELECT * FROM clientes WHERE is_deleted = false;
```

---

## CONVENCIÓN DE NOMBRES EN BASE DE DATOS

```sql
-- Tablas: plural, snake_case
clientes, prestamos, pagos, ordenes_trabajo

-- Campos: snake_case
id, nombre_completo, fecha_nacimiento, is_active, created_at

-- Campos de auditoría estándar (en TODAS las tablas)
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()
created_by  UUID REFERENCES usuarios(id)  -- opcional
is_deleted  BOOLEAN DEFAULT false
deleted_at  TIMESTAMPTZ

-- Trigger para updated_at automático
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON [tabla]
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
```

---
*Estándar v1.0 — Basado en GoJulito, APP.PRESTAMISTA y DM Cars*
