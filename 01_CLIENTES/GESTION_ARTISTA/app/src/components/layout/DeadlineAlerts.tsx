"use client";

/**
 * DeadlineAlerts — Banner flotante que avisa cuando hay proyectos o metas
 * con fecha límite en los próximos 7 días (o vencidos).
 * Se monta desde el layout protegido.
 */

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, ChevronRight, Clock } from "lucide-react";
import Link from "next/link";

interface DeadlineItem {
  id:       string;
  title:    string;
  href:     string;
  daysLeft: number;    // negativo = vencido
  type:     "proyecto" | "meta";
}

// ─── Fetch client-side via Supabase directo (evita Server Actions) ─────────
async function fetchDeadlines(): Promise<DeadlineItem[]> {
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7  = new Date(today);
    in7.setDate(in7.getDate() + 7);

    // Proyectos con target_date
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, target_date, status")
      .eq("created_by", user.id)
      .eq("is_deleted", false)
      .not("target_date", "is", null)
      .neq("status", "publicado")
      .lte("target_date", in7.toISOString().split("T")[0]);

    // Metas activas con due_date
    const { data: goals } = await supabase
      .from("goals")
      .select("id, title, due_date")
      .eq("created_by", user.id)
      .eq("is_completed", false)
      .not("due_date", "is", null)
      .lte("due_date", in7.toISOString().split("T")[0]);

    const items: DeadlineItem[] = [];

    for (const p of projects ?? []) {
      const d = new Date(p.target_date + "T00:00:00");
      const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
      items.push({ id: p.id, title: p.name, href: `/proyectos?project=${p.id}`, daysLeft: diff, type: "proyecto" });
    }
    for (const g of goals ?? []) {
      const d = new Date(g.due_date + "T00:00:00");
      const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
      items.push({ id: g.id, title: g.title, href: `/metas`, daysLeft: diff, type: "meta" });
    }

    // Ordenar: vencidos primero, luego por días restantes
    return items.sort((a, b) => a.daysLeft - b.daysLeft);
  } catch {
    return [];
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function urgencyLabel(days: number): string {
  if (days < 0)   return `Vencido hace ${Math.abs(days)}d`;
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `${days}d`;
}

function urgencyColor(days: number): string {
  if (days < 0)  return "text-red-400 bg-red-500/12 border-red-500/25";
  if (days <= 1) return "text-orange-400 bg-orange-500/12 border-orange-500/25";
  return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function DeadlineAlerts() {
  const pathname = usePathname();
  const [items,       setItems]       = useState<DeadlineItem[]>([]);
  const [dismissed,   setDismissed]   = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("dismissed_deadlines") ?? "[]")); }
    catch { return new Set(); }
  });
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchDeadlines();
    setItems(data);
  }, []);

  // Carga al montar y cada vez que cambia la ruta
  useEffect(() => { load(); }, [load, pathname]);

  function dismiss(id: string) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem("dismissed_deadlines", JSON.stringify(Array.from(next)));
  }

  function dismissAll() {
    const next = new Set(Array.from(dismissed).concat(visible.map(i => i.id)));
    setDismissed(next);
    localStorage.setItem("dismissed_deadlines", JSON.stringify(Array.from(next)));
  }

  const visible = items.filter(i => !dismissed.has(i.id));
  if (visible.length === 0) return null;

  // Mostrar solo el más urgente cuando está colapsado
  const top    = visible[0];
  const others = visible.slice(1);

  return (
    <AnimatePresence>
      <motion.div
        key="deadline-alerts"
        initial={{ opacity: 0, y: -16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0,   scale: 1 }}
        exit={{   opacity: 0, y: -16,  scale: 0.96 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        className="fixed top-4 right-4 z-50 max-w-xs w-full"
        style={{ left: "auto" }}
      >
        <div
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "rgba(8,8,16,0.96)",
            border: "1px solid rgba(251,191,36,0.22)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Header — siempre visible */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-amber-500/14 border border-amber-500/22 flex items-center justify-center">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white/90 leading-none">
                {visible.length === 1
                  ? "1 deadline próximo"
                  : `${visible.length} deadlines próximos`}
              </p>
              <p className="text-[10px] text-white/38 mt-0.5 truncate">{top.title}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {others.length > 0 && (
                <button
                  onClick={() => setExpanded(v => !v)}
                  className="p-1 rounded-lg hover:bg-white/8 transition-all text-white/35 hover:text-white/70"
                  aria-label={expanded ? "Colapsar" : "Ver todos"}
                >
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
                </button>
              )}
              <button
                onClick={dismissAll}
                className="p-1 rounded-lg hover:bg-white/8 transition-all text-white/35 hover:text-red-400"
                aria-label="Descartar todos"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Top item */}
          <div className="px-3 pb-1">
            <DeadlineRow item={top} onDismiss={dismiss} />
          </div>

          {/* Resto — se muestra al expandir */}
          <AnimatePresence>
            {expanded && others.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-2 space-y-1 border-t border-white/6 pt-1.5">
                  {others.map(item => (
                    <DeadlineRow key={item.id} item={item} onDismiss={dismiss} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function DeadlineRow({ item, onDismiss }: { item: DeadlineItem; onDismiss: (id: string) => void }) {
  return (
    <div className="flex items-center gap-2 group py-1">
      <Link
        href={item.href}
        className="flex-1 min-w-0 flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <Clock className="h-3 w-3 text-white/25 flex-shrink-0" />
        <span className="text-[11px] text-white/75 truncate">{item.title}</span>
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg border flex-shrink-0 ${urgencyColor(item.daysLeft)}`}>
          {urgencyLabel(item.daysLeft)}
        </span>
      </Link>
      <button
        onClick={() => onDismiss(item.id)}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-white/10 text-white/30 hover:text-white/60 transition-all flex-shrink-0"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
