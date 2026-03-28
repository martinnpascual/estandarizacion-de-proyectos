# 🌳 ÁRBOL DE DECISIÓN DE STACK TECNOLÓGICO

> **Versión:** 1.0 | **Fecha:** 2026-03-28
> Alineado con CLAUDE CEREBRO/SISTEMA/STACKS.md — Perfiles A, B, C, D

---

## LOS 4 PERFILES DE STACK

### ⚡ PERFIL A: Automatización sin Web
**Responsable:** Edu
**Usar cuando:** El cliente no necesita app web. Solo automatizaciones, notificaciones, bots.

| Capa | Tecnología |
|------|-----------|
| Lógica / Automatización | n8n |
| Datos | Supabase (para escalar) / Google Sheets (simple) |
| Interface | Telegram Bot |
| IA | Claude API |

**Proyectos de referencia:** (próximos)
**Template de inicio:** `03_ARQUITECTURA_TECH/N8N_INTEGRATION_GUIDE.md`

---

### 🟢 PERFIL B: Web App — Next.js + Supabase
**Responsable:** Edu
**Usar cuando:** Dashboard web, gestión de datos, múltiples usuarios. Sin lógica de backend compleja.

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 App Router + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Base de datos | Supabase (PostgreSQL + RLS + Auth) |
| Deploy | Dokploy (VPS) + Docker |
| Validación | Zod |

**Proyectos de referencia:** GoJulito, Finanzas-JY, Jamrock
**Template de inicio:** `03_ARQUITECTURA_TECH/NEXTJS_SUPABASE_STANDARD.md`

---

### 🟡 PERFIL C: Híbrido — Automatización → Web App
**Responsable:** Edu
**Usar cuando:** El cliente empieza simple (solo bot/automatización) y va a escalar a web.

**Estrategia:**
- Fase 1: Implementar Perfil A (n8n + Telegram)
- Fase 2: Migrar/extender a Perfil B cuando el negocio lo justifique
- **Usar Supabase desde la Fase 1** — no migrar datos después

---

### 🔵 PERFIL D: Web App Full-Stack — FastAPI + React + Supabase
**Responsable:** Martin
**Usar cuando:** Lógica de negocio compleja, PDFs, integraciones externas pesadas (AFIP), cálculos financieros.

| Capa | Tecnología |
|------|-----------|
| Backend | FastAPI + Python 3.11+ |
| Frontend | React 18 + TypeScript + Vite + Tailwind |
| Base de datos | Supabase (PostgreSQL + RLS + Auth) |
| PDF | WeasyPrint + Jinja2 |
| Deploy | Dokploy / Railway / Vercel |
| Automatizaciones | n8n + Telegram + SMTP |

**Proyectos de referencia:** APP.PRESTAMISTA, DM Cars (CONSECIONARIA)
**Template de inicio:** `03_ARQUITECTURA_TECH/FASTAPI_REACT_SUPABASE_STANDARD.md`

---

## ¿CUÁNDO AGREGAR n8n?

Agregar n8n **siempre que** el proyecto necesite:

- [ ] Notificaciones automáticas (Telegram, WhatsApp, Email)
- [ ] Jobs nocturnos o programados (vencimientos, alertas, reportes)
- [ ] Integraciones con servicios externos (pagos, APIs de terceros)
- [ ] Flujos aprobación/notificación multi-paso
- [ ] Bot conversacional (Telegram, WhatsApp)

**Referencia:** GoJulito (bot Alfred), APP.PRESTAMISTA (alertas diarias, Telegram)

---

## TABLA COMPARATIVA RÁPIDA

| Criterio | A (n8n) | B (Next.js) | D (FastAPI) |
|----------|---------|-------------|-------------|
| Web app | ❌ No | ✅ Sí | ✅ Sí |
| Backend propio | ❌ | ❌ (Supabase) | ✅ Sí |
| Cálculos complejos | ❌ | ⚠️ Limitado | ✅ Ideal |
| Time-to-market | ✅ 1-2 sem | ✅ 2-4 sem | ⚠️ 3-6 sem |
| PDF generation | ❌ | ⚠️ Básico | ✅ WeasyPrint |
| Facturación AFIP | ❌ | ⚠️ Posible | ✅ Ideal |
| n8n automatizaciones | ✅ Core | Opcional | ✅ Sí |
| Deploy | Dokploy | Dokploy + Docker | Dokploy + Docker |
| Responsable | Edu | Edu | Martin |

---

## CHECKLIST PRE-DECISIÓN

Antes de elegir el stack, responder:

1. ¿Hay cálculos financieros (intereses, amortizaciones, impuestos)? → FastAPI
2. ¿Hay integración con APIs gubernamentales (AFIP, ARCA)? → FastAPI
3. ¿El backend necesita correr jobs cada X tiempo sin depender del frontend? → FastAPI
4. ¿Es principalmente pantallas CRUD + dashboard? → Next.js
5. ¿El equipo conoce Python o solo JS/TS? → Considerar Next.js si solo JS/TS
6. ¿El presupuesto es ajustado y el tiempo es corto? → Next.js

---

## COMBINACIONES DE DEPLOYMENT

| Perfil | Frontend | Backend | DB/Auth | Automatización |
|--------|----------|---------|---------|----------------|
| A | - | - | Supabase | n8n en Dokploy |
| B | Dokploy (Docker) | API Routes (Next.js) | Supabase | n8n en Dokploy |
| C | Dokploy (Docker) | API Routes (Next.js) | Supabase | n8n en Dokploy |
| D | Vercel / Dokploy | Railway / Dokploy | Supabase | n8n en Railway |

---

## HISTORIAL DE DECISIONES

| Proyecto | Perfil | Responsable | Razón Principal |
|----------|--------|-------------|-----------------|
| GoJulito | B | Edu | Gestión operativa, CRUD, bot Telegram |
| APP.PRESTAMISTA | D | Martin | Cálculo de cuotas, amortizaciones, penalidades |
| DM Cars | D | Martin | Facturación AFIP (ARCA), cálculos de comisiones |
| Finanzas-JY | B | Edu | Panel financiero, CRUD, reportes básicos |
| Jamrock | B/TBD | Edu | En definición |

---

*Actualizar este documento con cada nuevo proyecto y su justificación de stack.*
