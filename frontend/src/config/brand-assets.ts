export const BRAND_ASSETS = {
  isologo: "/devtalles-brand/isologo-color.svg",
  deviHello: "/devtalles-brand/devi-hello.svg",
  deviLaptop: "/devtalles-brand/devi-laptop.svg",
} as const;

export type BrandAssetKey = keyof typeof BRAND_ASSETS;
