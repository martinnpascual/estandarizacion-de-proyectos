import { notFound } from "next/navigation";
import { getPublicArtistBySlug } from "@/lib/actions/public";
import PublicEPKClient from "./PublicEPKClient";
import type { Metadata } from "next";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { data } = await getPublicArtistBySlug(params.slug);
  if (!data) return { title: "Artista no encontrado" };
  return {
    title: `${data.profile.full_name} — EPK`,
    description: data.profile.bio ?? `${data.songs.length} canciones publicadas`,
    openGraph: {
      title: data.profile.full_name,
      images: data.profile.avatar_url ? [data.profile.avatar_url] : [],
    },
  };
}

export default async function PublicEPKPage({ params }: PageProps) {
  const { data } = await getPublicArtistBySlug(params.slug);
  if (!data) notFound();
  return <PublicEPKClient data={data} />;
}
