# MEJORAS — Log Cross-Proyectos

> Registro de mejoras sistémicas. Cada entrada documenta qué se resolvió, dónde, qué módulo genera y a qué proyectos propagar.

---

## Cómo registrar una mejora

```
## [FECHA] [PROYECTO ORIGEN] — [Título corto]
**Problema:** qué no funcionaba o qué se mejoró
**Solución:** cómo se resolvió
**Módulo generado/actualizado:** nombre del módulo en MODULOS/
**Proyectos a propagar:** lista de proyectos que se benefician
**Estado propagación:** pendiente / en progreso / completado
```

---

## Log de mejoras

> (Vacío al inicio — se poblará con cada proyecto)

---

## Mejoras pendientes de formalizar

> Patrones identificados en los proyectos existentes que aún no están formalizados como módulos:

### De APP.PRESTAMISTA (session S-16)
- [ ] Patrón de `session_log.jsonl` para tracking de sesiones IA — útil en todos los proyectos
- [ ] Lógica de cálculo de cuotas (flat/declining/custom) → módulo `loan-calculator` (específico de finanzas)
- [ ] Soft delete con `deleted_at` en FastAPI → formalizar en módulo `crud-base` Stack D

### De CONSECIONARIA (DM Cars)
- [ ] 12 agentes IA especializados con roles → documentar en ROLES.md como referencia para proyectos complejos
- [ ] Patrón de facturas ARCA/AFIP → módulo `afip-invoicing` (específico Argentina, Stack D)
- [ ] Alertas de stock lento (slow-mover) → patrón reutilizable de alertas configurables

### De GoJulito
- [ ] IDs legibles humanos vía API routes → módulo `readable-ids`
- [ ] Tabla `historial` insert-only con trigger → formalizar en módulo `audit-historial`

### De Finanzas-jy
- [ ] Tres tipos de Supabase client (browser/server/service role) → ya en módulo `auth-supabase`, verificar que esté completo
- [ ] Formato ARS sin decimales → utilidad de formateo para proyectos argentinos
- [ ] Esquema de colores por categoría con prefijo custom CSS → patrón de design tokens

*Última actualización: 2026-03-28*
