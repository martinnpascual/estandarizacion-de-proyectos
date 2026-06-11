"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";

// Mapa de sección → color HSL (h s% l%) para el degradado ambiente del body
// Paleta alineada al primario violeta (262°): blues, índigos, magentas, rosas, teales
const SECTION_HSL: Record<string, string> = {
  "/discografia":      "262 80% 62%",  // violeta — primario
  "/maquetas":         "220 80% 62%",  // azul
  "/dashboard":        "248 78% 65%",  // azul-violeta
  "/setlists":         "286 72% 62%",  // púrpura suave
  "/collabs":          "306 70% 60%",  // fucsia
  "/proyectos":        "192 75% 50%",  // cian
  "/calendario":       "205 80% 58%",  // cielo
  "/estadisticas":     "178 70% 45%",  // teal
  "/ingresos":         "155 65% 48%",  // verde esmeralda
  "/gastos":           "348 72% 58%",  // rosa-rojo
  "/metas":            "330 78% 60%",  // rosa
  "/redes":            "252 82% 65%",  // índigo
  "/equipo":           "312 70% 58%",  // magenta cálido
  "/analizar":         "278 80% 65%",  // violeta eléctrico
  "/perfil":           "262 80% 62%",  // mismo que primario
  "/notificaciones":   "25 90% 58%",   // naranja — alertas
  "/papelera":         "210 15% 52%",  // gris neutro — trash
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
import OnboardingModal from "@/components/layout/OnboardingModal";
import ContextualFAB from "@/components/layout/ContextualFAB";
import DeadlineAlerts from "@/components/layout/DeadlineAlerts";

/** Componente interno que puede leer el contexto del player para ajustar el padding y el FAB */
function LayoutContent({ children, pathname }: { children: React.ReactNode; pathname: string }) {
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
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 p-4 md:p-6 lg:p-8"
        >
          {children}
        </motion.div>
      </AnimatePresence>
      {/* ── FAB contextual ────────────────────────────────────────────── */}
      <ContextualFAB playerActive={!!currentTrack} />
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
  const [showOnboarding, setShowOnboarding] = useState(false);

  // MED-04: Verificar auth client-side como respaldo del middleware
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/login");
      } else {
        setIsChecking(false);
        // Show onboarding for new users (localStorage flag)
        if (!localStorage.getItem("onboarding_done_v1")) {
          setShowOnboarding(true);
        }
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
            {/* ── Logo fantasma — top-left (igual que login) ── */}
            <div
              className="fixed pointer-events-none select-none z-0 opacity-[0.038]"
              style={{ top: "-140px", left: "calc(256px - 160px)", width: "540px", height: "540px", transform: "rotate(-22deg)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="w-full h-full object-contain" style={{ mixBlendMode: "screen", filter: "blur(1.5px)" }} />
            </div>
            {/* ── Logo fantasma — bottom-right (igual que login) ── */}
            <div
              className="fixed pointer-events-none select-none z-0 opacity-[0.030]"
              style={{ bottom: "-120px", right: "-120px", width: "460px", height: "460px", transform: "rotate(18deg)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="w-full h-full object-contain" style={{ mixBlendMode: "screen", filter: "blur(1px)" }} />
            </div>
            {/* ── Waveform bars decorativas — bottom-left (igual que login) ── */}
            <div className="fixed bottom-8 left-72 flex items-end gap-1 pointer-events-none select-none z-0" style={{ opacity: 0.04 }}>
              {[18, 32, 24, 40, 28, 36, 20, 44, 30, 22, 38, 26].map((h, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-primary animate-pulse"
                  style={{ height: h, animationDelay: `${i * 0.15}s`, animationDuration: "1.8s" }}
                />
              ))}
            </div>
            {/* ── Waveform bars — top-right ── */}
            <div className="fixed top-6 right-6 flex items-end gap-1 pointer-events-none select-none z-0 rotate-180" style={{ opacity: 0.04 }}>
              {[22, 36, 18, 44, 30, 26, 40, 20, 34, 28, 42, 16].map((h, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-violet-400 animate-pulse"
                  style={{ height: h, animationDelay: `${i * 0.12}s`, animationDuration: "2.2s" }}
                />
              ))}
            </div>
            <NavProgressBar />
            <Sidebar />
            <LayoutContent pathname={pathname}>{children}</LayoutContent>
            <AudioPlayer />
            {/* ── Alertas de deadline próximas ──────────────────────── */}
            <DeadlineAlerts />
          </div>
          {showOnboarding && (
            <OnboardingModal onClose={() => setShowOnboarding(false)} />
          )}
        </AudioPlayerProvider>
      </CommandMenuProvider>
    </ToastProvider>
  );
}
