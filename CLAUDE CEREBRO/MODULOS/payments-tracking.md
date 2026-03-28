# MÓDULO: payments-tracking

## Descripción

Tracking de pagos con historial inmutable, lógica de cuotas, pagos parciales, mora automática y vistas de estado. Extraído de APP.PRESTAMISTA (el más completo) y GoJulito/Finanzas-jy (versiones más simples).

## Stack
B y D

## Proyectos que lo usan
- APP.PRESTAMISTA — sistema completo: cuotas, mora, pagos parciales, cobros por zona (Stack D)
- GoJulito — pagos de clientes (Stack B)
- Finanzas-jy — movimientos financieros (Stack B, versión simplificada)

---

## Schema SQL — Versión completa (APP.PRESTAMISTA)

```sql
-- Cuotas generadas al crear un préstamo
CREATE TYPE estado_cuota AS ENUM ('pendiente', 'pagada', 'mora', 'pago_parcial', 'condonada');
CREATE TYPE periodicidad AS ENUM ('diaria', 'semanal', 'quincenal', 'mensual');

CREATE TABLE cuotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id UUID NOT NULL REFERENCES prestamos(id),
  numero_cuota INTEGER NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  monto_capital DECIMAL(12,2) NOT NULL,
  monto_interes DECIMAL(12,2) NOT NULL DEFAULT 0,
  monto_total DECIMAL(12,2) NOT NULL,
  monto_pagado DECIMAL(12,2) NOT NULL DEFAULT 0,
  recargo_mora DECIMAL(12,2) NOT NULL DEFAULT 0,
  estado estado_cuota NOT NULL DEFAULT 'pendiente',
  fecha_pago DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pagos — historial INMUTABLE (nunca se modifica)
CREATE TABLE pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id UUID NOT NULL REFERENCES prestamos(id),
  cuota_id UUID REFERENCES cuotas(id),
  monto DECIMAL(12,2) NOT NULL,
  tipo VARCHAR(20) NOT NULL, -- 'total', 'parcial', 'anticipado'
  cobrador_id UUID REFERENCES profiles(id),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
  -- SIN updated_at ni deleted_at — es inmutable
);

-- Trigger que actualiza el saldo del préstamo tras un pago
CREATE OR REPLACE FUNCTION after_pago_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar cuota correspondiente
  UPDATE cuotas
  SET monto_pagado = monto_pagado + NEW.monto,
      estado = CASE
        WHEN (monto_pagado + NEW.monto) >= monto_total THEN 'pagada'
        WHEN (monto_pagado + NEW.monto) > 0 THEN 'pago_parcial'
        ELSE estado
      END,
      fecha_pago = CASE
        WHEN (monto_pagado + NEW.monto) >= monto_total THEN CURRENT_DATE
        ELSE fecha_pago
      END
  WHERE id = NEW.cuota_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_after_pago AFTER INSERT ON pagos
  FOR EACH ROW EXECUTE FUNCTION after_pago_insert();
```

---

## Vista de cobros del día (patrón de APP.PRESTAMISTA)

```sql
-- Vista con semáforo visual para cobradores
CREATE VIEW v_cobros_hoy AS
SELECT
  c.id AS cuota_id,
  cl.nombre AS cliente,
  cl.telefono,
  cl.direccion,
  cl.zona,
  c.monto_total - c.monto_pagado AS total_a_cobrar,
  c.fecha_vencimiento,
  CURRENT_DATE - c.fecha_vencimiento AS dias_atraso,
  CASE
    WHEN c.fecha_vencimiento = CURRENT_DATE THEN 'amarillo'   -- vence hoy
    WHEN c.fecha_vencimiento < CURRENT_DATE
         AND CURRENT_DATE - c.fecha_vencimiento <= 7 THEN 'naranja'  -- 1-7 días atraso
    WHEN c.fecha_vencimiento < CURRENT_DATE THEN 'rojo'       -- > 7 días atraso
  END AS semaforo
FROM cuotas c
JOIN prestamos p ON p.id = c.prestamo_id
JOIN clientes cl ON cl.id = p.cliente_id
WHERE c.estado IN ('pendiente', 'pago_parcial', 'mora')
  AND c.fecha_vencimiento <= CURRENT_DATE
  AND p.estado = 'activo'
ORDER BY dias_atraso DESC;
```

---

## Mora automática — job nocturno (APScheduler — Stack D)

```python
# app/services/mora_service.py
from datetime import date
from decimal import Decimal

async def calcular_mora_diaria(supabase, config: dict):
    """Corre a las 00:30. Aplica recargo a cuotas vencidas."""
    gracia_dias = config.get("dias_gracia", 3)
    tasa_mora = Decimal(str(config.get("tasa_mora_diaria", 0.02)))  # 2% diario por defecto

    # Cuotas en mora (vencidas hace más de N días de gracia)
    result = supabase.table("cuotas").select("*") \
        .eq("estado", "pendiente") \
        .lt("fecha_vencimiento", (date.today() - timedelta(days=gracia_dias)).isoformat()) \
        .execute()

    for cuota in result.data:
        dias_atraso = (date.today() - date.fromisoformat(cuota["fecha_vencimiento"])).days
        recargo = Decimal(str(cuota["monto_total"])) * tasa_mora * dias_atraso

        supabase.table("cuotas").update({
            "estado": "mora",
            "recargo_mora": float(recargo),
            "updated_at": datetime.now().isoformat()
        }).eq("id", cuota["id"]).execute()
```

---

## Versión simplificada — Stack B (Finanzas-jy / GoJulito)

```sql
-- Tabla de movimientos (Finanzas-jy)
CREATE TYPE tipo_movimiento AS ENUM ('ingreso', 'compromiso_fijo', 'gasto_variable', 'inversion');

CREATE TABLE movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tipo tipo_movimiento NOT NULL,
  monto DECIMAL(12,0) NOT NULL,  -- ARS sin decimales
  descripcion TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  deleted_at TIMESTAMPTZ,        -- soft delete
  created_at TIMESTAMPTZ DEFAULT now()
);
```

```typescript
// Formateo ARS (patrón Finanzas-jy)
export const formatARS = (monto: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto)
```

---

## Consideraciones

- Los pagos son INMUTABLES: tabla `pagos` sin `updated_at` ni `deleted_at`
- Si se registra un pago incorrecto: crear pago negativo (ajuste), nunca modificar el original
- La mora automática debe correr DESPUÉS de medianoche para no afectar pagos del mismo día
- El semáforo visual es crítico para UX de cobradores en campo
- Para cálculo de amortización: generar todas las cuotas al crear el préstamo, no calcularlas on-demand

## Historial de cambios

| Fecha | Cambio | Proyecto origen |
|-------|--------|----------------|
| 2026-03-28 | Módulo creado desde APP.PRESTAMISTA (más completo) + Finanzas-jy | CEREBRO |

*Madurez: ★★★★☆*
