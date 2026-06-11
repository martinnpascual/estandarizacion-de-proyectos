import type { Metadata } from "next";
import { getSongByShareToken } from "@/lib/actions/songs";
import SongSharePlayer from "./SongSharePlayer";

interface Props {
  params: { token: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await getSongByShareToken(params.token);
  if (!data) return { title: "Link inválido — Studio" };
  return {
    title: `${data.title} — ${data.artist_name}`,
    description: data.genre ? `${data.genre} · ${data.year}` : `${data.artist_name} · ${data.year}`,
    openGraph: {
      title: `${data.title} — ${data.artist_name}`,
      images: data.cover_art_url ? [{ url: data.cover_art_url }] : [],
    },
  };
}

export default async function SongSharePage({ params }: Props) {
  const { data: song, error } = await getSongByShareToken(params.token);

  if (!song || error) {
    return (
      <div className="min-h-svh bg-[#0a0a0f] flex items-center justify-center p-6">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-2xl">
            🔗
          </div>
          <h1 className="text-white font-bold text-lg mb-2">Link inválido</h1>
          <p className="text-white/40 text-sm">
            Este enlace no existe o fue revocado por el artista.
          </p>
        </div>
      </div>
    );
  }

  return <SongSharePlayer song={song} />;
}
