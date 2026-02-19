import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/app/"],
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/app/"],
      },
      {
        userAgent: "Twitterbot",
        allow: "/",
      },
      {
        userAgent: "facebookexternalhit",
        allow: "/",
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app/"],
      },
    ],
    sitemap: "https://www.modogestor.com.br/sitemap.xml",
  };
}
