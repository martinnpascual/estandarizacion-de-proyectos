# CHECKLIST — Pre y Post Diagnóstico

---

## Antes de iniciar el diagnóstico

### Administrativo
- [ ] Intake completo (`00_INTAKE.md`) aprobado
- [ ] Propuesta de diagnóstico enviada y aprobada
- [ ] Pago del diagnóstico recibido
- [ ] Reuniones coordinadas en calendario

### Preparación técnica
- [ ] Leer el intake completo antes de la primera reunión
- [ ] Identificar el rubro → buscar si hay proyectos similares en el portfolio
- [ ] Preparar preguntas específicas del rubro
- [ ] Revisar si algún módulo del catálogo aplica obviamente

---

## Durante el diagnóstico

### Reunión de mapeo de procesos
- [ ] Grabar la reunión (con permiso) o tomar notas detalladas
- [ ] Mapear TODOS los procesos que mencionan, no solo los que piden digitalizar
- [ ] Preguntar "¿y después qué pasa?" en cada paso hasta llegar al resultado final
- [ ] Identificar excepciones y casos borde ("¿qué pasa si...?")
- [ ] Preguntar por el proceso actual de cada rol de usuario
- [ ] Validar: "Si el sistema hace X, ¿resuelve tu problema?" — no asumir

### Análisis de herramientas actuales
- [ ] Pedir acceso de lectura a sus Excel/Google Sheets actuales si es posible
- [ ] Fotografiar o capturar el flujo actual (papel, pizarra, etc.)
- [ ] Identificar datos que ya existen y necesitan migración

### Reunión de usuarios y permisos
- [ ] Confirmar TODOS los roles con acceso al sistema
- [ ] Para cada rol: ¿qué puede ver? ¿qué puede crear? ¿qué puede editar? ¿qué puede eliminar?
- [ ] ¿Hay datos que un rol NO debe ver aunque otro sí? (RLS crítico)

---

## Al redactar el diagnóstico

### Datos mínimos a tener antes de redactar
- [ ] Al menos 3 procesos mapeados completamente (AS-IS)
- [ ] Todas las entidades de datos identificadas
- [ ] Todos los roles de usuario con sus permisos
- [ ] Integraciones externas claras (especialmente ARCA/AFIP si aplica)
- [ ] Stack definido con justificación

### Calidad del diagnóstico
- [ ] El resumen ejecutivo lo entiende alguien sin contexto técnico
- [ ] El mapa de procesos refleja lo que el cliente describió (no lo que suponemos)
- [ ] El alcance tiene una sección "excluido explícitamente" con al menos 2 items
- [ ] El presupuesto tiene justificación por fase (no es un número mágico)
- [ ] Los riesgos son específicos del proyecto, no genéricos

---

## Antes de presentar al cliente

- [ ] Revisión interna entre Martin y Edu si el proyecto es complejo
- [ ] El documento no tiene errores ortográficos (usar corrector)
- [ ] Los números cuadran (tiempo × costo/hora = total)
- [ ] Hay una sección clara de "próximos pasos" con acción concreta

---

## Después de la aprobación

- [ ] Crear carpeta del cliente en `CLIENTES/[NOMBRE]/`
- [ ] Copiar `_TEMPLATE/03_PROYECTO/` completo
- [ ] Crear repo en GitHub (con nombre estándar)
- [ ] Instalar GSD: `npx get-shit-done-cc@latest`
- [ ] Completar `PROJECT.md` con la arquitectura del diagnóstico
- [ ] Completar `REQUIREMENTS.md` con los RF del diagnóstico
- [ ] Crear `ROADMAP.md` con las fases aprobadas
- [ ] Inicializar `STATE.md` con estado inicial
- [ ] Agregar cliente a Notion con estado "Fase 4 - Desarrollo"
- [ ] Registrar inicio en `SISTEMA/MEJORAS.md`

---

*Última actualización: 2026-03-28*
