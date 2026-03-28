# ⏳ MEJORAS PENDIENTES

> **Última actualización:** 2026-03-28
> Lista de mejoras detectadas para aplicar en proyectos existentes.
> Ver proceso completo en: `05_PROCESOS/MEJORAS_CROSS_PROJECT.md`

---

## 🔴 URGENTES

### M001 — Verificar seguridad de service_role_key
**Detectada en:** APP.PRESTAMISTA (documentado correctamente)
**Aplica a:** DM Cars, GoJulito
**Descripción:** La `service_role_key` de Supabase nunca debe estar en el frontend ni en variables públicas (`NEXT_PUBLIC_`). Solo en variables de entorno del servidor.

**Verificación:**
```bash
# Buscar en el código:
grep -r "service_role" ./frontend  # No debe aparecer
grep -r "NEXT_PUBLIC_SUPABASE_SERVICE" .  # No debe existir
```

**Estado por proyecto:**
- DM Cars → ⏳ Por verificar
- GoJulito → ⏳ Por verificar

---

## 🟡 IMPORTANTES

### M002 — Agregar documentación operacional (/docs)
**Detectada en:** APP.PRESTAMISTA
**Aplica a:** GoJulito, Finanzas-JY
**Descripción:** Crear carpeta `/docs` con `RUNBOOK.md` y `architecture.md` para facilitar el mantenimiento futuro.

**Template de RUNBOOK.md:**
- Cómo hacer deploy
- Cómo manejar errores comunes
- Cómo hacer backup de la base de datos
- Variables de entorno requeridas

**Estado por proyecto:**
- GoJulito → ⏳ Pendiente
- Finanzas-JY → ⏳ Pendiente (proyecto muy nuevo)

---

### M003 — Audit logging inmutable (INSERT-only)
**Detectada en:** GoJulito
**Aplica a:** APP.PRESTAMISTA, DM Cars
**Descripción:** La tabla de auditoría debe ser INSERT-only. Nunca permitir UPDATE ni DELETE en registros de auditoría.

```sql
-- Política RLS para audit log:
CREATE POLICY "solo_insert_audit"
  ON audit_log
  FOR INSERT WITH CHECK (true);

-- Nunca:
CREATE POLICY "no_update_audit"
  ON audit_log
  FOR UPDATE USING (false);
```

**Estado por proyecto:**
- APP.PRESTAMISTA → ⏳ Verificar si es inmutable
- DM Cars → ⏳ Verificar si es inmutable

---

### M004 — Integrar n8n en DM Cars
**Detectada en:** DM Cars
**Aplica a:** Solo DM Cars
**Descripción:** DM Cars es el único proyecto sin n8n. Oportunidades de valor:
- Alerta cuando vehículo lleva > 30 días en stock
- Recordatorio de seguimiento de leads
- Notificación de vencimiento de reserva

**Estado:** ⏳ Pendiente — requiere agendar con el cliente

---

### M005 — Exportar workflows n8n al repositorio
**Detectada en:** GoJulito, APP.PRESTAMISTA
**Aplica a:** Ambos proyectos
**Descripción:** Los workflows de n8n deben exportarse como JSON y commitarse en `/n8n/workflows/` del repositorio para no perderlos.

```bash
# En n8n: Workflow → Settings → Export → Download JSON
# Guardar en: /n8n/workflows/[nombre-workflow].json
```

**Estado por proyecto:**
- GoJulito → ⏳ Pendiente
- APP.PRESTAMISTA → ⚠️ Tiene carpeta pero verificar si está actualizada

---

## 🟢 DESEABLES

### M006 — Tokens CSS personalizados por proyecto
**Detectada en:** GoJulito (usa `gj-*` tokens)
**Aplica a:** Finanzas-JY (nuevo proyecto)
**Descripción:** Definir un prefijo de tokens CSS por proyecto facilita customización visual sin conflictos.

**Estado por proyecto:**
- Finanzas-JY → ⏳ Pendiente al definir el design system

---

### M007 — Tags de versión en Git
**Detectada en:** APP.PRESTAMISTA
**Aplica a:** Todos
**Descripción:** Crear un tag Git al completar cada fase/milestone.

```bash
git tag v1.0 -m "MVP completado - [fecha]"
git push origin --tags
```

**Estado:** ⏳ A implementar en todos los proyectos desde ahora

---

### M008 — Tests automatizados
**Detectada en:** Todos los proyectos
**Aplica a:** Todos
**Descripción:** Ningún proyecto tiene tests. Prioridad: al menos tests de los endpoints críticos.

**Por dónde empezar (FastAPI):**
```python
# pytest + httpx
def test_login_exitoso():
    response = client.post("/api/auth/login", json={...})
    assert response.status_code == 200
    assert response.json()["data"]["token"] is not None
```

**Estado:** ⏳ Deseado pero deferred. Priorizar en proyectos con lógica financiera.

---

## MEJORAS APLICADAS ✅

| ID | Mejora | Aplicada en | Fecha |
|----|--------|------------|-------|
| - | Estándar `{ data, error }` documentado | Sistema maestro | 2026-03-28 |
| - | Soft delete documentado | Sistema maestro | 2026-03-28 |
| - | GSD en todos los proyectos nuevos | Finanzas-JY | 2026-03-28 |

---
*Actualizar al detectar o resolver mejoras*
