# MÓDULO: audit-historial

## Descripción

Tabla de historial inmutable para audit trail. Registra todas las acciones relevantes del sistema. Insert-only: nunca se actualiza ni elimina. Presente en todos los proyectos.

## Stack
Ambos (B y D)

## Proyectos que lo usan
- GoJulito — tabla `historial`, insert-only, no updates/deletes
- Finanzas-jy — tabla `historial` con soft deletes (`deleted_at`)
- DM Cars — audit trail en cada módulo
- APP.PRESTAMISTA — historial de pagos inmutable

---

## Schema estándar

```sql
CREATE TABLE historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla TEXT NOT NULL,           -- qué tabla fue afectada
  operacion TEXT NOT NULL,       -- INSERT / UPDATE / DELETE
  registro_id UUID,              -- ID del registro afectado
  datos_anteriores JSONB,        -- estado antes del cambio
  datos_nuevos JSONB,            -- estado después del cambio
  usuario_id UUID REFERENCES auth.users(id),
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
  -- NO tiene updated_at ni deleted_at — es inmutable
);

-- RLS: solo insert, nadie puede update ni delete
ALTER TABLE historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert historial" ON historial
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "select historial propio" ON historial
  FOR SELECT USING (usuario_id = auth.uid());

-- Admins ven todo
CREATE POLICY "admin ve todo historial" ON historial
  FOR SELECT USING ((auth.jwt() ->> 'role') = 'admin');
```

## Trigger automático (opcional)

```sql
-- Trigger para registrar automáticamente cambios en una tabla
CREATE OR REPLACE FUNCTION log_cambios()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO historial (tabla, operacion, registro_id, datos_anteriores, datos_nuevos)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar a una tabla
CREATE TRIGGER tr_historial_clientes
  AFTER INSERT OR UPDATE OR DELETE ON clientes
  FOR EACH ROW EXECUTE FUNCTION log_cambios();
```

## Uso en Stack B (Next.js)

```typescript
// Solo insertar, nunca modificar
const { error } = await supabase
  .from('historial')
  .insert({
    tabla: 'clientes',
    operacion: 'UPDATE',
    registro_id: clienteId,
    datos_anteriores: datosViejos,
    datos_nuevos: datosNuevos
  })
```

## Uso en Stack D (FastAPI)

```python
async def log_accion(tabla: str, operacion: str, registro_id: str, datos_ant=None, datos_nue=None, user_id: str = None):
    supabase.table("historial").insert({
        "tabla": tabla,
        "operacion": operacion,
        "registro_id": registro_id,
        "datos_anteriores": datos_ant,
        "datos_nuevos": datos_nue,
        "usuario_id": user_id
    }).execute()
```

## Consideraciones

- NUNCA agregar `UPDATE` o `DELETE` permissions en la política RLS de historial
- Si el negocio requiere "borrar historial" → es un mal requerimiento, rechazarlo
- Para grandes volúmenes, considerar particionado por mes en Supabase
- Los campos `datos_anteriores` y `datos_nuevos` en JSONB permiten queries flexibles

## Historial de cambios

| Fecha | Cambio | Proyecto origen |
|-------|--------|----------------|
| 2026-03-28 | Módulo creado consolidando GoJulito + Finanzas-jy | CEREBRO |

*Madurez: ★★★★★*
