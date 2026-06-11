"use client";

import { useState } from "react";
import Image from "next/image";
import WaveformPlayer from "@/components/audio/WaveformPlayer";
import type { Song } from "@/types/database";

const PLATFORM_LINKS = [
  { key: "spotify_url",      label: "Spotify",     color: "#1db954" },
  { key: "youtube_url",      label: "YouTube",     color: "#ff0000" },
  { key: "apple_music_url",  label: "Apple Music", color: "#fa243c" },
  { key: "soundcloud_url",   label: "SoundCloud",  color: "#ff5500" },
] as const;

interface Props {
  song: Song;
}

export default function SongSharePlayer({ song }: Props) {
  const hasAudio = !!(song.drive_file_id || song.drive_file_url || song.audio_url);
  const audioUrl = song.drive_file_id
    ? `/api/drive/stream/${song.drive_file_id}`
    : song.audio_url ?? song.drive_file_url ?? "";

  const platformLinks = PLATFORM_LINKS
    .map((p) => ({ ...p, url: song[p.key] }))
    .filter((p) => p.url);

  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-svh bg-[#0a0a0f] flex items-center justify-center p-4">
      {/* Radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-sm">
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
            {song.cover_art_url ? (
              <Image
                src={song.cover_art_url}
                alt={song.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-6xl opacity-20">🎵</div>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#12121c] to-transparent" />
          </div>

          {/* Info */}
          <div className="px-5 pt-4 pb-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-white font-black text-xl leading-tight truncate">
                  {song.title}
                </h1>
                <p className="text-white/45 text-sm mt-0.5 truncate">
                  {song.artist_name}
                  {song.featuring.length > 0 && ` ft. ${song.featuring.join(", ")}`}
                </p>
              </div>
              <span className="flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-xl border bg-white/6 text-white/40 border-white/10">
                {song.year}
              </span>
            </div>

            {/* BPM / Key / Genre */}
            {(song.bpm || song.key_signature || song.genre) && (
              <div className="flex items-center gap-2 flex-wrap">
                {song.genre && (
                  <span className="text-[11px] text-white/40 bg-white/6 border border-white/8 px-2 py-0.5 rounded-lg">
                    {song.genre}
                  </span>
                )}
                {song.bpm && (
                  <span className="text-[11px] text-white/40 bg-white/6 border border-white/8 px-2 py-0.5 rounded-lg">
                    {song.bpm} BPM
                  </span>
                )}
                {song.key_signature && (
                  <span className="text-[11px] text-white/40 bg-white/6 border border-white/8 px-2 py-0.5 rounded-lg">
                    {song.key_signature}
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
              <p className="text-white/25 text-xs text-center py-3">Sin audio adjunto</p>
            )}

            {/* Platform links */}
            {platformLinks.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {platformLinks.map(({ key, label, color, url }) => (
                  <a
                    key={key}
                    href={url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-xl border transition-all hover:opacity-80 active:scale-95"
                    style={{
                      color,
                      borderColor: `${color}40`,
                      background: `${color}18`,
                    }}
                  >
                    {label}
                  </a>
                ))}
              </div>
            )}

            {/* Copy link */}
            <button
              onClick={handleCopy}
              className="w-full mt-1 py-2 rounded-xl text-[12px] font-semibold border transition-all active:scale-95"
              style={{
                background: copied ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.04)",
                border: copied ? "1px solid rgba(74,222,128,0.3)" : "1px solid rgba(255,255,255,0.08)",
                color: copied ? "rgb(74,222,128)" : "rgba(255,255,255,0.4)",
              }}
            >
              {copied ? "¡Enlace copiado!" : "Copiar enlace"}
            </button>
          </div>
        </div>

        <p className="text-center text-white/20 text-[11px] mt-4">
          Compartido desde{" "}
          <span className="text-white/35 font-semibold">Studio</span>
        </p>
      </div>
    </div>
  );
}
