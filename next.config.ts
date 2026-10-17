/**
 * NEXT.JS SETTINGS (dashboard)
 *   - reactCompiler: automatic performance optimisation (same as the storefront)
 *   - images.remotePatterns: where product/media images may be loaded from.
 *     Add the client's image host / CDN here when the API is ready.
 *
 *   - experimental.proxyClientMaxBodySize: biggest request the dashboard accepts (media uploads). Keep it above MAX_UPLOAD_MB.
 *
 * The dashboard runs on port 3002 (see package.json) so it can run next to the storefront (3000).
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Uploads to the media library go up to 50 MB (lib/media/image-check.ts → MAX_UPLOAD_MB); a little room is left on top
  experimental: { proxyClientMaxBodySize: "55mb" },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // King Gold sample data: photos from their current Shopify site (remove once photos are in the media library)
      { protocol: "https", hostname: "cdn.shopify.com" },
    ],
  },
};

export default nextConfig;
