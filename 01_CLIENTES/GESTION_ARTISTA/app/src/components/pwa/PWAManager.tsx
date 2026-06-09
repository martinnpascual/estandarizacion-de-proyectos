"use client";

/**
 * PWAManager — Registra el Service Worker y muestra un banner de instalación
 * cuando el browser dispara `beforeinstallprompt`.
 * Se monta desde el RootLayout (una sola vez, fuera del árbol protegido).
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, WifiOff } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAManager() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineVisible, setOfflineVisible] = useState(false);

  // ─── Service Worker registration ────────────────────────────────────────────
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {/* silently fail in dev */});
    }
  }, []);

  // ─── Install prompt ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Only show if user hasn't dismissed before
      if (!localStorage.getItem("pwa_install_dismissed")) {
        // Show after 3s to not be intrusive on first load
        setTimeout(() => setShowBanner(true), 3000);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // ─── Offline detector ────────────────────────────────────────────────────────
  useEffect(() => {
    function onOffline() {
      setIsOffline(true);
      setOfflineVisible(true);
    }
    function onOnline() {
      setIsOffline(false);
      // Show "back online" briefly then hide
      setTimeout(() => setOfflineVisible(false), 3000);
    }

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
      setInstallPrompt(null);
    }
  }

  function handleDismiss() {
    setShowBanner(false);
    localStorage.setItem("pwa_install_dismissed", "1");
  }

  return (
    <>
      {/* ─── Install banner ─── */}
      <AnimatePresence>
        {showBanner && installPrompt && (
          <motion.div
            key="pwa-install"
            initial={{ opacity: 0, y: 80, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 80, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-max max-w-[calc(100vw-2rem)]"
          >
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
              style={{
                background: "rgba(10,10,20,0.97)",
                border: "1px solid rgba(255,255,255,0.10)",
                backdropFilter: "blur(24px)",
              }}
            >
              <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                <Download className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white/90 leading-none">Instalar Studio</p>
                <p className="text-[11px] text-white/45 mt-0.5">Acceso rápido + modo offline</p>
              </div>
              <button
                onClick={handleInstall}
                className="flex-shrink-0 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all"
              >
                Instalar
              </button>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/8 transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Offline / Online toast ─── */}
      <AnimatePresence>
        {offlineVisible && (
          <motion.div
            key="offline-toast"
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[200]"
          >
            <div
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl text-sm font-semibold ${
                isOffline
                  ? "bg-red-950/95 border border-red-500/30 text-red-300"
                  : "bg-emerald-950/95 border border-emerald-500/30 text-emerald-300"
              }`}
              style={{ backdropFilter: "blur(16px)" }}
            >
              {isOffline ? (
                <>
                  <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
                  Sin conexión — usando caché
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  Conexión restaurada
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
