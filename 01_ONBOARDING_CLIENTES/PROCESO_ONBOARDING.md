# 📋 PROCESO DE ONBOARDING DE CLIENTES

> **Versión:** 1.0 | **Fecha:** 2026-03-28
> Proceso completo desde el primer contacto hasta el kickoff del proyecto.

---

## VISIÓN GENERAL

El onboarding de clientes tiene 6 etapas secuenciales. Cada etapa tiene un template específico en `_TEMPLATES/` y produce un entregable concreto.

```
ETAPA 1            ETAPA 2              ETAPA 3              ETAPA 4           ETAPA 5       ETAPA 6
Primer Contacto → Propuesta Diagnóst. → Diagnóstico Técnico → Propuesta Proy. → Kickoff  → Seguimiento
     1-2 días          2-3 días              5-10 días            3-5 días        1 día     Continuo
```

---

## ETAPA 1: PRIMER CONTACTO

**Objetivo:** Evaluar el fit del proyecto y del cliente antes de invertir tiempo.

**Duración:** 1-2 días

**Acciones:**
1. Reunión de descubrimiento (30-60 min, presencial o remota)
2. Completar ficha de primer contacto
3. Evaluar viabilidad técnica y comercial
4. Decidir si continuar con propuesta de diagnóstico

**Criterios de go/no-go:**
- ✅ El cliente tiene un problema claro que podemos resolver
- ✅ El presupuesto estimado es realista
- ✅ El cliente tiene autoridad de decisión
- ❌ El proyecto está fuera de nuestro dominio técnico
- ❌ El cliente tiene expectativas imposibles de cumplir
- ❌ No hay budget claro ni compromiso de inversión

**Template:** `_TEMPLATES/01_PRIMER_CONTACTO.md`

**Entregable:** Ficha de cliente completa + decisión go/no-go

---

## ETAPA 2: PROPUESTA DE DIAGNÓSTICO

**Objetivo:** Formalizar el diagnóstico como un servicio pagado o como primera etapa del proyecto.

**Duración:** 2-3 días

**Acciones:**
1. Redactar propuesta de diagnóstico con alcance y costo
2. Enviar al cliente para aprobación
3. Recibir aprobación formal (email, firma, transferencia)
4. Agendar sesiones de relevamiento

**Elementos de la propuesta:**
- Descripción del diagnóstico y su valor
- Metodología (entrevistas, revisión de procesos, análisis técnico)
- Duración estimada
- Entregables (documento de diagnóstico, propuesta de solución)
- Precio del diagnóstico (puede ser gratuito si hay contrato previo)
- Condiciones de pago

**Template:** `_TEMPLATES/02_PROPUESTA_DIAGNOSTICO.md`

**Entregable:** Propuesta enviada y aprobada

---

## ETAPA 3: DIAGNÓSTICO TÉCNICO

**Objetivo:** Entender en profundidad el negocio, los procesos y las necesidades técnicas del cliente.

**Duración:** 5-10 días (dependiendo de la complejidad)

**Acciones:**
1. Entrevistas con stakeholders clave (dueño, operadores, técnicos)
2. Relevamiento de procesos actuales (manuales, herramientas existentes)
3. Análisis de pain points y oportunidades
4. Evaluación técnica (si hay sistemas existentes)
5. Definición de requerimientos funcionales y no funcionales
6. Redacción del documento de diagnóstico

**Áreas a cubrir:**
- Procesos de negocio actuales
- Flujos de información y datos
- Herramientas y sistemas existentes
- Roles y usuarios del sistema
- Integraciones necesarias
- Restricciones y condicionantes
- KPIs de éxito del proyecto

**Template diagnóstico:** `02_DIAGNOSTICOS/_TEMPLATE_DIAGNOSTICO.md`

**Entregable:** Documento de Diagnóstico Técnico completo

---

## ETAPA 4: PROPUESTA DE PROYECTO

**Objetivo:** Presentar la solución técnica propuesta con scope, stack, fases, costo y cronograma.

**Duración:** 3-5 días

**Acciones:**
1. Definir arquitectura técnica (stack, módulos, integraciones)
2. Descomponer el proyecto en fases (usando GSD para estructurar)
3. Estimar esfuerzo y costo por fase
4. Redactar propuesta formal
5. Presentar al cliente y negociar

**Estructura de la propuesta:**
- Resumen ejecutivo
- Diagnóstico resumen (problema identificado)
- Solución propuesta (arquitectura, módulos)
- Stack tecnológico y justificación
- Fases del proyecto con entregables
- Estimación de tiempo y costo
- Cronograma tentativo
- Condiciones comerciales
- Próximos pasos

**Template:** `_TEMPLATES/04_PROPUESTA_PROYECTO.md`

**Entregable:** Propuesta enviada y aprobada + contrato firmado

---

## ETAPA 5: KICKOFF

**Objetivo:** Inicializar el entorno técnico, alinear al equipo y comenzar el desarrollo.

**Duración:** 1 día (preparación 2-3 días antes)

**Checklist pre-kickoff:**
- [ ] Contrato firmado y pago inicial recibido
- [ ] Repo GitHub creado con estructura GSD
- [ ] Proyecto Supabase creado y configurado
- [ ] Workspace GSD inicializado (.planning/ con PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md)
- [ ] Variables de entorno documentadas
- [ ] Accesos dados al cliente (si aplica)
- [ ] Canal de comunicación establecido (Slack, WhatsApp, etc.)
- [ ] Reunión de kickoff agendada

**Template:** `_TEMPLATES/05_KICKOFF.md`

**Entregable:** Entorno técnico funcional + PROJECT.md del proyecto creado

---

## ETAPA 6: SEGUIMIENTO

**Objetivo:** Mantener comunicación clara con el cliente durante el desarrollo.

**Cadencia:**
- **Semanal:** Update de avance (qué se hizo, qué sigue, blockers)
- **Por milestone:** Demo del avance + validación con el cliente
- **Al completar fase:** Entrega formal + firma de aceptación

**Template:** `_TEMPLATES/06_SEGUIMIENTO.md`

---

## ESTRUCTURA DE CARPETA POR CLIENTE

Al iniciar el onboarding de un cliente nuevo, crear esta estructura:

```
01_ONBOARDING_CLIENTES/
└── [NOMBRE_CLIENTE]_[AÑO]/
    ├── 01_primer_contacto.md
    ├── 02_propuesta_diagnostico.md
    ├── 03_diagnostico_tecnico.md
    ├── 04_propuesta_proyecto.md
    ├── 05_kickoff.md
    └── 06_seguimiento.md
```

**Ejemplo:**
```
01_ONBOARDING_CLIENTES/
├── DMCARS_2025/
├── GOJULITO_2025/
├── PRESTAMISTA_2025/
└── FINANZASJY_2026/
```

---

*Actualizar este proceso cuando se detecten mejoras en el flujo de onboarding.*
