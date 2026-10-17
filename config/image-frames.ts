/**
 * IMAGE FRAMES — the fixed shape of every picture on the website.
 * ------------------------------------------------------------------
 * Each place that shows a picture has ONE shape here. When someone picks a picture in the dashboard, the cropper
 * (components/media/ImageCropper.tsx) opens with that shape: they move / zoom the picture (or fit all of it),
 * and a new picture of EXACTLY this size is saved. So whatever is uploaded — huge, tiny, tall or wide —
 * the website's design stays the same.
 *
 *   w × h  = size of the saved picture in pixels (the shape is w : h)
 *   transparent = the empty space may stay see-through (saved as PNG); otherwise a background colour is used (JPEG)
 *
 * To change a shape: change w / h here AND the matching shape in the storefront file written next to it.
 */
export interface ImageFrame {
  w: number;
  h: number;
  transparent?: boolean;
}

export const IMAGE_FRAMES = {
  /** Homepage slider, computers — storefront/components/sections/HeroSlider.tsx (full width, 60% of the screen height) */
  heroSlide: { w: 1920, h: 840 },
  /** Homepage slider, phones (optional second picture) */
  heroSlideMobile: { w: 900, h: 1200 },
  /** Picture behind a page title — storefront/components/sections/PageHeroSection.tsx */
  pageHero: { w: 1920, h: 640 },
  /** Picture behind a category's title — storefront/app/[locale]/categories/[slug]/page.tsx */
  categoryBanner: { w: 1920, h: 640 },
  /** Category picture (circles on the homepage, cards on /categories) — CategoriesSection.tsx */
  categoryImage: { w: 900, h: 900 },
  /** Collection picture ("Our collections" block on the homepage) — BrandsSection.tsx (aspect-[4/3]) */
  collectionImage: { w: 1200, h: 900 },
  /** "Image + text" block — ImageTextSection.tsx (aspect-[4/5]) */
  imageText: { w: 960, h: 1200 },
  /** Wide banner — BannerSection.tsx (aspect-[4/1]; phones show the middle part) */
  banner: { w: 1600, h: 400 },
  /** Promotion block — PromotionSection.tsx */
  promotion: { w: 1200, h: 900 },
  /** Background of a call-to-action block — CtaSection.tsx */
  cta: { w: 1600, h: 600 },
  /** "Stay connected" tall pictures — storefront/components/sections/SocialFeedSection.tsx (aspect-[9/16]) */
  socialPost: { w: 720, h: 1280 },
  /** Picture shown before a video plays — VideoSection.tsx (aspect-video) */
  videoPoster: { w: 1280, h: 720 },
  /** Branch photo — BranchesSection.tsx (aspect-[16/9]) */
  branch: { w: 1280, h: 720 },
  /** Product photos. Which one is used follows Theme & design → Layout → "Product image shape" */
  productSquare: { w: 1200, h: 1200 },
  productPortrait: { w: 1200, h: 1600 },
  /** Picture shown when a link is shared (WhatsApp, Facebook) */
  share: { w: 1200, h: 630 },
  /** Small icon in the browser tab */
  favicon: { w: 512, h: 512, transparent: true },
  // Spotlight block: the tall picture next to the product cards (storefront: ProductSpotlightSection.tsx)
  spotlight: { w: 1000, h: 1480 },
  // Places on a picture: the wide picture (storefront: LocationsSection.tsx)
  locations: { w: 1920, h: 1200 },
  // Social block in "gallery" look: 4:5 pictures (storefront: SocialFeedSection.tsx)
  galleryPost: { w: 800, h: 1000 },
  // Footer divider picture (e.g. a gold chain), white parts blend into the footer
  footerDivider: { w: 1520, h: 194 },
} satisfies Record<string, ImageFrame>;

export type FrameKey = keyof typeof IMAGE_FRAMES;

/** Shortest "4:3"-style name of a shape, for the hint under the picture */
export function ratioName({ w, h }: ImageFrame): string {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const g = gcd(w, h);
  // Odd shapes (e.g. 1200 × 630 = 40:21) read better as "1.9:1"
  return w / g > 21 || h / g > 21 ? `${Math.round((w / h) * 10) / 10}:1` : `${w / g}:${h / g}`;
}
