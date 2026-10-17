/**
 * VIDEO LINKS — the storefront plays YouTube / Vimeo inside the page, which needs their "embed" address.
 * Staff paste the normal link; this turns it into the embed one:
 *   https://www.youtube.com/watch?v=abc  or  https://youtu.be/abc   -> https://www.youtube.com/embed/abc
 *   https://vimeo.com/123456                                         -> https://player.vimeo.com/video/123456
 * Anything else (already an embed link, an MP4 file) is left as it is.
 */
export function toEmbedUrl(provider: "youtube" | "vimeo" | "file", url: string): string {
  const u = url.trim();
  if (provider === "youtube") {
    const id = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/)?.[1];
    return id ? `https://www.youtube.com/embed/${id}` : u;
  }
  if (provider === "vimeo") {
    const id = u.match(/^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : u;
  }
  return u;
}
