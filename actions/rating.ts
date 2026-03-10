'use server'

import { db } from '@/lib/db'
import {
  scenarios,
  scenarioVariants,
  ratings,
} from '@/lib/db/schema'
import { eq, sql, count } from 'drizzle-orm'

/**
 * List all active scenarios with variant count.
 */
export async function getScenarios() {
  const rows = await db
    .select({
      id: scenarios.id,
      name: scenarios.name,
      sourceImageUrl: scenarios.sourceImageUrl,
      sortOrder: scenarios.sortOrder,
      variantCount: count(scenarioVariants.id),
    })
    .from(scenarios)
    .leftJoin(scenarioVariants, eq(scenarioVariants.scenarioId, scenarios.id))
    .where(eq(scenarios.isActive, true))
    .groupBy(scenarios.id)
    .orderBy(scenarios.sortOrder)

  return rows
}

/**
 * Get a single scenario with its variants.
 */
export async function getScenario(id: string) {
  const [scenario] = await db
    .select()
    .from(scenarios)
    .where(eq(scenarios.id, id))
    .limit(1)

  if (!scenario) return null

  const variants = await db
    .select()
    .from(scenarioVariants)
    .where(eq(scenarioVariants.scenarioId, id))
    .orderBy(scenarioVariants.sortOrder)

  return { ...scenario, variants }
}

/**
 * Submit or update a rating.
 * Uses INSERT ... ON CONFLICT DO UPDATE for idempotency.
 */
export async function submitRating(submission: {
  scenarioId: string
  visitorId: string
  userId?: string
  ratingsJson: { variantId: string; stars: number }[]
  bestVariantId?: string
}) {
  const result = await db
    .insert(ratings)
    .values({
      scenarioId: submission.scenarioId,
      visitorId: submission.visitorId,
      userId: submission.userId,
      ratingsJson: submission.ratingsJson,
      bestVariantId: submission.bestVariantId,
    })
    .onConflictDoUpdate({
      target: [ratings.scenarioId, ratings.visitorId],
      set: {
        ratingsJson: sql`excluded.ratings_json`,
        bestVariantId: sql`excluded.best_variant_id`,
        userId: sql`COALESCE(excluded.user_id, ${ratings.userId})`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: ratings.id, updatedAt: ratings.updatedAt, createdAt: ratings.createdAt })

  const row = result[0]
  // If createdAt and updatedAt are very close, it's a new rating
  const isNew =
    row.createdAt.getTime() === row.updatedAt.getTime() ||
    Math.abs(row.updatedAt.getTime() - row.createdAt.getTime()) < 1000

  return { ok: true, isNew }
}

/**
 * Get all ratings by a visitor.
 */
export async function getMyRatings(visitorId: string) {
  return db
    .select()
    .from(ratings)
    .where(eq(ratings.visitorId, visitorId))
}

/**
 * Aggregate results per scenario.
 * Returns average stars per variant and vote count.
 */
export async function getResults() {
  const allRatings = await db.select().from(ratings)

  // Group by scenario
  const scenarioMap = new Map<
    string,
    {
      scenarioId: string
      totalVotes: number
      variantStats: Map<string, { totalStars: number; count: number }>
      bestVariantVotes: Map<string, number>
    }
  >()

  for (const r of allRatings) {
    if (!scenarioMap.has(r.scenarioId)) {
      scenarioMap.set(r.scenarioId, {
        scenarioId: r.scenarioId,
        totalVotes: 0,
        variantStats: new Map(),
        bestVariantVotes: new Map(),
      })
    }

    const entry = scenarioMap.get(r.scenarioId)!
    entry.totalVotes++

    // Process individual variant ratings
    const ratingsArr = r.ratingsJson as { variantId: string; stars: number }[]
    for (const vr of ratingsArr) {
      if (!entry.variantStats.has(vr.variantId)) {
        entry.variantStats.set(vr.variantId, { totalStars: 0, count: 0 })
      }
      const vs = entry.variantStats.get(vr.variantId)!
      vs.totalStars += vr.stars
      vs.count++
    }

    // Count best variant votes
    if (r.bestVariantId) {
      entry.bestVariantVotes.set(
        r.bestVariantId,
        (entry.bestVariantVotes.get(r.bestVariantId) || 0) + 1
      )
    }
  }

  // Convert to plain objects
  return Array.from(scenarioMap.values()).map((entry) => ({
    scenarioId: entry.scenarioId,
    totalVotes: entry.totalVotes,
    variants: Array.from(entry.variantStats.entries()).map(([variantId, stats]) => ({
      variantId,
      avgStars: stats.count > 0 ? stats.totalStars / stats.count : 0,
      voteCount: stats.count,
    })),
    bestVariantVotes: Object.fromEntries(entry.bestVariantVotes),
  }))
}
