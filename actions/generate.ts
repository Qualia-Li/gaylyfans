'use server'

import { db } from '@/lib/db'
import { generationJobs, loraPresets, usage } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { notifyError } from '@/lib/notify'

const WAVESPEED_API_URL = 'https://api.wavespeed.ai/api/v3/wavespeed-ai/wan-2.1-i2v-480p'
const CREDITS_PER_GENERATION = 3

/**
 * List all active LoRA presets.
 */
export async function getLoraPresets() {
  return db
    .select()
    .from(loraPresets)
    .where(eq(loraPresets.isActive, true))
    .orderBy(loraPresets.sortOrder)
}

/**
 * Create a generation job.
 * Deducts credits from the user's balance, creates a DB record, and calls WaveSpeed API.
 */
export async function createGeneration(
  userId: string,
  prompt: string,
  sourceImageUrl: string,
  presetId?: string,
  duration: number = 5
) {
  // 1. Check and deduct credits
  const [userUsage] = await db
    .select()
    .from(usage)
    .where(eq(usage.userId, userId))
    .limit(1)

  if (!userUsage) {
    return { error: 'No usage record found. Please contact support.' }
  }

  const totalCredits =
    userUsage.subscriptionCreditsBalance + userUsage.oneTimeCreditsBalance

  if (totalCredits < CREDITS_PER_GENERATION) {
    return { error: 'Insufficient credits. Please purchase more credits.' }
  }

  // Deduct from one-time credits first, then subscription
  let oneTimeDeduct = Math.min(userUsage.oneTimeCreditsBalance, CREDITS_PER_GENERATION)
  let subDeduct = CREDITS_PER_GENERATION - oneTimeDeduct

  await db
    .update(usage)
    .set({
      oneTimeCreditsBalance: sql`${usage.oneTimeCreditsBalance} - ${oneTimeDeduct}`,
      subscriptionCreditsBalance: sql`${usage.subscriptionCreditsBalance} - ${subDeduct}`,
    })
    .where(eq(usage.userId, userId))

  // 2. Build LoRA config if preset selected
  let loraConfig: { path: string; scale: number }[] | undefined
  if (presetId) {
    const [preset] = await db
      .select()
      .from(loraPresets)
      .where(eq(loraPresets.id, presetId))
      .limit(1)
    if (preset) {
      loraConfig = preset.loras as { path: string; scale: number }[]
    }
  }

  // 3. Create job record
  const [job] = await db
    .insert(generationJobs)
    .values({
      userId,
      prompt,
      sourceImageUrl,
      presetId,
      duration,
      creditsCharged: CREDITS_PER_GENERATION,
      status: 'pending',
    })
    .returning()

  // 4. Call WaveSpeed API
  try {
    const apiKey = process.env.WAVESPEED_API_KEY
    if (!apiKey) {
      throw new Error('WAVESPEED_API_KEY is not configured')
    }

    const body: Record<string, unknown> = {
      image: sourceImageUrl,
      prompt,
      duration,
    }
    if (loraConfig) {
      body.loras = loraConfig
    }

    const res = await fetch(WAVESPEED_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data?.message || `WaveSpeed API error: ${res.status}`)
    }

    // Update job with provider ID
    await db
      .update(generationJobs)
      .set({
        providerJobId: data.data?.id || data.id,
        status: 'processing',
        providerResponse: data,
      })
      .where(eq(generationJobs.id, job.id))

    return { ok: true, jobId: job.id, providerJobId: data.data?.id || data.id }
  } catch (err) {
    // Mark job as failed
    await db
      .update(generationJobs)
      .set({
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      })
      .where(eq(generationJobs.id, job.id))

    await notifyError('createGeneration', err)
    return { error: err instanceof Error ? err.message : 'Generation failed' }
  }
}

/**
 * Get generation job status from DB.
 */
export async function getGenerationStatus(jobId: string) {
  const [job] = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.id, jobId))
    .limit(1)

  if (!job) {
    return { error: 'Job not found' }
  }

  return {
    id: job.id,
    status: job.status,
    resultVideoUrl: job.resultVideoUrl,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  }
}
