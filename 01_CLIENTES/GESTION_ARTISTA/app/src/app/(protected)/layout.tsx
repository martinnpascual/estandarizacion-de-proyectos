"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

// Mapa de sección → color HSL (h s% l%) para el degradado ambiente del body
// Paleta alineada al primario violeta (262°): blues, índigos, magentas, rosas, teales
const SECTION_HSL: Record<string, string> = {
  "/discografia":  "262 80% 62%",  // violeta — primario
  "/maquetas":     "220 80% 62%",  // azul
  "/dashboard":    "248 78% 65%",  // azul-violeta
  "/setlists":     "286 72% 62%",  // púrpura suave
  "/collabs":      "306 70% 60%",  // fucsia
  "/proyectos":    "192 75% 50%",  // cian
  "/calendario":   "205 80% 58%",  // cielo
  "/estadisticas": "178 70% 45%",  // teal
  "/ingresos":     "155 65% 48%",  // verde esmeralda
  "/gastos":       "348 72% 58%",  // rosa-rojo
  "/metas":        "330 78% 60%",  // rosa
  "/redes":        "252 82% 65%",  // índigo
  "/equipo":       "312 70% 58%",  // magenta cálido
  "/analizar":     "278 80% 65%",  // violeta eléctrico
  "/perfil":       "262 80% 62%",  // mismo que primario
};

function getSectionHsl(pathname: string): string {
  const key = Object.keys(SECTION_HSL).find((k) => pathname.startsWith(k));
  return key ? SECTION_HSL[key] : "262 80% 62%";
}
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/layout/Sidebar";
import AudioPlayer, {
  AudioPlayerProvider,
  useAudioPlayerContext,
} from "@/components/audio/AudioPlayer";
import { CommandMenuProvider } from "@/components/search/CommandMenu";
import { ToastProvider } from "@/components/ui/ToastProvider";
import NavProgressBar from "@/components/ui/NavProgressBar";

/** Componente interno que puede leer el contexto del player para ajustar el padding */
function LayoutContent({ children }: { children: React.ReactNode }) {
  const { currentTrack } = useAudioPlayerContext();
  return (
    <main
      className={
        currentTrack
          ? "relative flex-1 md:ml-0 pb-40 md:pb-24 pt-14 md:pt-0 transition-[padding] duration-300"
          : "relative flex-1 md:ml-0 pb-20 md:pb-6 pt-14 md:pt-0 transition-[padding] duration-300"
      }
    >
      {/* ── Spotify-style: section color floods from top ─────────────── */}
      <div
        className="fixed top-0 left-0 md:left-64 right-0 pointer-events-none"
        style={{
          height: "55vh",
          zIndex: 0,
          background: "linear-gradient(180deg, hsl(var(--section-hsl, 262 80% 62%) / 0.35) 0%, hsl(var(--section-hsl, 262 80% 62%) / 0.10) 45%, transparent 100%)",
        }}
      />
      {/* ── Second layer: deep color bloom top-left ──────────────────── */}
      <div
        className="fixed top-0 left-0 md:left-64 pointer-events-none"
        style={{
          width: "50%",
          height: "35vh",
          zIndex: 0,
          background: "radial-gradient(ellipse 80% 100% at 0% 0%, hsl(var(--section-hsl, 262 80% 62%) / 0.18) 0%, transparent 70%)",
        }}
      />
      {/* ── Decorative rings — top-right corner ──────────────────────── */}
      <div
        className="fixed top-0 right-0 pointer-events-none"
        style={{ zIndex: 0, width: 320, height: 320 }}
        aria-hidden
      >
        {/* Outer ring */}
        <div style={{
          position: "absolute",
          top: -80, right: -80,
          width: 320, height: 320,
          borderRadius: "50%",
          border: "1.5px solid hsl(var(--section-hsl, 262 80% 62%) / 0.14)",
        }} />
        {/* Middle ring */}
        <div style={{
          position: "absolute",
          top: -40, right: -40,
          width: 220, height: 220,
          borderRadius: "50%",
          border: "1px solid hsl(var(--section-hsl, 262 80% 62%) / 0.09)",
          background: "radial-gradient(circle, hsl(var(--section-hsl, 262 80% 62%) / 0.03) 0%, transparent 70%)",
        }} />
        {/* Inner dot */}
        <div style={{
          position: "absolute",
          top: 10, right: 10,
          width: 100, height: 100,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(var(--section-hsl, 262 80% 62%) / 0.07) 0%, transparent 70%)",
        }} />
      </div>
      <div className="relative z-10 p-4 md:p-6 lg:p-8 page-enter">{children}</div>
    </main>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  // MED-04: Verificar auth client-side como respaldo del middleware
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/login");
      } else {
        setIsChecking(false);
      }
    });
  }, [router]);

  // Actualiza el CSS variable --section-hsl para el degradado ambiente del body
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--section-hsl",
      getSectionHsl(pathname)
    );
  }, [pathname]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <CommandMenuProvider>
        <AudioPlayerProvider>
          <div className="flex min-h-screen">
            <NavProgressBar />
            <Sidebar />
            <LayoutContent>{children}</LayoutContent>
            <AudioPlayer />
          </div>
        </AudioPlayerProvider>
      </CommandMenuProvider>
    </ToastProvider>
  );
}
