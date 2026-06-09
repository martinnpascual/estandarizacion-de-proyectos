import type { MetadataRoute } from "next";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app-eight-mu-77.vercel.app";

  // Static public pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/auth/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Dynamic: public EPK and SmartLink pages per artist slug
  try {
    const supabase = createAdminSupabaseClient();
    const { data: profiles } = await supabase
      .from("profiles")
      .select("artist_slug, updated_at")
      .not("artist_slug", "is", null)
      .eq("is_deleted", false);

    const dynamicRoutes: MetadataRoute.Sitemap = (profiles ?? []).flatMap((p) => {
      if (!p.artist_slug) return [];
      return [
        {
          url: `${baseUrl}/p/${p.artist_slug}`,
          lastModified: new Date(p.updated_at),
          changeFrequency: "weekly" as const,
          priority: 0.9,
        },
        {
          url: `${baseUrl}/link/${p.artist_slug}`,
          lastModified: new Date(p.updated_at),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        },
      ];
    });

    return [...staticRoutes, ...dynamicRoutes];
  } catch {
    return staticRoutes;
  }
}
