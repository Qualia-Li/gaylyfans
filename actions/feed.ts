'use server'

import { db } from '@/lib/db'
import { feedVideos, videoLikes, reports, generationJobs } from '@/lib/db/schema'
import { eq, desc, and, inArray, sql } from 'drizzle-orm'
import type { FeedVideo } from '@/types/gaylyfans'

export type SortBy = 'latest' | 'trending' | 'random'

const MAX_LIKE_BATCH = 100

export async function getFeedVideos(
  sortBy: SortBy = 'latest'
): Promise<FeedVideo[]> {
  let orderClause
  switch (sortBy) {
    case 'trending':
      orderClause = desc(feedVideos.likes)
      break
    case 'random':
      orderClause = sql`RANDOM()`
      break
    case 'latest':
    default:
      orderClause = desc(feedVideos.createdAt)
      break
  }

  const rows = await db
    .select()
    .from(feedVideos)
    .where(eq(feedVideos.isActive, true))
    .orderBy(orderClause)

  return rows.map((r) => ({
    id: r.id,
    videoUrl: r.videoUrl,
    title: r.title,
    creator: r.creator,
    creatorAvatar: r.creatorAvatar,
    likes: r.likes,
    comments: r.comments,
    shares: r.shares,
    tags: (r.tags as string[]) ?? [],
  }))
}

/**
 * Get real like counts for multiple videos from the videoLikes table.
 * Capped to MAX_LIKE_BATCH to prevent unbounded IN queries.
 */
export async function getLikeCounts(
  videoIds: number[]
): Promise<Record<number, number>> {
  // Validate: only positive integers, capped to batch size
  const validIds = videoIds
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, MAX_LIKE_BATCH)

  if (validIds.length === 0) return {}

  const rows = await db
    .select({
      videoId: videoLikes.videoId,
      count: sql<number>`count(*)::int`,
    })
    .from(videoLikes)
    .where(inArray(videoLikes.videoId, validIds))
    .groupBy(videoLikes.videoId)

  const result: Record<number, number> = {}
  for (const row of rows) {
    result[row.videoId] = row.count
  }
  return result
}

/**
 * Get which videos a visitor has liked (for restoring liked state).
 */
export async function getVisitorLikes(
  visitorId: string,
  videoIds: number[]
): Promise<number[]> {
  if (!visitorId || videoIds.length === 0) return []

  const validIds = videoIds
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, MAX_LIKE_BATCH)

  if (validIds.length === 0) return []

  const rows = await db
    .select({ videoId: videoLikes.videoId })
    .from(videoLikes)
    .where(
      and(
        eq(videoLikes.visitorId, visitorId),
        inArray(videoLikes.videoId, validIds)
      )
    )

  return rows.map((r) => r.videoId)
}

/**
 * Toggle like for a video. Returns the new liked state and updated count.
 * Uses a transaction to ensure atomicity of like toggle + counter sync.
 * Validates inputs to prevent spoofed likes.
 */
export async function toggleLike(
  videoId: number,
  visitorId: string
): Promise<{ liked: boolean; newCount: number }> {
  // Input validation
  if (!Number.isInteger(videoId) || videoId <= 0) {
    throw new Error('Invalid video ID')
  }
  if (!visitorId || typeof visitorId !== 'string' || visitorId.length > 128) {
    throw new Error('Invalid visitor ID')
  }

  return await db.transaction(async (tx) => {
    // Check if already liked
    const existing = await tx
      .select({ id: videoLikes.id })
      .from(videoLikes)
      .where(and(eq(videoLikes.videoId, videoId), eq(videoLikes.visitorId, visitorId)))
      .limit(1)

    const wasLiked = existing.length > 0

    if (wasLiked) {
      await tx.delete(videoLikes).where(eq(videoLikes.id, existing[0].id))
    } else {
      await tx.insert(videoLikes).values({ videoId, visitorId })
    }

    // Get updated count and sync denormalized counter atomically
    const [countRow] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(videoLikes)
      .where(eq(videoLikes.videoId, videoId))

    const newCount = countRow?.count ?? 0

    await tx
      .update(feedVideos)
      .set({ likes: newCount })
      .where(eq(feedVideos.id, videoId))

    return { liked: !wasLiked, newCount }
  })
}

/**
 * Get user-generated completed videos formatted as FeedVideo entries.
 */
export async function getGeneratedVideos(): Promise<FeedVideo[]> {
  const rows = await db
    .select()
    .from(generationJobs)
    .where(
      and(
        eq(generationJobs.status, 'completed'),
        sql`${generationJobs.resultVideoUrl} IS NOT NULL`
      )
    )
    .orderBy(desc(generationJobs.createdAt))
    .limit(50)

  return rows
    .filter((r) => r.resultVideoUrl)
    .map((r, i) => ({
      // Use negative IDs to avoid collision with feedVideos IDs
      id: -(i + 1),
      videoUrl: r.resultVideoUrl!,
      title: r.prompt ?? 'AI Generated Video',
      creator: 'AI Generated',
      creatorAvatar: '✨',
      likes: 0,
      comments: 0,
      shares: 0,
      tags: ['ai-generated'],
      isAiGenerated: true,
    }))
}

export async function submitReport(
  videoId: number,
  reason: string,
  detail?: string,
  userAgent?: string
) {
  // Validate: only real videos (positive IDs) can be reported
  if (!Number.isInteger(videoId) || videoId <= 0) {
    return { ok: false, error: 'Cannot report this video' }
  }

  await db.insert(reports).values({
    videoId,
    reason: reason as any,
    detail,
    userAgent,
  })
  return { ok: true }
}
