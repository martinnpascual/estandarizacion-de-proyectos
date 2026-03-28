# INTAKE — GoJulito

**Fecha de intake:** 2025 (aprox, previo a CEREBRO)
**Responsable:** Edu
**Estado:** completo (proyecto activo en producción)

---

## Información del negocio

| Campo | Valor |
|-------|-------|
| Nombre del negocio | GoJulito |
| Rubro / industria | Agencia de trámites migratorios |
| Ubicación | Argentina |
| Tamaño (empleados) | Pequeño equipo |
| Años en el mercado | — |
| Sitio web / redes | — |

## Contacto principal

| Campo | Valor |
|-------|-------|
| Nombre | — |
| Rol en el negocio | Dueño |
| WhatsApp | — |
| Email | — |
| Preferencia de comunicación | — |

---

## Procesos actuales

- Gestión de clientes (visas, seminarios, cursos)
- Cobros y seguimiento de pagos
- Comunicación con clientes vía WhatsApp

## Qué necesitaba

- Sistema CRM para gestión de clientes
- Control de visas y trámites
- Historial de seminarios y cursos
- Bot de Telegram para notificaciones y comandos internos
- Portal de pagos y seguimiento

## Roles de usuario

| Rol | Descripción |
|-----|-------------|
| Admin | Acceso total, gestión general |
| Operador | Gestión de clientes y trámites |

## Integraciones requeridas

- [x] Telegram (bot Alfred — notificaciones + comandos)
- [ ] AFIP / ARCA
- [ ] Pasarela de pagos

---

## Evaluación interna

**Stack asignado:** B (Next.js 14 + Supabase + Tailwind + Dokploy)
**Módulos aplicados:** dashboard-shell, auth-supabase, crud-base, audit-historial, bot-telegram-n8n
**Complejidad estimada:** Media-Alta
**Responsable técnico:** Edu

## Notas

- Proyecto v1.0 y v1.1 ya shippeados
- v1.2 Phase 07 completada
- Bot Alfred con arquitectura multi-comando
- Deuda técnica: 843 valores hex hardcodeados (design tokens sin sistematizar)
- UI score: 16/24 — pendiente mejoras UX Phase siguiente
