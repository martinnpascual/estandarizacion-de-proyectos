import type { Metadata } from "next";
import { getDraftByShareToken } from "@/lib/actions/drafts";
import SharePlayer from "./SharePlayer";

interface Props {
  params: { token: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await getDraftByShareToken(params.token);
  if (!data) return { title: "Link inválido — Studio" };
  return {
    title: `${data.title} — Studio`,
    description: data.producer ? `Producida por ${data.producer}` : "Maqueta compartida desde Studio",
    openGraph: {
      title: data.title,
      images: data.cover_art_url ? [{ url: data.cover_art_url }] : [],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { data: draft, error } = await getDraftByShareToken(params.token);

  if (!draft || error) {
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

  return <SharePlayer draft={draft} />;
}
