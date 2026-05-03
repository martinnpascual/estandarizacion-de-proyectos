"use server";

/**
 * public.ts — Acciones de datos públicos (sin autenticación requerida)
 * Usadas por las páginas EPK (/p/[slug]) y Smart Link (/link/[slug])
 */

import { createClient } from "@supabase/supabase-js";
import type { Song, Profile, SocialLink } from "@/types/database";

// Cliente anónimo sin cookies de sesión — seguro para rutas públicas
function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export interface PublicArtistData {
  profile: Pick<Profile, "id" | "full_name" | "avatar_url" | "bio" | "artist_slug">;
  songs: Song[];
  socialLinks: SocialLink[];
}

/** Obtiene el perfil público y canciones públicas por slug del artista */
export async function getPublicArtistBySlug(
  slug: string
): Promise<{ data: PublicArtistData | null; error: string | null }> {
  const supabase = createPublicClient();

  // 1. Buscar perfil por slug
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, bio, artist_slug")
    .eq("artist_slug", slug)
    .eq("is_deleted", false)
    .single();

  if (profileError || !profile) {
    return { data: null, error: "Artista no encontrado" };
  }

  // 2. Obtener canciones públicas del artista
  const { data: songs } = await supabase
    .from("songs")
    .select("*")
    .eq("created_by", profile.id)
    .eq("is_deleted", false)
    .eq("is_public", true)
    .order("year", { ascending: false })
    .order("title", { ascending: true });

  // 3. Obtener redes sociales
  const { data: socialLinks } = await supabase
    .from("social_links")
    .select("*")
    .eq("is_deleted", false);

  return {
    data: {
      profile: profile as Pick<Profile, "id" | "full_name" | "avatar_url" | "bio" | "artist_slug">,
      songs: (songs ?? []) as Song[],
      socialLinks: (socialLinks ?? []) as SocialLink[],
    },
    error: null,
  };
}

/** Obtiene una sola canción pública por id */
export async function getPublicSongById(
  id: string
): Promise<{ data: Song | null; error: string | null }> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("id", id)
    .eq("is_deleted", false)
    .eq("is_public", true)
    .single();

  if (error || !data) return { data: null, error: "Canción no encontrada" };
  return { data: data as Song, error: null };
}
