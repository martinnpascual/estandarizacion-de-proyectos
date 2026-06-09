"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Disc3,
  ArrowRight,
  HardDrive,
  Music,
  Sparkles,
  CheckCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "onboarding_done_v1";

export function useOnboarding() {
  if (typeof window === "undefined") return { done: true };
  return { done: !!localStorage.getItem(STORAGE_KEY) };
}

interface OnboardingModalProps {
  onClose: () => void;
}

const STEPS = [
  {
    id: "welcome",
    icon: Disc3,
    color: "from-violet-500/30 to-violet-700/20",
    iconColor: "text-violet-400",
    borderColor: "border-violet-500/25",
    title: "Bienvenido al Studio",
    description:
      "Tu plataforma de gestión musical. Llevá el control de tu discografía, maquetas, colaboraciones, finanzas y más, todo en un solo lugar.",
    cta: "Empezar",
  },
  {
    id: "profile",
    icon: Sparkles,
    color: "from-blue-500/30 to-blue-700/20",
    iconColor: "text-blue-400",
    borderColor: "border-blue-500/25",
    title: "Configurá tu perfil",
    description:
      "Agregá tu nombre artístico, foto y slug único para tu EPK público. Solo te lleva 1 minuto.",
    cta: "Ir al perfil",
    href: "/perfil",
  },
  {
    id: "drive",
    icon: HardDrive,
    color: "from-green-500/30 to-green-700/20",
    iconColor: "text-green-400",
    borderColor: "border-green-500/25",
    title: "Conectá Google Drive",
    description:
      "Subí audios y portadas directamente desde el Studio a tu Drive. Necesitás conectar tu cuenta de Google para habilitar las subidas.",
    cta: "Conectar Drive",
    href: "/perfil",
  },
  {
    id: "first",
    icon: Music,
    color: "from-pink-500/30 to-pink-700/20",
    iconColor: "text-pink-400",
    borderColor: "border-pink-500/25",
    title: "Agregá tu primera canción",
    description:
      "Empezá a construir tu discografía. Podés agregar canciones publicadas o maquetas en proceso.",
    cta: "Ir a Discografía",
    href: "/discografia",
  },
];

export default function OnboardingModal({ onClose }: OnboardingModalProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  function finish() {
    localStorage.setItem(STORAGE_KEY, "1");
    onClose();
  }

  function handleCta() {
    if (current.href) {
      finish();
      router.push(current.href);
      return;
    }
    if (isLast) {
      finish();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[hsl(var(--card))] border border-border/60 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === step
                    ? "w-5 h-1.5 bg-primary"
                    : i < step
                    ? "w-1.5 h-1.5 bg-primary/40"
                    : "w-1.5 h-1.5 bg-border"
                )}
              />
            ))}
          </div>
          <button
            onClick={finish}
            className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all active:scale-95"
            title="Saltar configuración"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8 text-center space-y-5">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Ambient glow behind icon */}
              <div className={cn("absolute inset-0 rounded-2xl blur-xl opacity-40 scale-150 pointer-events-none bg-gradient-to-br", current.color)} />
              <div
                className={cn(
                  "relative w-16 h-16 rounded-2xl bg-gradient-to-br border flex items-center justify-center shadow-[0_8px_32px_hsl(0_0%_0%/0.2)]",
                  current.color,
                  current.borderColor
                )}
              >
                <Icon className={cn("h-8 w-8 drop-shadow-[0_0_8px_currentColor]", current.iconColor)} />
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h2 className="text-lg font-black gradient-text">{current.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {current.description}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all active:scale-95"
            >
              Atrás
            </button>
          )}
          <button
            onClick={handleCta}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white transition-all active:scale-95 shadow-lg",
              isLast
                ? "bg-green-600 hover:bg-green-500 shadow-green-500/20"
                : "bg-violet-600 hover:bg-violet-500 shadow-violet-500/20"
            )}
          >
            {isLast ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {current.cta}
              </>
            ) : (
              <>
                {current.cta}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        {/* Skip all link */}
        {step === 0 && (
          <div className="pb-4 text-center">
            <button
              onClick={finish}
              className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              Saltar configuración inicial
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
