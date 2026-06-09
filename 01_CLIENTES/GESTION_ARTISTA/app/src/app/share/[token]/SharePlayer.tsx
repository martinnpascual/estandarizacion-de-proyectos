"use client";

/**
 * SharePlayer — Página pública de escucha por token.
 * Sin autenticación, solo audio + info de la maqueta.
 */

import { useState } from "react";
import Image from "next/image";
import WaveformPlayer from "@/components/audio/WaveformPlayer";
import type { Draft } from "@/types/database";

const STATUS_LABELS: Record<string, string> = {
  borrador:            "Borrador",
  en_mezcla:          "En mezcla",
  masterizada:        "Masterizada",
  lista_para_publicar: "Lista para publicar",
};

const STATUS_COLORS: Record<string, string> = {
  borrador:            "bg-zinc-500/20 text-zinc-400 border-zinc-500/25",
  en_mezcla:          "bg-blue-500/20 text-blue-400 border-blue-500/25",
  masterizada:        "bg-purple-500/20 text-purple-400 border-purple-500/25",
  lista_para_publicar: "bg-green-500/20 text-green-400 border-green-500/25",
};

interface Props {
  draft: Draft;
}

export default function SharePlayer({ draft }: Props) {
  const hasAudio = !!(draft.drive_file_id || draft.drive_file_url);
  const audioUrl = draft.drive_file_id
    ? `/api/drive/stream/${draft.drive_file_id}`
    : draft.drive_file_url ?? "";

  return (
    <div className="min-h-svh bg-[#0a0a0f] flex items-center justify-center p-4">
      {/* Subtle radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: "rgba(18,18,28,0.96)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          }}
        >
          {/* Cover art */}
          <div className="relative aspect-square w-full bg-[#111118]">
            {draft.cover_art_url ? (
              <Image
                src={draft.cover_art_url}
                alt={draft.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-6xl opacity-20">🎵</div>
              </div>
            )}
            {/* Gradient overlay at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#12121c] to-transparent" />
          </div>

          {/* Info */}
          <div className="px-5 pt-4 pb-5 space-y-3">
            {/* Title + status */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-white font-black text-xl leading-tight truncate">
                  {draft.title}
                </h1>
                {draft.producer && (
                  <p className="text-white/45 text-sm mt-0.5 truncate">
                    Prod. {draft.producer}
                  </p>
                )}
              </div>
              <span
                className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-xl border ${
                  STATUS_COLORS[draft.status] ?? STATUS_COLORS.borrador
                }`}
              >
                {STATUS_LABELS[draft.status] ?? draft.status}
              </span>
            </div>

            {/* BPM / Key pills */}
            {(draft.bpm || draft.key_signature) && (
              <div className="flex items-center gap-2">
                {draft.bpm && (
                  <span className="text-[11px] text-white/40 bg-white/6 border border-white/8 px-2 py-0.5 rounded-lg">
                    {draft.bpm} BPM
                  </span>
                )}
                {draft.key_signature && (
                  <span className="text-[11px] text-white/40 bg-white/6 border border-white/8 px-2 py-0.5 rounded-lg">
                    {draft.key_signature}
                  </span>
                )}
              </div>
            )}

            {/* Waveform player */}
            {hasAudio && (
              <div className="pt-1">
                <WaveformPlayer
                  url={audioUrl}
                  waveColor="rgba(124,58,237,0.30)"
                  progressColor="rgba(124,58,237,0.85)"
                  height={56}
                />
              </div>
            )}

            {!hasAudio && (
              <p className="text-white/25 text-xs text-center py-3">
                Sin audio adjunto
              </p>
            )}
          </div>
        </div>

        {/* Footer branding */}
        <p className="text-center text-white/20 text-[11px] mt-4">
          Compartido desde{" "}
          <span className="text-white/35 font-semibold">Studio</span>
        </p>
      </div>
    </div>
  );
}
