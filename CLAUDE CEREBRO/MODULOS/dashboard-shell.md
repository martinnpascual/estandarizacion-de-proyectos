# MÓDULO: dashboard-shell

## Descripción

Layout base del dashboard con sidebar responsive, navegación protegida por auth, y sistema de design tokens por cliente. Incluye: layout principal, sidebar con Sheet para mobile, header, estado de usuario, y badge de estado.

## Stack
B (Next.js) y D (React)

## Proyectos que lo usan
- GoJulito — `gj-*` tokens, dark theme `#0a0f1e`
- Finanzas-jy — `jy-*` tokens, dark theme `#0d1b2a`
- DM Cars — Stack D (React)
- APP.PRESTAMISTA — Stack D (React), mobile-first para cobradores

---

## Stack B (Next.js) — Implementación completa

### Tailwind config con design tokens del cliente

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Reemplazar 'gj' con el prefijo del cliente (jy, dm, pr, etc.)
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
      },
      fontFamily: {
        // Personalizar por cliente
        display: ['Fraunces', 'serif'],
        body:    ['DM Sans', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
export default config
```

### Layout protegido

```typescript
// app/(protected)/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/DashboardShell'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  return <DashboardShell user={user} profile={profile}>{children}</DashboardShell>
}
```

### DashboardShell con sidebar responsive

```typescript
// components/DashboardShell.tsx
'use client'
import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Sidebar } from './Sidebar'
import { Menu } from 'lucide-react'

interface Props {
  user: any
  profile: any
  children: React.ReactNode
}

export function DashboardShell({ user, profile, children }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gj-bg text-gj-text">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-gj-surface border-r border-gj-border">
        <Sidebar profile={profile} />
      </aside>

      {/* Sidebar mobile */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-gj-surface border-gj-border">
          <Sidebar profile={profile} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center gap-3 px-4 border-b border-gj-border bg-gj-surface">
          <SheetTrigger asChild onClick={() => setOpen(true)}>
            <button className="md:hidden p-2 rounded hover:bg-gj-border">
              <Menu size={20} />
            </button>
          </SheetTrigger>
          <span className="text-sm text-gj-muted">
            {profile?.nombre || user.email}
          </span>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### Sidebar con navegación activa

```typescript
// components/Sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/clientes', label: 'Clientes', icon: '👥' },
  // Personalizar por proyecto
]

export function Sidebar({ profile, onNavigate }: { profile: any, onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex flex-col h-full p-4">
      <div className="mb-6">
        <p className="text-lg font-bold text-gj-text">Nombre App</p>
        <p className="text-xs text-gj-muted">{profile?.rol || 'usuario'}</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
              pathname.startsWith(item.href)
                ? 'bg-gj-primary text-white'
                : 'text-gj-muted hover:text-gj-text hover:bg-gj-border'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <button onClick={handleLogout} className="mt-4 text-xs text-gj-muted hover:text-gj-danger">
        Cerrar sesión
      </button>
    </div>
  )
}
```

---

## Stack D (React + Vite) — Patrón mobile-first (APP.PRESTAMISTA)

Para cobradores en campo: layout mobile-first con bottom navigation en lugar de sidebar.

```typescript
// src/components/AppShell.tsx
// Bottom nav para mobile, sidebar para desktop
// Usar Zustand para estado global de UI
```

---

## Adaptaciones por proyecto

| Proyecto | Prefijo tokens | Bg | Surface | Primary | Notas |
|---------|---------------|-----|---------|---------|-------|
| GoJulito | `gj-` | `#0a0f1e` | `#111827` | `#6366f1` | - |
| Finanzas-jy | `jy-` | `#0d1b2a` | `#112240` | `#6366f1` | Fraunces + DM Sans |
| DM Cars | `dm-` | a definir | a definir | a definir | Stack D |
| Prestamista | `pr-` | a definir | a definir | a definir | Mobile-first |

---

## Dependencias npm

```bash
npm install @radix-ui/react-dialog lucide-react
# shadcn/ui (instalar manualmente en Node 18)
# En Node 20+: npx shadcn@latest init
```

## Consideraciones

- shadcn/ui NO instala correctamente con Node 18 via CLI — copiar componentes manualmente
- Con Node 20+: `npx shadcn@latest init` funciona correctamente
- Los design tokens `xx-*` deben ser consistentes en TODO el proyecto — evitar hex hardcodeados
- El Sheet de mobile requiere `SheetTrigger` asChild para el botón hamburguesa

## Historial de cambios

| Fecha | Cambio | Proyecto origen |
|-------|--------|----------------|
| 2026-03-28 | Módulo creado consolidando GoJulito + Finanzas-jy | CEREBRO |

*Madurez: ★★★★☆*
