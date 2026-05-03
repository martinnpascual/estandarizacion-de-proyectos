"use client";

import { useState } from "react";
import {
  Music, ExternalLink, Clock, Play, Pause,
  Globe, Instagram, Youtube, Twitter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";
import type { PublicArtistData } from "@/lib/actions/public";
import type { Song } from "@/types/database";

interface Props {
  data: PublicArtistData;
}

const PLATFORM_COLORS: Record<string, string> = {
  spotify_url:     "#1db954",
  youtube_url:     "#ef4444",
  apple_music_url: "#fa243c",
  soundcloud_url:  "#f97316",
};

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-5 w-5" />,
  youtube:   <Youtube className="h-5 w-5" />,
  twitter:   <Twitter className="h-5 w-5" />,
  spotify:   <Music className="h-5 w-5" />,
  soundcloud:<Music className="h-5 w-5" />,
  tiktok:    <Music className="h-5 w-5" />,
};

function SongCard({ song }: { song: Song }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useState<HTMLAudioElement | null>(null)[0];
  const audioUrl = song.drive_file_id ? `/api/drive/stream/${song.drive_file_id}` : song.drive_file_url;
  const platforms = [
    { key: "spotify_url", label: "Spotify" },
    { key: "youtube_url", label: "YouTube" },
    { key: "apple_music_url", label: "Apple Music" },
    { key: "soundcloud_url", label: "SoundCloud" },
  ].filter(p => !!song[p.key as keyof Song]);

  return (
    <div className="group flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200">
      {/* Cover */}
      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
        {song.cover_art_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={song.cover_art_url} alt={song.title} className="w-full h-full object-cover" />
        ) : (
          <Music className="h-6 w-6 text-white/30" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">{song.title}</p>
        <p className="text-sm text-white/60 truncate">
          {song.year}
          {song.genre ? ` · ${song.genre}` : ""}
          {song.duration_seconds ? ` · ${formatTime(song.duration_seconds)}` : ""}
        </p>
        {/* Platform links */}
        {platforms.length > 0 && (
          <div className="flex gap-2 mt-1.5">
            {platforms.map(p => (
              <a
                key={p.key}
                href={song[p.key as keyof Song] as string}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] px-2 py-0.5 rounded-full font-medium hover:opacity-80 transition-opacity"
                style={{ background: PLATFORM_COLORS[p.key] ?? "#666", color: "#fff" }}
              >
                {p.label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Play button */}
      {audioUrl && (
        <button
          onClick={() => {
            // Simple local audio toggle (no global player on public pages)
            const audio = document.getElementById(`epk-audio-${song.id}`) as HTMLAudioElement;
            if (!audio) return;
            if (playing) { audio.pause(); setPlaying(false); }
            else { audio.play(); setPlaying(true); }
          }}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-primary flex items-center justify-center transition-colors flex-shrink-0"
        >
          {playing ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white ml-0.5" />}
        </button>
      )}
      {audioUrl && (
        <audio
          id={`epk-audio-${song.id}`}
          src={audioUrl}
          onEnded={() => setPlaying(false)}
          className="hidden"
        />
      )}
    </div>
  );
}

export default function PublicEPKClient({ data }: Props) {
  const { profile, songs, socialLinks } = data;
  const [filter, setFilter] = useState<string | null>(null);

  const genres = Array.from(new Set(songs.map(s => s.genre).filter(Boolean))) as string[];
  const filteredSongs = filter ? songs.filter(s => s.genre === filter) : songs;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white">
      {/* Hero */}
      <div className="relative overflow-hidden">
        {/* Background blur from avatar */}
        {profile.avatar_url && (
          <div
            className="absolute inset-0 opacity-20 blur-3xl scale-110"
            style={{ backgroundImage: `url(${profile.avatar_url})`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
        )}
        <div className="relative z-10 flex flex-col items-center pt-20 pb-12 px-6 text-center">
          {/* Avatar */}
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl mb-4 bg-white/10 flex items-center justify-center">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
            ) : (
              <Music className="h-12 w-12 text-white/30" />
            )}
          </div>
          <h1 className="text-4xl font-bold tracking-tight">{profile.full_name}</h1>
          {profile.bio && (
            <p className="mt-3 text-white/70 max-w-md leading-relaxed">{profile.bio}</p>
          )}
          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 text-white/50 text-sm">
            <span><strong className="text-white">{songs.length}</strong> canciones</span>
            {songs.some(s => s.spotify_url) && (
              <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> En plataformas</span>
            )}
          </div>
          {/* Social links */}
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-3 mt-5">
              {socialLinks.map(s => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  title={s.platform}
                >
                  {SOCIAL_ICONS[s.platform] ?? <ExternalLink className="h-4 w-4" />}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Catalog */}
      <div className="max-w-2xl mx-auto px-4 pb-20 space-y-6">
        {/* Genre filter */}
        {genres.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter(null)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                !filter ? "bg-white text-black" : "bg-white/10 text-white/70 hover:bg-white/20"
              )}
            >
              Todo
            </button>
            {genres.map(g => (
              <button
                key={g}
                onClick={() => setFilter(g === filter ? null : g)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  filter === g ? "bg-white text-black" : "bg-white/10 text-white/70 hover:bg-white/20"
                )}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {filteredSongs.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-white/30 gap-3">
            <Music className="h-12 w-12" />
            <p>Sin canciones públicas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSongs.map(song => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-white/20 text-xs pt-6">
          Powered by Estudio Digital
        </p>
      </div>
    </div>
  );
}
