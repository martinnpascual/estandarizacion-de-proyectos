# MÓDULO: design-tokens

## Descripción

Sistema de design tokens por cliente usando prefijos Tailwind (`gj-*`, `jy-*`, etc.). Permite tener múltiples proyectos con identidad visual diferente sin conflictos, manteniendo consistencia interna. Incluye colores, tipografía y utilitarios de formato.

## Stack
B (Next.js + Tailwind) — también aplicable en Stack D (React + Tailwind)

## Proyectos que lo usan
- GoJulito — prefijo `gj-`, dark theme `#0a0f1e`
- Finanzas-jy — prefijo `jy-`, dark theme `#0d1b2a`
- DM Cars — prefijo `dm-` (pendiente definición)
- APP.PRESTAMISTA — prefijo `pr-` (pendiente definición)

---

## Convención de prefijos por cliente

| Proyecto | Prefijo | Bg base | Surface | Primary |
|---------|---------|---------|---------|---------|
| GoJulito | `gj-` | `#0a0f1e` | `#111827` | `#6366f1` |
| Finanzas-jy | `jy-` | `#0d1b2a` | `#112240` | `#6366f1` |
| DM Cars | `dm-` | TBD | TBD | TBD |
| APP.PRESTAMISTA | `pr-` | TBD | TBD | TBD |

---

## tailwind.config.ts — Plantilla base

```typescript
// tailwind.config.ts — Reemplazar 'xx' con el prefijo del cliente
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // REEMPLAZAR 'xx' con el prefijo del cliente (gj, jy, dm, pr, etc.)
        'xx-bg':        '#0a0f1e',   // Background base
        'xx-surface':   '#111827',   // Cards, panels, sidebar
        'xx-border':    '#1f2937',   // Bordes, separadores
        'xx-primary':   '#6366f1',   // Color principal, botones activos
        'xx-primary-h': '#4f46e5',   // Hover del primary
        'xx-text':      '#f9fafb',   // Texto principal
        'xx-muted':     '#9ca3af',   // Texto secundario, placeholders
        'xx-success':   '#10b981',   // Éxito, ingresos
        'xx-warning':   '#f59e0b',   // Advertencia, compromisos fijos
        'xx-danger':    '#ef4444',   // Error, gastos variables
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],   // Títulos (Finanzas-jy)
        body:    ['DM Sans', 'sans-serif'], // Body (Finanzas-jy)
        // GoJulito usa Inter por defecto (sin override necesario)
      }
    },
  },
  plugins: [],
}
export default config
```

---

## GoJulito — Configuración completa (`gj-*`)

```typescript
colors: {
  'gj-bg':        '#0a0f1e',
  'gj-surface':   '#111827',
  'gj-border':    '#1f2937',
  'gj-primary':   '#6366f1',
  'gj-primary-h': '#4f46e5',
  'gj-text':      '#f9fafb',
  'gj-muted':     '#9ca3af',
  'gj-success':   '#10b981',
  'gj-warning':   '#f59e0b',
  'gj-danger':    '#ef4444',
}
```

## Finanzas-jy — Configuración completa (`jy-*`)

```typescript
colors: {
  'jy-bg':        '#0d1b2a',
  'jy-surface':   '#112240',
  'jy-border':    '#1e3a5f',
  'jy-primary':   '#6366f1',
  'jy-primary-h': '#4f46e5',
  'jy-text':      '#f9fafb',
  'jy-muted':     '#9ca3af',
  // Colores semánticos por tipo de movimiento
  'jy-ingreso':   '#10b981',   // verde
  'jy-fijo':      '#f59e0b',   // amarillo
  'jy-variable':  '#ef4444',   // rojo
  'jy-inversion': '#6366f1',   // violeta
}
```

---

## Formato ARS — Finanzas-jy

```typescript
// lib/utils/format.ts
export const formatARS = (monto: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto)

// Uso:
// formatARS(150000) → "$150.000"
// formatARS(1500000) → "$1.500.000"
```

---

## Google Fonts — next.config / layout

```typescript
// app/layout.tsx (Stack B)
import { Fraunces, DM_Sans } from 'next/font/google'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body className="font-body">{children}</body>
    </html>
  )
}
```

---

## Consideraciones

- Los tokens `xx-*` deben ser **consistentes en TODO el proyecto** — nunca mezclar hex hardcodeados con tokens
- GoJulito tiene deuda técnica de **843 valores hex hardcodeados** — migración pendiente
- Al crear un proyecto nuevo: definir prefijo + paleta completa ANTES de escribir código
- Los tokens de color semántico (success/warning/danger) deben mapear a la lógica de negocio del cliente

## Historial de cambios

| Fecha | Cambio | Proyecto origen |
|-------|--------|----------------|
| 2026-03-28 | Módulo creado desde GoJulito + Finanzas-jy | CEREBRO |

*Madurez: ★★★★☆*
