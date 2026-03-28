# 🚀 KICKOFF — [NOMBRE PROYECTO]

> **Fecha de kickoff:** ____/____/______
> **Proyecto:** [NOMBRE]
> **Stack:** [NEXTJS/FASTAPI] + Supabase

---

## CHECKLIST PRE-KICKOFF

### 📋 Comercial
- [ ] Contrato firmado por ambas partes
- [ ] Pago inicial recibido y confirmado
- [ ] Alcance final acordado (sin ambigüedades)

### ⚙️ GitHub
- [ ] Repositorio creado en GitHub
  - Nombre: `[nombre-proyecto]`
  - Privado / Público
  - README inicial
- [ ] Estructura GSD inicializada (`/scripts/gsd-init` o manual)
  - [ ] `.planning/PROJECT.md`
  - [ ] `.planning/REQUIREMENTS.md`
  - [ ] `.planning/ROADMAP.md`
  - [ ] `.planning/STATE.md`
  - [ ] `.planning/PLAN.md`
- [ ] Branch strategy definida: `main` + `develop` + features
- [ ] `.gitignore` configurado (no commitear `.env`)
- [ ] `CLAUDE.md` creado con contexto del proyecto

### 🗄️ Supabase
- [ ] Proyecto Supabase creado
  - Nombre: `[nombre-proyecto]`
  - Región: [seleccionar más cercana al cliente]
- [ ] Variables de entorno documentadas en `.env.example`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (solo backend)
- [ ] Schema inicial creado (migraciones en `/database/migrations/`)
- [ ] RLS habilitado en tablas sensibles
- [ ] Políticas de seguridad básicas configuradas
- [ ] Seed data inicial (si aplica)

### 🚀 Deployment
- [ ] Proyecto Vercel creado y conectado al repo
- [ ] Variables de entorno configuradas en Vercel
- [ ] Deploy automático desde `main` configurado
- [ ] URL de producción compartida con el cliente

### 🤖 n8n (si aplica)
- [ ] Instancia n8n configurada (Railway / self-hosted)
- [ ] Credenciales Supabase configuradas en n8n
- [ ] Webhook URLs de producción documentadas
- [ ] Workflow de prueba ejecutado correctamente

### 📁 Estructura del proyecto
**Para Next.js:**
```
[proyecto]/
├── .planning/          ← GSD
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   └── api/
├── components/
│   ├── ui/
│   └── [modulo]/
├── lib/
│   ├── supabase/
│   └── utils/
├── database/
│   └── migrations/
├── public/
├── CLAUDE.md
└── .env.example
```

**Para FastAPI + React:**
```
[proyecto]/
├── .planning/          ← GSD
├── backend/
│   ├── app/
│   ├── models/
│   ├── routers/
│   └── services/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── hooks/
├── db/migrations/
├── n8n/workflows/
├── docs/
├── CLAUDE.md
└── .env.example
```

---

## REUNIÓN DE KICKOFF

**Duración:** 1-2 horas

### Agenda
1. **Presentación del equipo** (5 min)
2. **Revisión del scope final** (15 min) — confirmar que todos entienden qué entra y qué no
3. **Demo del entorno inicial** (15 min) — mostrar repo, Supabase, deploy
4. **Flujo de trabajo** (15 min) — cómo comunicaremos avances, cómo se reportan bugs
5. **Calendario de milestones** (10 min) — fechas clave y demos
6. **Accesos y herramientas** (10 min) — dar accesos necesarios al cliente
7. **Preguntas** (15 min)

### Acuerdos del kickoff

| Tema | Acuerdo |
|------|---------|
| Canal de comunicación | [ ] WhatsApp [ ] Slack [ ] Email |
| Frecuencia de updates | Semanal / Bi-semanal |
| Formato de demo/validación | [ ] Videollamada [ ] Loom [ ] Presencial |
| Tiempo de respuesta del cliente | ___ días hábiles |
| Quién valida los entregables | |
| Quién tiene acceso al código | |

---

## CLAUDE.md DEL PROYECTO (template base)

```markdown
# [NOMBRE PROYECTO]

## Descripción
[Descripción breve del proyecto]

## Stack
- Frontend: [Next.js 14 / React 18]
- Backend: [Supabase / FastAPI]
- DB: Supabase PostgreSQL
- Automatizaciones: n8n

## Comandos de desarrollo
\`\`\`bash
npm run dev         # Iniciar desarrollo
npm run build       # Build producción
\`\`\`

## Variables de entorno
Ver .env.example

## Estructura de base de datos
Ver database/migrations/

## Roles de usuario
- Admin: acceso total
- [Rol 2]: [permisos]

## Notas importantes
- Soft deletes siempre (no DELETE directo)
- RLS habilitado en Supabase
- Validación en servidor siempre
```

---
*Template v1.0 — Basado en kickoffs de GoJulito, APP.PRESTAMISTA, DM Cars*
