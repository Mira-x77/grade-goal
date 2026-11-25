export const MAX_FEED_IMAGES = 5;
export const FEED_CACHE_KEY = "gostudy_feed_posts_v1";

export type FeedPostType = "course" | "news";

export interface FeedPost {
  id: string;
  title: string;
  description: string;
  instructor: string | null;
  price: string | null;
  duration: string | null;
  level: string;
  category: string;
  image_url: string | null;
  image_urls?: string[] | null;
  link_url: string | null;
  is_featured: boolean;
  created_at: string;
  post_type?: FeedPostType | null;
}

export function isNewsPost(
  post: Pick<FeedPost, "post_type" | "category" | "price">,
): boolean {
  if (post.post_type === "news") return true;
  if (post.post_type === "course") return false;
  if ((post.category || "").toLowerCase() === "news") return true;
  // Existing flyers with no price were news/events, not paid courses
  return !post.price;
}

export function collectFeedImages(post: Pick<FeedPost, "image_url" | "image_urls">): string[] {
  const urls = [...(post.image_urls ?? []), post.image_url]
    .filter((u): u is string => Boolean(u && u.trim()));
  return [...new Set(urls)].slice(0, MAX_FEED_IMAGES);
}

export function coverImage(post: Pick<FeedPost, "image_url" | "image_urls">): string | null {
  return collectFeedImages(post)[0] ?? null;
}

export function readFeedCache(): FeedPost[] {
  try {
    const raw = sessionStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeFeedCache(posts: FeedPost[]) {
  try {
    sessionStorage.setItem(FEED_CACHE_KEY, JSON.stringify(posts));
  } catch {
    /* quota / private mode */
  }
}
