import { notFound } from "next/navigation";
import { getPublicArtistBySlug } from "@/lib/actions/public";
import SmartLinkClient from "./SmartLinkClient";
import type { Metadata } from "next";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { data } = await getPublicArtistBySlug(params.slug);
  if (!data) return { title: "Artista no encontrado" };
  return {
    title: `${data.profile.full_name} — Links`,
    description: data.profile.bio ?? `Música y redes de ${data.profile.full_name}`,
    openGraph: {
      title: `${data.profile.full_name} — Links`,
      images: data.profile.avatar_url ? [data.profile.avatar_url] : [],
    },
  };
}

export default async function SmartLinkPage({ params }: PageProps) {
  const { data } = await getPublicArtistBySlug(params.slug);
  if (!data) notFound();
  return <SmartLinkClient data={data} />;
}
