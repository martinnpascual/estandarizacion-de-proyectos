# 🔐 MÓDULO: Auth + RBAC

> **Versión:** 1.0 | **Fecha:** 2026-03-28
> **Estado:** Canónico — usar este patrón en todos los proyectos nuevos

---

## DESCRIPCIÓN

Módulo de autenticación y control de acceso basado en roles. Implementado en todos los proyectos del portfolio.

**Basado en:** Supabase Auth + roles custom en tabla `usuarios`

---

## IMPLEMENTADO EN

| Proyecto | Stack | Roles | Versión |
|----------|-------|-------|---------|
| GoJulito | Next.js | Admin, Colaborador | v1 |
| APP.PRESTAMISTA | FastAPI | Admin, Cobrador, Read-only | v1 |
| DM Cars | FastAPI | Admin, Vendedor, Cajero, Mecánico | v1 |
| Finanzas-JY | Next.js | Por definir | En desarrollo |

---

## DISEÑO DE BASE DE DATOS

```sql
-- Tabla de usuarios extendida (complementa auth.users de Supabase)
CREATE TABLE usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'operador', 'visor')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para sincronizar con auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usuarios (id, nombre, email, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'rol', 'visor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## RLS ESTÁNDAR

```sql
-- Admin ve todo
CREATE POLICY "admin_full_access" ON [tabla]
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.is_active = true
    )
  );

-- Usuario ve solo sus propios registros
CREATE POLICY "user_own_records" ON [tabla]
  FOR SELECT USING (user_id = auth.uid());

-- Operador puede crear/leer
CREATE POLICY "operador_create_read" ON [tabla]
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol IN ('admin', 'operador')
    )
  );
```

---

## IMPLEMENTACIÓN NEXT.JS

Ver: `nextjs_implementation.md`

Puntos clave:
- Middleware de Next.js para proteger rutas
- Hook `useUser()` para acceder al usuario actual
- Componente `<RoleGate role="admin">` para UI condicional

---

## IMPLEMENTACIÓN FASTAPI

Ver: `fastapi_implementation.md`

Puntos clave:
- Dependency `get_current_user` que valida JWT de Supabase
- Dependency `require_role()` para endpoints específicos
- El rol se guarda en `user_metadata` del JWT de Supabase

---

## CONVENCIÓN DE ROLES

Para proyectos nuevos, usar estos nombres estandarizados cuando aplique:

| Rol | Acceso |
|-----|--------|
| `admin` | Acceso total al sistema |
| `operador` | CRUD en su área de trabajo |
| `visor` | Solo lectura, sin modificaciones |
| `[rol-específico]` | Acceso limitado a una función específica |

---

## CHECKLIST DE IMPLEMENTACIÓN

- [ ] Tabla `usuarios` creada con campos mínimos (id, nombre, email, rol, is_active)
- [ ] Trigger `handle_new_user` creado
- [ ] RLS habilitado en todas las tablas sensibles
- [ ] Políticas de RLS creadas por rol
- [ ] Middleware/dependency de auth implementado
- [ ] Rutas/endpoints protegidos por rol
- [ ] CLAUDE.md del proyecto documenta los roles

---
*Módulo v1.0*
