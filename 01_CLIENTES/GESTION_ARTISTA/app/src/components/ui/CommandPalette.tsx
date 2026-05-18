"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Disc,
  Mic2,
  FolderKanban,
  Users,
  DollarSign,
  Receipt,
  ListMusic,
  BarChart3,
  Calendar,
  UserCheck,
  Share2,
  Trash2,
  User,
  Plus,
  Music,
  FileAudio,
  Briefcase,
  Handshake,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  Keyboard,
  ArrowRight,
  Command,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemKind = "nav" | "create" | "shortcut";

interface PaletteItem {
  id: string;
  kind: ItemKind;
  label: string;
  description?: string;
  icon: React.ElementType;
  path?: string;
  shortcut?: string[];
  category?: string;
  keywords?: string[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const NAV_ITEMS: PaletteItem[] = [
  {
    id: "nav-dashboard",
    kind: "nav",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
    shortcut: ["G", "D"],
    keywords: ["inicio", "home", "panel"],
  },
  {
    id: "nav-discografia",
    kind: "nav",
    label: "Discografía",
    icon: Disc,
    path: "/discografia",
    shortcut: ["G", "S"],
    keywords: ["canciones", "álbumes", "singles", "tracks"],
  },
  {
    id: "nav-maquetas",
    kind: "nav",
    label: "Maquetas",
    icon: Mic2,
    path: "/maquetas",
    keywords: ["demos", "grabaciones", "bocetos"],
  },
  {
    id: "nav-proyectos",
    kind: "nav",
    label: "Proyectos",
    icon: FolderKanban,
    path: "/proyectos",
    keywords: ["kanban", "tareas", "trabajo"],
  },
  {
    id: "nav-collabs",
    kind: "nav",
    label: "Collabs",
    icon: Users,
    path: "/collabs",
    keywords: ["colaboraciones", "artistas", "features"],
  },
  {
    id: "nav-ingresos",
    kind: "nav",
    label: "Ingresos",
    icon: DollarSign,
    path: "/ingresos",
    keywords: ["dinero", "ganancias", "royalties", "pagos", "ventas"],
  },
  {
    id: "nav-gastos",
    kind: "nav",
    label: "Gastos",
    icon: Receipt,
    path: "/gastos",
    keywords: ["dinero", "egresos", "pagos", "facturas"],
  },
  {
    id: "nav-setlists",
    kind: "nav",
    label: "Setlists",
    icon: ListMusic,
    path: "/setlists",
    keywords: ["listas", "shows", "conciertos", "presentaciones"],
  },
  {
    id: "nav-estadisticas",
    kind: "nav",
    label: "Estadísticas",
    icon: BarChart3,
    path: "/estadisticas",
    keywords: ["análisis", "métricas", "datos", "gráficos"],
  },
  {
    id: "nav-calendario",
    kind: "nav",
    label: "Calendario",
    icon: Calendar,
    path: "/calendario",
    keywords: ["agenda", "eventos", "fechas", "citas"],
  },
  {
    id: "nav-metas",
    kind: "nav",
    label: "Metas",
    icon: TrendingUp,
    path: "/metas",
    keywords: ["objetivos", "goals", "targets", "hitos"],
  },
  {
    id: "nav-analizar",
    kind: "nav",
    label: "Analizar BPM",
    icon: BarChart3,
    path: "/analizar",
    keywords: ["bpm", "tempo", "análisis", "ia", "audio"],
  },
  {
    id: "nav-equipo",
    kind: "nav",
    label: "Equipo",
    icon: UserCheck,
    path: "/equipo",
    keywords: ["team", "managers", "productores", "colaboradores"],
  },
  {
    id: "nav-redes",
    kind: "nav",
    label: "Redes",
    icon: Share2,
    path: "/redes",
    keywords: ["social", "instagram", "tiktok", "spotify", "redes sociales"],
  },
  {
    id: "nav-notificaciones",
    kind: "nav",
    label: "Notificaciones",
    icon: Briefcase,
    path: "/notificaciones",
    keywords: ["alertas", "avisos", "pendientes", "vencidos"],
  },
  {
    id: "nav-papelera",
    kind: "nav",
    label: "Papelera",
    icon: Trash2,
    path: "/papelera",
    keywords: ["eliminados", "trash", "borrar"],
  },
  {
    id: "nav-perfil",
    kind: "nav",
    label: "Perfil",
    icon: User,
    path: "/perfil",
    keywords: ["cuenta", "configuración", "artista"],
  },
  {
    id: "nav-buscar",
    kind: "nav",
    label: "Buscar",
    icon: Search,
    path: "/buscar",
    shortcut: ["/"],
    keywords: ["search", "encontrar"],
  },
];

const CREATE_ITEMS: PaletteItem[] = [
  {
    id: "create-cancion",
    kind: "create",
    label: "Nueva canción",
    icon: Music,
    path: "/discografia?action=create",
    category: "Discografía",
    keywords: ["track", "single", "tema", "song"],
  },
  {
    id: "create-maqueta",
    kind: "create",
    label: "Nueva maqueta",
    icon: FileAudio,
    path: "/maquetas?action=create",
    category: "Maquetas",
    keywords: ["demo", "grabación", "boceto"],
  },
  {
    id: "create-proyecto",
    kind: "create",
    label: "Nuevo proyecto",
    icon: Briefcase,
    path: "/proyectos?action=create",
    category: "Proyectos",
    keywords: ["trabajo", "tarea", "album"],
  },
  {
    id: "create-collab",
    kind: "create",
    label: "Nueva collab",
    icon: Handshake,
    path: "/collabs?action=create",
    category: "Collabs",
    keywords: ["colaboración", "feature", "artista"],
  },
  {
    id: "create-ingreso",
    kind: "create",
    label: "Nuevo ingreso",
    icon: TrendingUp,
    path: "/ingresos?action=create",
    category: "Finanzas",
    keywords: ["dinero", "pago", "royalty", "venta"],
  },
  {
    id: "create-gasto",
    kind: "create",
    label: "Nuevo gasto",
    icon: TrendingDown,
    path: "/gastos?action=create",
    category: "Finanzas",
    keywords: ["dinero", "egreso", "factura", "pago"],
  },
  {
    id: "create-setlist",
    kind: "create",
    label: "Nueva setlist",
    icon: ClipboardList,
    path: "/setlists?action=create",
    category: "Setlists",
    keywords: ["lista", "show", "concierto"],
  },
  {
    id: "create-evento",
    kind: "create",
    label: "Nuevo evento",
    icon: Calendar,
    path: "/calendario?new=1",
    category: "Calendario",
    keywords: ["fecha", "show", "concierto", "sesión", "lanzamiento"],
  },
  {
    id: "create-meta",
    kind: "create",
    label: "Nueva meta",
    icon: TrendingUp,
    path: "/metas?new=1",
    category: "Metas",
    keywords: ["objetivo", "goal", "target"],
  },
];

const SHORTCUT_ITEMS: PaletteItem[] = [
  {
    id: "shortcut-palette",
    kind: "shortcut",
    label: "Abrir paleta de comandos",
    icon: Command,
    shortcut: ["⌘", "K"],
    keywords: ["comando", "palette", "buscar"],
  },
  {
    id: "shortcut-search",
    kind: "shortcut",
    label: "Búsqueda global",
    icon: Search,
    shortcut: ["/"],
    keywords: ["buscar", "search", "global"],
  },
  {
    id: "shortcut-new",
    kind: "shortcut",
    label: "Crear nuevo elemento",
    icon: Plus,
    shortcut: ["⌘", "N"],
    keywords: ["crear", "nuevo", "new"],
  },
  {
    id: "shortcut-keyboard",
    kind: "shortcut",
    label: "Ver todos los atajos",
    icon: Keyboard,
    path: "/perfil?tab=atajos",
    shortcut: ["?"],
    keywords: ["atajos", "shortcuts", "teclado"],
  },
];

const ALL_ITEMS = [...NAV_ITEMS, ...CREATE_ITEMS, ...SHORTCUT_ITEMS];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function filterItems(query: string): PaletteItem[] {
  const q = normalize(query.trim());
  if (!q) return [];
  return ALL_ITEMS.filter((item) => {
    const haystack = [
      item.label,
      item.description ?? "",
      item.category ?? "",
      ...(item.keywords ?? []),
    ]
      .map(normalize)
      .join(" ");
    return haystack.includes(q);
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ShortcutBadge({ keys }: { keys: string[] }) {
  return (
    <span className="flex items-center gap-0.5 shrink-0">
      {keys.map((k, i) => (
        <kbd
          key={i}
          className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded
                     bg-white/10 border border-white/20 text-[10px] font-mono text-white/60
                     leading-none"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}

function CategoryBadge({ label }: { label: string }) {
  return (
    <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full
                     bg-violet-500/20 text-violet-300 border border-violet-500/30 leading-none">
      {label}
    </span>
  );
}

interface PaletteRowProps {
  item: PaletteItem;
  isActive: boolean;
  onClick: () => void;
}

function PaletteRow({ item, isActive, onClick }: PaletteRowProps) {
  const Icon = item.icon;

  const kindColor: Record<ItemKind, string> = {
    nav: "text-sky-400",
    create: "text-emerald-400",
    shortcut: "text-amber-400",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
        transition-all duration-100 group
        ${
          isActive
            ? "bg-white/10 shadow-inner"
            : "hover:bg-white/5"
        }
      `}
    >
      {/* Icon */}
      <span
        className={`
          flex items-center justify-center w-8 h-8 rounded-xl shrink-0
          transition-all duration-100 group-hover:scale-110
          ${isActive ? "bg-white/10 scale-110" : "bg-white/5 group-hover:bg-white/8"}
          ${kindColor[item.kind]}
        `}
      >
        <Icon size={15} strokeWidth={1.75} />
      </span>

      {/* Label */}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-white/90 truncate leading-tight">
          {item.label}
        </span>
        {item.description && (
          <span className="block text-xs text-white/40 truncate mt-0.5">
            {item.description}
          </span>
        )}
      </span>

      {/* Right side: category + shortcut + arrow */}
      <span className="flex items-center gap-2 shrink-0">
        {item.category && <CategoryBadge label={item.category} />}
        {item.shortcut && <ShortcutBadge keys={item.shortcut} />}
        {isActive && (
          <ArrowRight
            size={13}
            className="text-white/30 animate-pulse"
          />
        )}
      </span>
    </button>
  );
}

interface SectionProps {
  title: string;
  items: PaletteItem[];
  activeIndex: number;
  globalOffset: number;
  onSelect: (item: PaletteItem) => void;
}

function Section({
  title,
  items,
  activeIndex,
  globalOffset,
  onSelect,
}: SectionProps) {
  if (items.length === 0) return null;
  return (
    <div className="mb-1">
      <p className="px-3 pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-white/30 select-none">
        {title}
      </p>
      {items.map((item, i) => (
        <PaletteRow
          key={item.id}
          item={item}
          isActive={activeIndex === globalOffset + i}
          onClick={() => onSelect(item)}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLButtonElement | null>(null);

  // Derived state
  const isSearching = query.trim().length > 0;
  const filteredItems = isSearching ? filterItems(query) : [];

  // Flat list for keyboard nav — depends on whether we're searching
  const flatList: PaletteItem[] = isSearching
    ? filteredItems
    : [...NAV_ITEMS, ...CREATE_ITEMS, ...SHORTCUT_ITEMS];

  // ── Open / close ────────────────────────────────────────────────────────────

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  // ── Global keyboard listener ────────────────────────────────────────────────

  useEffect(() => {
    function handleGlobal(e: globalThis.KeyboardEvent) {
      // Cmd+K / Ctrl+K → toggle
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) {
            closePalette();
            return false;
          }
          openPalette();
          return true;
        });
      }
    }
    window.addEventListener("keydown", handleGlobal);
    return () => window.removeEventListener("keydown", handleGlobal);
  }, [openPalette, closePalette]);

  // ── Focus input on open ─────────────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ── Reset active index when query changes ───────────────────────────────────

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // ── Scroll active row into view ─────────────────────────────────────────────

  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // ── Handle item selection ───────────────────────────────────────────────────

  const handleSelect = useCallback(
    (item: PaletteItem) => {
      if (item.path) {
        router.push(item.path);
      }
      closePalette();
    },
    [router, closePalette]
  );

  // ── Palette keyboard navigation ─────────────────────────────────────────────

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      closePalette();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        flatList.length === 0 ? 0 : (prev + 1) % flatList.length
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        flatList.length === 0
          ? 0
          : (prev - 1 + flatList.length) % flatList.length
      );
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const item = flatList[activeIndex];
      if (item) handleSelect(item);
      return;
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!open) return null;

  // Section offsets for active-index tracking
  const navOffset = 0;
  const createOffset = NAV_ITEMS.length;
  const shortcutOffset = NAV_ITEMS.length + CREATE_ITEMS.length;

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        aria-hidden="true"
        onClick={closePalette}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm
                   animate-in fade-in duration-150"
      />

      {/* ── Panel ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4
                   pointer-events-none"
      >
        <div
          className="
            w-full max-w-xl pointer-events-auto overflow-hidden
            rounded-2xl border border-white/[0.08]
            bg-[#0c0b12]/92 backdrop-blur-3xl
            shadow-[0_40px_100px_hsl(0_0%_0%/0.65),0_0_0_1px_hsl(0_0%_100%/0.04)_inset,0_0_40px_hsl(var(--primary)/0.06)]
            animate-in fade-in zoom-in-95 duration-150 ease-out
          "
        >
          {/* ── Search input ── */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
            <Search
              size={16}
              className="shrink-0 text-white/40"
              strokeWidth={2}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar páginas, acciones, atajos…"
              autoComplete="off"
              spellCheck={false}
              className="
                flex-1 bg-transparent text-sm text-white placeholder-white/30
                outline-none caret-violet-400
              "
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="shrink-0 text-white/30 hover:text-white/60 transition-all active:scale-95"
                aria-label="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            )}
            <kbd
              className="hidden sm:inline-flex shrink-0 items-center justify-center
                         h-5 px-1.5 rounded border border-white/15 bg-white/5
                         text-[10px] font-mono text-white/35 leading-none"
            >
              ESC
            </kbd>
          </div>

          {/* ── Results / Default sections ── */}
          <div
            ref={scrollRef}
            className="overflow-y-auto max-h-[min(420px,60vh)] p-2 scrollbar-thin
                       scrollbar-track-transparent scrollbar-thumb-white/10"
          >
            {/* ── Searching: flat filtered list ── */}
            {isSearching && (
              <>
                {filteredItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Search size={24} className="text-white/15" />
                    <p className="text-sm text-white/30">
                      Sin resultados para{" "}
                      <span className="text-white/50 font-medium">
                        &ldquo;{query}&rdquo;
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="mb-1">
                    <p className="px-3 pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-white/30 select-none">
                      Resultados
                    </p>
                    {filteredItems.map((item, i) => (
                      <PaletteRow
                        key={item.id}
                        item={item}
                        isActive={activeIndex === i}
                        onClick={() => handleSelect(item)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── Default: three sections ── */}
            {!isSearching && (
              <>
                <Section
                  title="Navegar"
                  items={NAV_ITEMS}
                  activeIndex={activeIndex}
                  globalOffset={navOffset}
                  onSelect={handleSelect}
                />
                <Section
                  title="Crear"
                  items={CREATE_ITEMS}
                  activeIndex={activeIndex}
                  globalOffset={createOffset}
                  onSelect={handleSelect}
                />
                <Section
                  title="Atajos"
                  items={SHORTCUT_ITEMS}
                  activeIndex={activeIndex}
                  globalOffset={shortcutOffset}
                  onSelect={handleSelect}
                />
              </>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-4 py-2.5
                           border-t border-white/8">
            <span className="text-[10px] text-white/25 font-medium tracking-wide">
              BERTIAKA Studio
            </span>
            <div className="flex items-center gap-3 text-[10px] text-white/25">
              <span className="flex items-center gap-1">
                <kbd className="inline-flex items-center justify-center w-4 h-4 rounded
                                border border-white/15 bg-white/5 text-[9px] font-mono leading-none">
                  ↑
                </kbd>
                <kbd className="inline-flex items-center justify-center w-4 h-4 rounded
                                border border-white/15 bg-white/5 text-[9px] font-mono leading-none">
                  ↓
                </kbd>
                <span>navegar</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="inline-flex items-center justify-center h-4 px-1 rounded
                                border border-white/15 bg-white/5 text-[9px] font-mono leading-none">
                  ↵
                </kbd>
                <span>abrir</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="inline-flex items-center justify-center h-4 px-1 rounded
                                border border-white/15 bg-white/5 text-[9px] font-mono leading-none">
                  ESC
                </kbd>
                <span>cerrar</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
