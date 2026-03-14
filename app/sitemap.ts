import { MetadataRoute } from "next";
import { allPages } from "contentlayer/generated";

async function getStaticPageSlugs() {
  return allPages.map((page) => ({
    slug: page.slugAsParams,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wr.do";
  const currentDate = new Date();

  // static
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/feedback`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // (marketing)/[slug]
  const marketingPageSlugs = await getStaticPageSlugs();
  const marketingPages: MetadataRoute.Sitemap = marketingPageSlugs.map(
    (slug) => ({
      url: `${baseUrl}/${slug.slug}`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }),
  );

  const protectedPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/dashboard`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  return [
    ...staticPages,
    ...marketingPages,
    ...protectedPages,
  ];
}
