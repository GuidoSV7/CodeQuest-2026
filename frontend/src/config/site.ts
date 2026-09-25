/** Public site URL (SEO: metadataBase, sitemap, robots). */
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(
  /\/$/,
  "",
);

export const siteUrl = configuredSiteUrl || "http://localhost:3000";

export const siteName = "CodeQuest";
