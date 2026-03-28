# NOTION — Estructura del Workspace

> Diseño del workspace de Notion para tracking de clientes y proyectos. Objetivo: visibilidad clara del estado de cada cliente en cada fase del ciclo de vida.

---

## Estructura de páginas

```
WORKSPACE RAÍZ
├── 📊 Dashboard — Vista general de todos los clientes
├── 👥 Clientes — Base de datos principal
├── 📋 Proyectos — Base de datos de proyectos activos
├── 🧩 Módulos — Referencia al catálogo (links al repo)
├── 🔧 Sistema — Metodología y stacks (referencia)
└── 📝 Templates — Templates de páginas de Notion
```

---

## Base de datos: CLIENTES

### Propiedades

| Propiedad | Tipo | Valores |
|-----------|------|---------|
| Nombre | Título | - |
| Negocio | Texto | nombre del negocio |
| Fase | Select | Prospecto / Intake / Prop. Diagnóstico / Diagnóstico / Desarrollo / Producción / Pausado |
| Responsable | Select | Martin / Edu / Ambos |
| Stack | Select | A / B / C / D |
| Fecha inicio | Fecha | - |
| Fecha último contacto | Fecha | - |
| Repo | URL | link al repo |
| Estado Notion | Select | Al día / Atención requerida / Bloqueado |
| Notas rápidas | Texto | |

### Vistas

1. **Vista Kanban por Fase** — tarjetas agrupadas por fase del ciclo
   - Columnas: Prospecto → Intake → Prop. Diagnóstico → Diagnóstico → Desarrollo → Producción
   - Mostrar: nombre, responsable, fecha último contacto

2. **Vista Tabla completa** — todos los campos, filtrable por responsable

3. **Vista Martin** — filtro: Responsable = Martin
4. **Vista Edu** — filtro: Responsable = Edu

5. **Vista "Atención requerida"** — filtro: Estado Notion = Atención requerida / Bloqueado

---

## Base de datos: PROYECTOS

### Propiedades

| Propiedad | Tipo | Valores |
|-----------|------|---------|
| Nombre | Título | nombre del proyecto/app |
| Cliente | Relación | → CLIENTES |
| Fase actual | Select | Fase 1 / Fase 2 / Fase 3 / Launch / Mejoras |
| Sprint/Sesión | Número | número de sesión actual |
| Última sesión | Fecha | - |
| Próxima sesión | Fecha | - |
| % completado | Número | 0-100 |
| Repo | URL | - |
| Deploy URL | URL | - |
| Blocker | Checkbox | hay algo bloqueado |
| Descripción blocker | Texto | qué está bloqueado |

### Vista Kanban por Fase actual
Columnas: Fase 1 → Fase 2 → Fase 3 → Launch → Mejoras

---

## Página de cliente (template)

Cada cliente tiene su propia página con:

```
[Emoji] Nombre del Cliente

## Info rápida
[tabla con datos clave del intake]

## Estado actual
[descripción 2-3 líneas]

## Historial de contacto
| Fecha | Tipo | Resumen | Próximo paso |
|-------|------|---------|-------------|

## Documentos
- [Link a 00_INTAKE en GitHub]
- [Link a diagnóstico en GitHub]
- [Link al repo]

## Notas
[notas libres del equipo]
```

---

## Dashboard principal

Bloques del dashboard:

1. **KPIs rápidos** (inline)
   - Total clientes activos
   - En desarrollo ahora
   - Pendientes de respuesta

2. **Vista Kanban de clientes** (embedded de la DB)

3. **Proyectos con blocker** (filtered view)

4. **Últimas actualizaciones** (sort: fecha último contacto DESC, limit 5)

---

## Flujo de actualización

**Cuándo actualizar Notion:**

| Evento | Acción en Notion |
|--------|-----------------|
| Cliente nuevo | Crear registro en CLIENTES, Fase: Prospecto |
| Intake aprobado | Cambiar Fase a "Intake" |
| Propuesta enviada | Cambiar Fase a "Prop. Diagnóstico" |
| Diagnóstico aprobado | Cambiar Fase a "Diagnóstico", crear registro en PROYECTOS |
| Inicio de desarrollo | Cambiar Fase a "Desarrollo", actualizar Fase actual del proyecto |
| Fin de sprint | Actualizar % completado, Última sesión, Sprint # |
| Blocker | Marcar Blocker = ✓, escribir descripción |
| Blocker resuelto | Marcar Blocker = ✗ |
| Launch | Cambiar Fase a "Producción", agregar Deploy URL |
| Proyecto en mejoras | Cambiar Fase del proyecto a "Mejoras" |

---

## Páginas de referencia (no editables)

Estas páginas son referencias al sistema CEREBRO — no duplicar contenido, solo linkear.

- **Stack Profiles** → link a `SISTEMA/STACKS.md` en GitHub
- **Metodología** → link a `SISTEMA/METODOLOGIA.md` en GitHub
- **Módulos** → link a `MODULOS/README.md` en GitHub

---

## Setup inicial en Notion

### Paso a paso para crear el workspace

1. Crear nueva página en Notion: "CLIENTES & PROYECTOS"
2. Crear database "CLIENTES" con propiedades listadas arriba
3. Crear las 5 vistas definidas
4. Crear database "PROYECTOS" con relación a CLIENTES
5. Crear template de página de cliente
6. Crear Dashboard con los 4 bloques
7. Cargar los 5 clientes existentes:
   - DM Cars → Fase: Desarrollo, Responsable: Martin, Stack: D
   - Prestamista → Fase: Desarrollo (S-16), Responsable: Martin, Stack: D
   - GoJulito (Julio Correa) → Fase: Desarrollo, Responsable: Edu, Stack: B
   - Jose Ybarra → Fase: Desarrollo, Responsable: Edu, Stack: B
   - Jamrock → Fase: (verificar estado), Responsable: Edu, Stack: TBD
8. Compartir el workspace con Martin y Edu

---

## Integración futura con n8n (opcional)

Cuando el flujo madure, se puede automatizar:
- n8n webhook → actualiza estado en Notion al hacer deploy
- n8n cron → recordatorio si un cliente no tiene actividad en 7 días
- n8n → crea registro en Notion al crear repo nuevo en GitHub

*Última actualización: 2026-03-28*
