# 📊 MÓDULO: Dashboard + KPIs

> **Versión:** 1.0 | **Fecha:** 2026-03-28
> **Presente en:** Todos los proyectos del portfolio

---

## DESCRIPCIÓN

Módulo de panel de control con métricas clave. Presente en todos los proyectos, es el primer módulo que los clientes usan al iniciar sesión.

---

## ESTRUCTURA ESTÁNDAR DE DASHBOARD

### Secciones obligatorias

```
DASHBOARD
├── Header con fecha y nombre de usuario
├── Fila 1: KPI Cards (4 métricas principales)
├── Fila 2: Gráfico principal (tendencia o distribución)
├── Fila 3: Tabla de actividad reciente
└── Accesos rápidos (botones a las funciones más usadas)
```

---

## KPI CARDS — PATRÓN DE COMPONENTE

### React (Next.js / Vite)

```typescript
// components/dashboard/KPICard.tsx
interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
    label: string
  }
  icon?: React.ReactNode
  color?: 'blue' | 'green' | 'red' | 'yellow'
}

export function KPICard({ title, value, subtitle, trend, icon, color = 'blue' }: KPICardProps) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200',
  }

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      {trend && (
        <div className={`flex items-center mt-2 text-sm ${
          trend.direction === 'up' ? 'text-green-600' :
          trend.direction === 'down' ? 'text-red-600' : 'text-gray-500'
        }`}>
          <span>{trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}</span>
          <span className="ml-1">{trend.value}% {trend.label}</span>
        </div>
      )}
    </div>
  )
}
```

### Layout de 4 KPI Cards

```typescript
// app/(dashboard)/dashboard/page.tsx
import { KPICard } from '@/components/dashboard/KPICard'
import { getDashboardStats } from '@/lib/supabase/dashboard'

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Clientes"
          value={stats.totalClientes}
          trend={{ value: 12, direction: 'up', label: 'este mes' }}
          color="blue"
        />
        <KPICard
          title="[KPI 2]"
          value={stats.kpi2}
          color="green"
        />
        <KPICard
          title="[KPI 3]"
          value={stats.kpi3}
          color="yellow"
        />
        <KPICard
          title="[KPI 4]"
          value={stats.kpi4}
          color="red"
        />
      </div>

      {/* Gráfico principal */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold mb-4">Evolución mensual</h2>
        {/* <GraficoEvolucion data={stats.evolucion} /> */}
      </div>

      {/* Actividad reciente */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold mb-4">Actividad reciente</h2>
        {/* <TablaActividad items={stats.actividadReciente} /> */}
      </div>
    </div>
  )
}
```

---

## QUERIES DE SUPABASE PARA DASHBOARD

```typescript
// lib/supabase/dashboard.ts
export async function getDashboardStats() {
  const supabase = await createClient()

  // Múltiples queries en paralelo
  const [
    { count: totalClientes },
    { data: actividadReciente },
    { data: evolucionMensual }
  ] = await Promise.all([
    supabase.from('clientes').select('*', { count: 'exact', head: true }),
    supabase.from('actividad')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.rpc('get_evolucion_mensual')
  ])

  return {
    totalClientes: totalClientes ?? 0,
    actividadReciente: actividadReciente ?? [],
    evolucionMensual: evolucionMensual ?? []
  }
}
```

---

## KPIs COMUNES POR TIPO DE PROYECTO

### Gestión de clientes/viajes (GoJulito style)
- Total clientes activos
- Visas en proceso
- Pagos pendientes
- Seminarios del mes

### Préstamos (APP.PRESTAMISTA style)
- Cartera activa ($)
- Cobros del día ($)
- Préstamos en mora
- Vencimientos próximos

### Concesionaria (DM Cars style)
- Vehículos en stock
- Ventas del mes
- Leads activos en CRM
- Órdenes de taller abiertas

### Finanzas
- Ingresos del mes
- Gastos del mes
- Saldo actual
- Comparativo vs mes anterior

---

## GRÁFICOS ESTÁNDAR

```typescript
// Usar Recharts (ya disponible en el entorno)
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function GraficoEvolucion({ data }: { data: Array<{mes: string, valor: number}> }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="mes" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="valor" stroke="#2563eb" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

---

## CHECKLIST DE IMPLEMENTACIÓN

- [ ] KPI Cards implementadas con colores distintos por métrica
- [ ] Queries de dashboard ejecutadas en paralelo (Promise.all)
- [ ] Loading states implementados (skeleton)
- [ ] Dashboard es diferente según el rol del usuario
- [ ] Responsive: funciona en mobile y desktop
- [ ] Datos actualizados (revalidación o real-time si aplica)

---
*Módulo v1.0 — Presente en todos los proyectos del portfolio*
