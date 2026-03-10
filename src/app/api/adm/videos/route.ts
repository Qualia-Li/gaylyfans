import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getRedis } from "@/lib/redis";
import feedVideos from "@/data/feed-videos.json";
import scenarios from "@/data/scenarios.json";
import classifiedData from "@/x-downloads-data/top_1000_classified.json";
import type { Scenario, RatingSubmission } from "@/types/rate";

const ADMIN_EMAIL = "liquanlai1995@gmail.com";

interface ClassifiedItem {
  filename: string;
  account: string;
  position: string;
  clip_score: number;
  favorite_count: number;
  bookmark_count: number;
  retweet_count: number;
  view_count: number;
  popularity_score: number;
}

let classifiedMap: Map<string, ClassifiedItem> | null = null;

function getClassifiedMap(): Map<string, ClassifiedItem> {
  if (classifiedMap) return classifiedMap;
  classifiedMap = new Map();
  for (const item of classifiedData as unknown as ClassifiedItem[]) {
    const key = `${item.account}_${item.filename.replace(/\.\w+$/, "")}`;
    classifiedMap.set(key, item);
  }
  return classifiedMap;
}

const R2_THUMB_BASE = "https://pub-be9e0552363545c5a4778d2715805f99.r2.dev/gaylyfans/thumbnails";

function extractKeyFromUrl(videoUrl: string): string | null {
  const match = videoUrl.match(/generated\/(.+)\.mp4$/);
  if (match) return match[1];
  return null;
}

function getThumbnailUrl(videoUrl: string): string {
  // Generated videos: gaylyfans/generated/gaizellic_xxx.mp4 → gaizellic_xxx.jpg
  const genMatch = videoUrl.match(/generated\/(.+)\.mp4$/);
  if (genMatch) return `${R2_THUMB_BASE}/${genMatch[1]}.jpg`;

  // Rate videos: /rate/scenario/variant.mp4 → rate_scenario_variant.jpg
  const rateMatch = videoUrl.match(/rate\/([^/]+)\/(\w+)\.mp4$/);
  if (rateMatch) return `${R2_THUMB_BASE}/rate_${rateMatch[1]}_${rateMatch[2]}.jpg`;

  return "";
}

function detectModel(videoUrl: string): string {
  // All are on the same gaygayfans bucket now, differentiate by path
  if (videoUrl.includes("/gaylyfans/generated/")) return "wan2.2";
  if (videoUrl.includes("/rate/")) return "lora-test";
  return "unknown";
}

// Position → LoRA mapping (matches generate_videos.py)
const LORA_CONFIG: Record<string, string> = {
  anal_cowgirl: "Cowgirl HIGH @1.5",
  cowgirl: "Cowgirl HIGH @1.5",
  anal_doggy: "Doggy HIGH @1.5",
  doggy: "Doggy HIGH @1.5",
  oral: "Blowjob HIGH @1.5",
  handjob: "Handjob HIGH @1.2 + Orgasm @0.8",
  facial: "Blowjob HIGH @1.0 + Cumshot LOW @1.2",
  anal_missionary: "Missionary HIGH @1.5",
  missionary: "Missionary HIGH @1.5",
  footjob: "Handjob HIGH @1.2 + Orgasm @0.8",
  general: "General-NSFW HIGH @1.5",
};

const RATE_LORA_CONFIG: Record<string, string> = {
  achai_new: "Gay 1.2 + PENIS 1.0 + Cowgirl 0.8",
  lymss_oral: "Gay 1.2 + PENIS 1.0 + Blowjob 0.8",
  military_cowgirl: "Gay 1.2 + PENIS 1.0 + Cowgirl 0.8",
  naruto_bj: "Gay 1.2 + PENIS 1.0 + Blowjob 0.8",
  whitebook_anal: "Gay 1.2 + PENIS 1.0 + Cowgirl 0.8",
  whitebook_anal_missionary: "Gay 1.2 + PENIS 1.0 + Missionary 0.8",
  whitebook_cumshot: "Gay 1.2 + PENIS 1.0 + Cumshot LOW 0.8",
  whitebook_cumspitting: "Gay 1.2 + PENIS 1.0",
  whitebook_facial: "Gay 1.2 + PENIS 1.0 + Blowjob 0.8",
  whitebook_riding: "Gay 1.2 + PENIS 1.0 + Cowgirl 0.8",
  whitebook_solo: "Gay 1.2 + Handjob 1.0",
  yyzxmiao_jerkoff: "Gay 1.2 + Handjob 1.0",
  yyzxmiao_oral: "Gay 1.2 + PENIS 1.0 + Blowjob 0.8",
  yyzxmiao_rear: "Gay 1.2 + PENIS 1.0 + Doggy 0.8",
  zaidiankun_doggy: "Gay 1.2 + PENIS 1.0 + Doggy 0.8",
  zaidiankun_footjob: "Gay 1.2 + Handjob 1.0 + Orgasm 0.8",
};

function getLoraLabel(videoUrl: string, position: string): string {
  const rateMatch = videoUrl.match(/rate\/([^/]+)\//);
  if (rateMatch) return RATE_LORA_CONFIG[rateMatch[1]] ?? "unknown";
  return LORA_CONFIG[position] ?? "unknown";
}

// Fetch real user ratings from Redis
async function getRatingsMap(): Promise<Map<string, { avgStars: number; totalRatings: number; bestPicks: number }>> {
  const ratingsMap = new Map<string, { avgStars: number; totalRatings: number; bestPicks: number }>();
  const redis = getRedis();

  for (const scenario of scenarios as Scenario[]) {
    const keys = await redis.smembers(`submissions:${scenario.id}`);
    const submissions: RatingSubmission[] = [];

    const results = await Promise.all(keys.map((key) => redis.get<string>(key)));
    for (const data of results) {
      if (data) {
        try {
          submissions.push(typeof data === "string" ? JSON.parse(data) : data);
        } catch {
          // skip malformed Redis entry
        }
      }
    }

    for (const variant of scenario.variants) {
      const variantRatings = submissions
        .flatMap((s) => s.ratings)
        .filter((r) => r.variantId === variant.id);
      const bestPicks = submissions.filter((s) => s.bestVariantId === variant.id).length;

      if (variantRatings.length > 0 || bestPicks > 0) {
        ratingsMap.set(variant.videoUrl, {
          avgStars: variantRatings.length > 0
            ? variantRatings.reduce((sum, r) => sum + r.stars, 0) / variantRatings.length
            : 0,
          totalRatings: variantRatings.length,
          bestPicks,
        });
      }
    }
  }

  return ratingsMap;
}

export async function GET() {
  const session = await getSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (session.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Admin access only" }, { status: 403 });
  }

  const classified = getClassifiedMap();
  const ratings = await getRatingsMap();

  const enriched = (feedVideos as Array<{ id: string; videoUrl: string; title: string; creator: string; creatorAvatar: string; likes: number; comments: number; shares: number; tags: string[] }>).map((v) => {
    const key = extractKeyFromUrl(v.videoUrl);
    const meta = key ? classified.get(key) : null;
    const position = meta?.position ?? v.tags.find((t) => !["ai", "wan2.1", "wan2.2", "lora", "generated"].includes(t)) ?? "unknown";
    const rating = ratings.get(v.videoUrl);

    return {
      id: v.id,
      videoUrl: v.videoUrl,
      thumbnailUrl: getThumbnailUrl(v.videoUrl),
      title: v.title,
      creator: v.creator,
      model: detectModel(v.videoUrl),
      position,
      lora: getLoraLabel(v.videoUrl, position),
      clip_score: meta?.clip_score ?? null,
      avgStars: rating?.avgStars ?? null,
      totalRatings: rating?.totalRatings ?? 0,
      bestPicks: rating?.bestPicks ?? 0,
    };
  });

  return NextResponse.json(enriched);
}
