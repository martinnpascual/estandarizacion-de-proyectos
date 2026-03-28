# 🎨 DESIGN SYSTEM ESTÁNDAR

> **Versión:** 1.0 | **Fecha:** 2026-03-28
> Guía de diseño para proyectos del portfolio.

---

## PRINCIPIOS DE DISEÑO

1. **Claridad sobre creatividad** — Los usuarios son operadores, no consumidores. La funcionalidad prima sobre lo visual.
2. **Consistencia** — Mismos patrones de UI en todos los proyectos para reducir curva de aprendizaje.
3. **Mobile-first** — Los operadores frecuentemente usan el sistema desde el celular.
4. **Feedback inmediato** — Toda acción debe tener un estado visual claro (loading, éxito, error).

---

## PALETA DE COLORES

### Estándar de tokens CSS (inspirado en GoJulito con tokens `gj-*`)

Cada proyecto define su color primario. El resto del sistema es consistente:

```css
/* tailwind.config.ts — Agregar a cada proyecto */
extend: {
  colors: {
    primary: {
      50:  '[color-50]',
      100: '[color-100]',
      500: '[color-500]',   /* ← Color principal del proyecto */
      600: '[color-600]',
      700: '[color-700]',
    }
  }
}
```

### Colores semánticos (consistentes en todos los proyectos)

| Propósito | Color Tailwind | Uso |
|-----------|----------------|-----|
| Éxito | `green-600` | Confirmaciones, pagos recibidos |
| Error | `red-600` | Errores, acciones destructivas |
| Advertencia | `yellow-500` | Alertas, vencimientos próximos |
| Info | `blue-600` | Información, estados neutros |
| Neutral | `gray-500` | Texto secundario, bordes |

---

## TIPOGRAFÍA

```css
/* Usar fuente del sistema — no cargar fuentes externas para performance */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Escala de tamaños (Tailwind) */
text-xs    /* 12px — Labels pequeños, metadata */
text-sm    /* 14px — Texto de tabla, secundario */
text-base  /* 16px — Texto de cuerpo */
text-lg    /* 18px — Subtítulos */
text-xl    /* 20px — Títulos de sección */
text-2xl   /* 24px — Títulos de página */
```

---

## LAYOUT ESTÁNDAR

### Estructura de página (dashboard apps)

```
┌─────────────────────────────────────────┐
│  SIDEBAR (256px)  │  CONTENT AREA       │
│                   │  ┌───────────────┐  │
│  [Logo]           │  │ Page Header   │  │
│  ─────────────    │  │ (título + CTA)│  │
│  Navigation       │  ├───────────────┤  │
│  ─────────────    │  │               │  │
│  [User info]      │  │  Main Content │  │
│                   │  │               │  │
│                   │  └───────────────┘  │
└─────────────────────────────────────────┘
```

### Mobile layout

```
┌───────────────────┐
│  [≡ Menu] [Logo]  │  ← Navbar top
├───────────────────┤
│                   │
│   Main Content    │
│                   │
├───────────────────┤
│  [Home][List][+]  │  ← Bottom nav (opcional)
└───────────────────┘
```

---

## COMPONENTES ESTÁNDAR

### Botones

```typescript
// Variantes estándar
<Button variant="primary">Guardar</Button>          // Acción principal
<Button variant="secondary">Cancelar</Button>        // Acción secundaria
<Button variant="danger">Eliminar</Button>           // Acción destructiva
<Button variant="ghost">Ver detalles</Button>        // Acción terciaria

// Estados obligatorios
<Button disabled>...</Button>     // Deshabilitado
<Button loading>Guardando...</Button>  // Cargando

// Clases Tailwind base:
// Primary: bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg
// Danger:  bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg
// Ghost:   text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-lg
```

### Tablas

```typescript
// Estructura estándar para tablas de datos
<div className="bg-white rounded-lg border overflow-hidden">
  <div className="px-4 py-3 border-b flex items-center justify-between">
    <h3 className="font-semibold">Título de la tabla</h3>
    <div className="flex gap-2">
      {/* Filtros y búsqueda */}
      <input placeholder="Buscar..." className="border rounded px-3 py-1.5 text-sm" />
      <Button variant="primary" size="sm">Nuevo</Button>
    </div>
  </div>
  <table className="w-full">
    <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
      <tr>
        <th className="px-4 py-3 text-left">Campo</th>
        <th className="px-4 py-3 text-right">Acciones</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      {/* Filas */}
    </tbody>
  </table>
</div>
```

### Formularios

```typescript
// Campo de formulario con label y error
<div className="space-y-1">
  <label className="block text-sm font-medium text-gray-700">
    Nombre *
  </label>
  <input
    type="text"
    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
               focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
               disabled:bg-gray-50 disabled:text-gray-500"
  />
  {error && (
    <p className="text-sm text-red-600">{error.message}</p>
  )}
</div>
```

### Estados de feedback

```typescript
// Loading skeleton
<div className="animate-pulse bg-gray-200 rounded h-4 w-32" />

// Estado vacío
<div className="text-center py-12 text-gray-500">
  <Icon className="mx-auto mb-3 w-12 h-12 text-gray-300" />
  <p className="font-medium">No hay registros</p>
  <p className="text-sm">Crea el primero haciendo clic en "Nuevo"</p>
</div>

// Error state
<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
  <p className="font-medium">Error al cargar los datos</p>
  <p className="text-sm">{errorMessage}</p>
</div>
```

---

## PATRONES DE NAVEGACIÓN

### Sidebar items

```typescript
// Agrupar por sección:
const navItems = [
  { section: 'Principal', items: [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
  ]},
  { section: 'Gestión', items: [
    { href: '/clientes', icon: Users, label: 'Clientes' },
    { href: '/[modulo]', icon: Icon, label: 'Módulo' },
  ]},
  { section: 'Configuración', items: [
    { href: '/configuracion', icon: Settings, label: 'Configuración', roles: ['admin'] },
  ]},
]
```

---
*Design System v1.0 — Basado en GoJulito y APP.PRESTAMISTA*
