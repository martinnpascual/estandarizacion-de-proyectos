# ⚙️ INTEGRACIÓN GSD EN EL FLUJO DE TRABAJO

> **Versión:** 1.0 | **Fecha:** 2026-03-28
> **Referencia GSD:** github.com/gsd-build/get-shit-done

---

## CUÁNDO Y CÓMO USAR GSD

GSD (Get Shit Done) es la metodología estándar para todo el desarrollo. Se activa desde el kickoff del proyecto y se mantiene durante toda la vida del proyecto.

---

## SETUP GSD AL INICIO DE PROYECTO

### Paso 1: Crear carpeta `.planning/`

```bash
mkdir .planning
```

### Paso 2: Inicializar PROJECT.md

```bash
# Usar prompt con Claude:
# "Inicializa el GSD para el proyecto [nombre].
#  Cliente: [descripción del cliente]
#  Problema a resolver: [descripción]
#  Stack: [stack elegido]
#  Genera PROJECT.md, REQUIREMENTS.md y ROADMAP.md"
```

### Paso 3: Completar los 5 archivos base

```
.planning/
├── PROJECT.md          ← OBLIGATORIO antes del primer commit
├── REQUIREMENTS.md     ← OBLIGATORIO antes de empezar Fase 1
├── ROADMAP.md          ← OBLIGATORIO antes de empezar Fase 1
├── STATE.md            ← Actualizar al final de cada sesión
└── PLAN.md             ← Actualizar al inicio de cada fase
```

---

## CICLO DE UNA FASE CON GSD

### 1. DISCUSS (pre-planificación)

```
Antes de planear, discutir con Claude:
- ¿Qué ambigüedades hay en los requerimientos?
- ¿Hay decisiones de diseño que tomar?
- ¿Hay dependencias entre módulos?

Prompt: "Estamos en la fase X del proyecto [nombre].
  Lee .planning/STATE.md y .planning/REQUIREMENTS.md.
  Identifica las ambigüedades y decisiones a resolver antes de planear."
```

### 2. PLAN (crear tareas atómicas)

```
Prompt: "Crea el PLAN.md para la fase X del proyecto [nombre].
  Descompón el trabajo en tareas atómicas (máximo 2h cada una).
  Identifica dependencias entre tareas.
  Usa formato XML con pasos de verificación."
```

**Formato PLAN.md:**
```xml
<phase number="2" name="Módulo Clientes">
  <wave number="1">
    <task id="2.1.1" title="Crear tabla clientes en Supabase">
      <description>Migración SQL para tabla clientes con RLS</description>
      <steps>
        <step>Crear archivo migration en database/migrations/</step>
        <step>Escribir SQL con soft delete (is_deleted, deleted_at)</step>
        <step>Configurar RLS por rol</step>
        <step>Verificar que la migración corre sin errores</step>
      </steps>
      <verification>
        <check>Tabla existe en Supabase Dashboard</check>
        <check>RLS habilitado en la tabla</check>
        <check>Políticas creadas para admin y operador</check>
      </verification>
    </task>

    <task id="2.1.2" title="API Route GET /api/clientes" depends_on="">
      <description>Endpoint para listar clientes con filtros</description>
      <steps>
        <step>Crear app/api/clientes/route.ts</step>
        <step>Implementar query con paginación</step>
        <step>Agregar validación de auth</step>
      </steps>
      <verification>
        <check>curl localhost:3000/api/clientes retorna 200</check>
        <check>Sin token retorna 401</check>
      </verification>
    </task>
  </wave>

  <wave number="2">
    <task id="2.2.1" title="Componente ListaClientes" depends_on="2.1.2">
      <description>UI de listado con tabla y búsqueda</description>
    </task>
  </wave>
</phase>
```

### 3. EXECUTE (ejecución en waves)

```
- Wave 1: Tareas independientes (ejecutar en paralelo)
- Wave 2: Tareas que dependen de Wave 1 (ejecutar después)
- Cada tarea = 1 commit atómico

Prompt por tarea: "Ejecuta la tarea [ID] del PLAN.md.
  Contexto del proyecto en CLAUDE.md y PROJECT.md.
  Al terminar, haz commit con: feat([scope]): [descripción]"
```

### 4. VERIFY (validación humana)

```
Checklist de verificación por módulo:
- [ ] La funcionalidad hace lo que dice REQUIREMENTS.md
- [ ] No hay errores en consola
- [ ] Funciona en mobile y desktop
- [ ] RLS funciona correctamente (probar con diferentes roles)
- [ ] Soft delete funciona
```

### 5. UPDATE STATE.md

```
Al final de cada fase, actualizar STATE.md con:
- ¿Qué decisiones se tomaron?
- ¿Qué problemas se encontraron y cómo se resolvieron?
- ¿Qué deuda técnica quedó?
- ¿Qué cambió respecto al REQUIREMENTS.md original?
```

---

## REGLAS GSD PARA EL PORTFOLIO

1. **Todo proyecto nuevo** debe inicializar GSD antes del primer commit de código
2. **STATE.md** se actualiza al final de cada sesión de trabajo
3. **REQUIREMENTS.md** es inmutable durante una fase (cambios van a v2.0)
4. **Commits atómicos** — un commit por tarea del PLAN.md
5. **Contexto fresco** — Claude lee PROJECT.md + STATE.md al inicio de cada sesión
6. **No saltear DISCUSS** — ahorra horas de retrabajos

---

## PROMPT MAESTRO PARA NUEVA SESIÓN

```
Lee los siguientes archivos del proyecto [nombre]:
1. CLAUDE.md (en la raíz)
2. .planning/PROJECT.md
3. .planning/STATE.md
4. .planning/ROADMAP.md

Luego dime:
- ¿En qué fase estamos?
- ¿Hay blockers activos?
- ¿Cuál es la próxima tarea según el PLAN.md?
```

---
*Proceso v1.0 — GSD adaptado para el portfolio de proyectos*
