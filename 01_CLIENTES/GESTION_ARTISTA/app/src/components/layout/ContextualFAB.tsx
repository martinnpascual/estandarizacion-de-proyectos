"use client";

/**
 * ContextualFAB — Floating Action Button que cambia según la ruta actual.
 * Navega a `?new=1` en la página correspondiente para abrir el formulario de creación.
 */

import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Disc3, FileAudio, Users, FolderOpen, Calendar,
  DollarSign, Receipt, Target, Share2, UserCog, ListMusic, Plus,
} from "lucide-react";

interface FABEntry {
  label: string;
  icon: React.ElementType;
  href: string;
}

const FAB_CONFIG: Record<string, FABEntry> = {
  "/discografia":  { label: "Nueva canción",  icon: Disc3,      href: "/discografia?new=1"  },
  "/maquetas":     { label: "Nueva maqueta",  icon: FileAudio,  href: "/maquetas?new=1"     },
  "/setlists":     { label: "Nuevo setlist",  icon: ListMusic,  href: "/setlists?new=1"     },
  "/collabs":      { label: "Nuevo featurin", icon: Users,      href: "/collabs?new=1"      },
  "/proyectos":    { label: "Nuevo proyecto", icon: FolderOpen, href: "/proyectos?new=1"    },
  "/calendario":   { label: "Nuevo evento",   icon: Calendar,   href: "/calendario?new=1"   },
  "/ingresos":     { label: "Nuevo ingreso",  icon: DollarSign, href: "/ingresos?new=1"     },
  "/gastos":       { label: "Nuevo gasto",    icon: Receipt,    href: "/gastos?new=1"       },
  "/metas":        { label: "Nueva meta",     icon: Target,     href: "/metas?new=1"        },
  "/equipo":       { label: "Nuevo miembro",  icon: UserCog,    href: "/equipo?new=1"       },
  "/redes":        { label: "Agregar red",    icon: Share2,     href: "/redes?new=1"        },
};

// Páginas donde el FAB NO debe aparecer
const FAB_HIDDEN = [
  "/dashboard", "/estadisticas", "/analizar",
  "/perfil", "/notificaciones", "/papelera", "/buscar",
];

export default function ContextualFAB({ playerActive }: { playerActive: boolean }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [hovered, setHovered] = useState(false);

  const entry = Object.entries(FAB_CONFIG).find(([key]) => pathname.startsWith(key))?.[1];
  const hidden = FAB_HIDDEN.some(h => pathname.startsWith(h));

  if (!entry || hidden) return null;

  const Icon = entry.icon;
  // Sube el FAB por encima del player cuando hay canción activa
  const bottomClass = playerActive ? "bottom-[7.5rem]" : "bottom-[5.5rem]";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        className={`fixed right-5 z-40 flex items-center gap-3 ${bottomClass} md:right-7`}
        initial={{ scale: 0, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0, opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.12 }}
      >
        {/* Tooltip label — aparece al hacer hover */}
        <AnimatePresence>
          {hovered && (
            <motion.span
              initial={{ opacity: 0, x: 12, scale: 0.88 }}
              animate={{ opacity: 1, x: 0,  scale: 1 }}
              exit={{   opacity: 0, x: 12, scale: 0.88 }}
              transition={{ duration: 0.16 }}
              className="px-3 py-1.5 rounded-xl text-sm font-black text-white whitespace-nowrap pointer-events-none select-none"
              style={{
                background:    "rgba(6,6,14,0.94)",
                border:        "1px solid hsl(var(--section-hsl, 262 80% 62%) / 0.32)",
                backdropFilter:"blur(14px)",
                boxShadow:     "0 4px 24px rgba(0,0,0,0.5)",
              }}
            >
              {entry.label}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Botón principal */}
        <motion.button
          whileHover={{ scale: 1.10 }}
          whileTap={{  scale: 0.90 }}
          onHoverStart={() => setHovered(true)}
          onHoverEnd={()   => setHovered(false)}
          onClick={() => router.push(entry.href)}
          aria-label={entry.label}
          className="relative w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl"
          style={{
            background:  "linear-gradient(135deg, hsl(var(--section-hsl, 262 80% 62%)), hsl(var(--section-hsl, 262 80% 62%) / 0.72))",
            boxShadow:   "0 8px 36px hsl(var(--section-hsl, 262 80% 62%) / 0.42), 0 2px 10px rgba(0,0,0,0.55)",
          }}
        >
          {/* Shimmer animado */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.22) 50%, transparent 75%)",
              backgroundSize: "200% 100%",
            }}
            animate={{ backgroundPosition: ["200% 0%", "-200% 0%"] }}
            transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 2.5, ease: "linear" }}
          />

          {/* Ícono: + en reposo, ícono de sección en hover */}
          <div className="relative z-10 w-6 h-6">
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ opacity: hovered ? 0 : 1, rotate: hovered ? 45 : 0, scale: hovered ? 0.7 : 1 }}
              transition={{ duration: 0.18 }}
            >
              <Plus className="h-6 w-6 text-white" />
            </motion.div>
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.7 }}
              transition={{ duration: 0.18 }}
            >
              <Icon className="h-5 w-5 text-white" />
            </motion.div>
          </div>
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
