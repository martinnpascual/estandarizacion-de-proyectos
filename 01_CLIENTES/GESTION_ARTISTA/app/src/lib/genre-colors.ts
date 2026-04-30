export const GENRE_COLOR_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  "Trap":       { bg: "bg-orange-500/15", text: "text-orange-400", dot: "bg-orange-400" },
  "Reggaeton":  { bg: "bg-green-500/15",  text: "text-green-400",  dot: "bg-green-400"  },
  "Hip Hop":    { bg: "bg-yellow-500/15", text: "text-yellow-400", dot: "bg-yellow-400" },
  "R&B":        { bg: "bg-pink-500/15",   text: "text-pink-400",   dot: "bg-pink-400"   },
  "Pop":        { bg: "bg-cyan-500/15",   text: "text-cyan-400",   dot: "bg-cyan-400"   },
  "Drill":      { bg: "bg-red-500/15",    text: "text-red-400",    dot: "bg-red-400"    },
  "Dancehall":  { bg: "bg-purple-500/15", text: "text-purple-400", dot: "bg-purple-400" },
  "Afrobeats":  { bg: "bg-amber-500/15",  text: "text-amber-400",  dot: "bg-amber-400"  },
  "Otro":       { bg: "bg-zinc-500/15",   text: "text-zinc-400",   dot: "bg-zinc-400"   },
};

export function getGenreColors(genre: string | null) {
  if (!genre) return null;
  return GENRE_COLOR_MAP[genre] ?? { bg: "bg-zinc-500/15", text: "text-zinc-400", dot: "bg-zinc-400" };
}
