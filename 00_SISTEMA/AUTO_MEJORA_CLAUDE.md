# 🤖 GUÍA DE AUTO-MEJORA CON CLAUDE

> **Versión:** 1.0 | **Fecha:** 2026-03-28
> Sistema para mantener esta carpeta maestra actualizada automáticamente usando Claude.

---

## CONCEPTO

Esta carpeta maestra no es estática. Debe mejorar con cada proyecto nuevo, cada módulo creado, y cada aprendizaje adquirido. Claude actúa como el **agente de actualización** que analiza los repositorios y propone mejoras al sistema.

---

## CUÁNDO DISPARAR LA AUTO-MEJORA

Disparar el proceso de auto-mejora en estos momentos:

1. **Al completar un proyecto** o milestone importante
2. **Al crear un módulo nuevo** no documentado aquí
3. **Al resolver un bug o problema recurrente** que podría afectar otros proyectos
4. **Al mes** (revisión periódica, aunque no haya terminado proyectos)
5. **Al iniciar un proyecto nuevo** (para asegurarse que los templates están actualizados)

---

## PROMPT MAESTRO DE AUTO-MEJORA

Usar este prompt con Claude cuando se quiera actualizar el sistema:

```
Eres el agente de mejora continua del sistema de estandarización de proyectos de la consultoría.

PROYECTOS ACTIVOS:
- GoJulito: github.com/edubd4/gojulito
- APP.PRESTAMISTA: github.com/martinnpascual/APP.PRESTAMISTA
- DM Cars: github.com/martinnpascual/CONSECIONARIA.MD
- Finanzas-JY: github.com/edubd4/Finanzas-jy

TU TAREA:
1. Analiza los commits recientes de cada repositorio
2. Identifica nuevos módulos, patrones o soluciones implementadas
3. Detecta problemas o bugs que se resolvieron y podrían afectar otros proyectos
4. Compara con el estado actual de la carpeta maestra (ESTANDARIZACION DE PROYECTOS/)
5. Propone actualizaciones específicas:
   - Nuevos templates o patterns para agregar
   - Módulos que deben actualizarse en 04_MODULOS/
   - Proyectos que deberían recibir mejoras de otros proyectos
   - Inconsistencias entre proyectos que deberían resolverse
6. Genera el reporte en formato: MEJORAS_DETECTADAS_[FECHA].md

CARPETA MAESTRA UBICADA EN: [ruta a esta carpeta]
```

---

## PROCESO MANUAL DE ACTUALIZACIÓN

Cuando Claude identifica mejoras, seguir este proceso:

### Paso 1: Revisar el reporte de mejoras
- Leer `08_REFERENCIAS/MEJORAS_PENDIENTES.md`
- Priorizar: Crítico → Alto → Medio → Bajo

### Paso 2: Evaluar impacto cross-project
Para cada mejora detectada, preguntar:
- ¿Afecta a más de un proyecto? → Actualizar módulo en `04_MODULOS/`
- ¿Es específica de un proyecto? → Solo documentar en referencias
- ¿Cambia un estándar? → Actualizar `03_ARQUITECTURA_TECH/` o `07_APIS/`

### Paso 3: Propagar mejoras a otros proyectos
Si un módulo mejoró en un proyecto y otros lo usan:
1. Actualizar la documentación del módulo en `04_MODULOS/`
2. Crear un "issue" o nota en `08_REFERENCIAS/MEJORAS_PENDIENTES.md`
3. Al trabajar en el otro proyecto, aplicar la mejora

### Paso 4: Actualizar referencias
- `08_REFERENCIAS/MAPA_PROYECTOS.md` → Estado actual
- `08_REFERENCIAS/MODULOS_POR_PROYECTO.md` → Qué módulo está en qué versión

---

## SCHEDULE SUGERIDO (n8n o Claude Schedule)

Configurar una tarea programada mensual con este workflow:

```
Trigger: Primer día de cada mes
Acción:
  1. Claude analiza commits del último mes en todos los repos
  2. Genera reporte MEJORAS_DETECTADAS_YYYY-MM.md
  3. Guarda en 08_REFERENCIAS/
  4. Notifica por Telegram: "Reporte de mejoras disponible"
```

**Referencia de setup:** `05_PROCESOS/GSD_INTEGRATION.md`

---

## CRITERIOS DE CALIDAD DEL SISTEMA

El sistema está saludable si:

- [ ] Todos los proyectos activos están en `08_REFERENCIAS/MAPA_PROYECTOS.md`
- [ ] Cada módulo en `04_MODULOS/` tiene un README actualizado
- [ ] Los templates de diagnóstico y onboarding tienen menos de 3 meses sin revisión
- [ ] `08_REFERENCIAS/MEJORAS_PENDIENTES.md` no tiene más de 10 ítems sin asignar
- [ ] Cada proyecto nuevo usa los templates de GSD desde el inicio
- [ ] El árbol de decisión de stack tiene al menos un proyecto de referencia por opción

---

## REGLA DE UNICIDAD DE MÓDULOS

Cuando un módulo existe en múltiples proyectos y difiere entre ellos:

1. Identificar cuál versión es la más completa/correcta
2. Documentarla como "versión canónica" en `04_MODULOS/`
3. Marcar las diferencias de los otros proyectos como "variantes" con su justificación
4. No forzar uniformidad si hay razones técnicas para la diferencia

---

*Este documento define cómo el sistema se mantiene vivo. Sin este proceso, la carpeta se vuelve obsoleta.*
