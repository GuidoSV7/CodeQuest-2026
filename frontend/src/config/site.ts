/** Public site URL (SEO: metadataBase, sitemap, robots). */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

export const siteName = "CodeQuest";
