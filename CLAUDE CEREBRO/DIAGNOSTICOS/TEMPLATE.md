# TEMPLATE DE DIAGNÓSTICO

> Usar este template para cada diagnóstico nuevo. Completar todas las secciones. Las secciones marcadas con * son obligatorias.

---

# DIAGNÓSTICO — [Nombre del Cliente / Negocio]

**Fecha:** YYYY-MM-DD
**Realizado por:** Martin / Edu
**Duración del proceso:** X días / semanas
**Estado:** en proceso / completo / aprobado por cliente

---

## 1. Contexto del negocio *

| Campo | Valor |
|-------|-------|
| Nombre del negocio | |
| Rubro | |
| Años en el mercado | |
| Tamaño | (empleados, sucursales) |
| Facturación aproximada | (orientativo para dimensionar) |
| Mercado | (B2B / B2C / ambos) |
| País / contexto regulatorio | Argentina / otro |

### Herramientas actuales

| Proceso | Herramienta actual | ¿Funciona? |
|---------|-------------------|-----------|
| | Excel / papel / WhatsApp / otro sistema | Sí / No / Parcial |

---

## 2. Mapa de procesos (AS-IS) *

### Proceso principal 1: [Nombre]

```
Paso 1: [quién hace qué]
  ↓
Paso 2: [qué herramienta usa]
  ↓
Paso 3: [resultado]
```

**Fricción:** [dónde pierde tiempo/dinero]
**Frecuencia:** diario / semanal / mensual
**Personas involucradas:** X personas

### Proceso principal 2: [Nombre]
(repetir para cada proceso clave)

---

## 3. Entidades de datos *

> Qué información maneja el negocio y cómo se relaciona.

| Entidad | Descripción | Atributos clave | Volumen estimado |
|---------|-------------|----------------|-----------------|
| | | | (registros/mes) |

### Relaciones

```
[Entidad A] 1──N [Entidad B]   (ej: un Cliente tiene N Pedidos)
[Entidad B] N──N [Entidad C]   (ej: un Pedido tiene N Productos)
```

---

## 4. Usuarios del sistema *

| Rol | Descripción | Cantidad | Acceso requerido |
|-----|-------------|----------|-----------------|
| | | | leer / crear / editar / eliminar / admin |

**¿Acceso desde móvil?** Sí / No / Opcional
**¿Múltiples ubicaciones/sucursales?** Sí / No

---

## 5. Dolores y prioridades *

| # | Dolor | Impacto | Prioridad |
|---|-------|---------|-----------|
| 1 | | Alto/Medio/Bajo | 1-10 |
| 2 | | | |

**El dolor #1 que más le importa al cliente:**
(frase exacta del cliente si es posible)

---

## 6. Integraciones necesarias

| Sistema externo | Para qué | Obligatorio | API disponible | Complejidad |
|-----------------|----------|-------------|----------------|-------------|
| | | Sí/No | Sí/No/Desconocido | Baja/Media/Alta |

**Contexto Argentina:**
- [ ] Requiere ARCA/AFIP (facturación electrónica)
- [ ] Requiere manejo de ARS (formateo, tipo de cambio)
- [ ] Requiere multi-moneda

---

## 7. Análisis técnico

### Stack recomendado *

**Perfil:** A / B / C / D
**Justificación:**
[Por qué este perfil y no otro. Ser específico.]

**Alternativa considerada:**
[Qué otro perfil se evaluó y por qué se descartó]

### Módulos aplicables

| Módulo | ¿Aplica? | Adaptaciones necesarias |
|--------|----------|------------------------|
| auth-supabase | Sí/No | |
| crud-base | Sí/No | |
| audit-historial | Sí/No | |
| dashboard-shell | Sí/No | |
| bot-telegram-n8n | Sí/No | |
| pdf-generator | Sí/No | |
| payments-tracking | Sí/No | |
| notifications | Sí/No | |
| deploy-dokploy | Sí/No | |
| deploy-docker | Sí/No | |
| afip-invoicing | Sí/No | |

### Schema de BD preliminar

```sql
-- Tablas identificadas
-- tabla_1: descripción
-- tabla_2: descripción
-- historial: audit trail inmutable
```

---

## 8. Propuesta de proyecto

### Alcance del proyecto *

**Incluido en el proyecto:**
- [Feature/módulo]

**Excluido explícitamente:**
- [Lo que el cliente mencionó pero no entra]

### Fases y presupuesto *

| Fase | Descripción | Duración | Costo |
|------|-------------|----------|-------|
| 1 | MVP / Base | X semanas | $ |
| 2 | [Features adicionales] | X semanas | $ |
| 3 | Launch y capacitación | X días | $ |
| **Total** | | **X semanas** | **$** |

**Forma de pago recomendada:** 30% inicio + 40% Fase 2 + 30% entrega

### Cronograma tentativo

| Hito | Fecha estimada |
|------|---------------|
| Inicio | |
| Fin Fase 1 / MVP | |
| Fin Fase 2 | |
| Launch | |

---

## 9. Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| | Alta/Media/Baja | Alto/Medio/Bajo | |

---

## 10. Decisión de avance

- [ ] **Avanzar con el proyecto** — Próximo paso: [qué hacer]
- [ ] **Ajustar propuesta** — Motivo: [qué cambiar]
- [ ] **No avanzar** — Motivo: [razón]

**Aprobación del cliente:** pendiente / aprobado el YYYY-MM-DD / rechazado

---

*Diagnóstico válido por 30 días desde la fecha. Después de ese plazo, re-validar con el cliente.*
