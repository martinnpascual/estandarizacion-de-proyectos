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

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app-eight-mu-77.vercel.app";
  const ogImageUrl =
    `${baseUrl}/api/og?` +
    `name=${encodeURIComponent(data.profile.full_name)}&` +
    `songs=${data.songs.length}` +
    (data.profile.bio ? `&bio=${encodeURIComponent(data.profile.bio)}` : "");

  return {
    title: `${data.profile.full_name} — EPK`,
    description: data.profile.bio ?? `${data.songs.length} canciones publicadas`,
    openGraph: {
      title: data.profile.full_name,
      description: data.profile.bio ?? `${data.songs.length} canciones publicadas`,
      images: [
        { url: ogImageUrl, width: 1200, height: 630, alt: `${data.profile.full_name} EPK` },
        ...(data.profile.avatar_url ? [{ url: data.profile.avatar_url }] : []),
      ],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `${data.profile.full_name} — EPK`,
      description: data.profile.bio ?? `${data.songs.length} canciones publicadas`,
      images: [ogImageUrl],
    },
  };
}

export default async function PublicEPKPage({ params }: PageProps) {
  const { data } = await getPublicArtistBySlug(params.slug);
  if (!data) notFound();
  return <PublicEPKClient data={data} />;
}
