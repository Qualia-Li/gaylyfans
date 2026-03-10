/**
 * Seed script for GaylyFans tables.
 * Reads JSON data files and inserts into feedVideos, scenarios, scenarioVariants, loraPresets.
 *
 * Usage: pnpm tsx scripts/seed-gaylyfans.ts
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '../lib/db/schema'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const sql = postgres(connectionString, { max: 1 })
const db = drizzle(sql, { schema })

// ---- helpers ----

function readJson<T>(filename: string): T {
  const filePath = path.resolve(__dirname, '..', 'data', filename)
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

// ---- types for JSON data ----

interface FeedVideoJson {
  id: string
  videoUrl: string
  title: string
  creator: string
  creatorAvatar: string
  likes: number
  comments: number
  shares: number
  tags: string[]
}

interface ScenarioVariantJson {
  id: string
  label: string
  videoUrl: string
}

interface ScenarioJson {
  id: string
  name: string
  sourceImageUrl: string
  variants: ScenarioVariantJson[]
}

interface LoraPresetJson {
  id: string
  name: string
  description: string
  loras: { path: string; scale: number }[]
}

// ---- seed functions ----

async function seedFeedVideos() {
  const videos = readJson<FeedVideoJson[]>('feed-videos.json')
  console.log(`Seeding ${videos.length} feed videos...`)

  for (const v of videos) {
    await db
      .insert(schema.feedVideos)
      .values({
        id: parseInt(v.id, 10),
        videoUrl: v.videoUrl,
        title: v.title,
        creator: v.creator,
        creatorAvatar: v.creatorAvatar,
        likes: v.likes,
        comments: v.comments,
        shares: v.shares,
        tags: v.tags,
        isActive: true,
        sortOrder: parseInt(v.id, 10),
      })
      .onConflictDoNothing()
  }

  console.log('  Feed videos done.')
}

async function seedScenarios() {
  const scenarios = readJson<ScenarioJson[]>('scenarios.json')
  console.log(`Seeding ${scenarios.length} scenarios...`)

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i]

    // Insert scenario
    await db
      .insert(schema.scenarios)
      .values({
        id: s.id,
        name: s.name,
        sourceImageUrl: s.sourceImageUrl,
        isActive: true,
        sortOrder: i,
      })
      .onConflictDoNothing()

    // Insert variants
    for (let j = 0; j < s.variants.length; j++) {
      const v = s.variants[j]
      await db
        .insert(schema.scenarioVariants)
        .values({
          id: v.id,
          scenarioId: s.id,
          label: v.label,
          videoUrl: v.videoUrl,
          sortOrder: j,
        })
        .onConflictDoNothing()
    }
  }

  console.log('  Scenarios + variants done.')
}

async function seedLoraPresets() {
  const presets = readJson<LoraPresetJson[]>('lora-presets.json')
  console.log(`Seeding ${presets.length} LoRA presets...`)

  for (let i = 0; i < presets.length; i++) {
    const p = presets[i]
    await db
      .insert(schema.loraPresets)
      .values({
        id: p.id,
        name: p.name,
        description: p.description,
        loras: p.loras,
        isActive: true,
        sortOrder: i,
      })
      .onConflictDoNothing()
  }

  console.log('  LoRA presets done.')
}

// ---- main ----

async function main() {
  console.log('Starting GaylyFans seed...\n')

  await seedFeedVideos()
  await seedScenarios()
  await seedLoraPresets()

  console.log('\nSeed complete!')
  await sql.end()
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  sql.end().then(() => process.exit(1))
})
