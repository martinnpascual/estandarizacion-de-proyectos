import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app-eight-mu-77.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/p/", "/link/"],
        disallow: [
          "/dashboard",
          "/discografia",
          "/maquetas",
          "/setlists",
          "/collabs",
          "/proyectos",
          "/calendario",
          "/redes",
          "/ingresos",
          "/gastos",
          "/metas",
          "/estadisticas",
          "/analizar",
          "/equipo",
          "/notificaciones",
          "/papelera",
          "/perfil",
          "/buscar",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
