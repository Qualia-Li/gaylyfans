# GaylyFans

## Video Generation Pipeline

### Overview
The `x-downloads/` directory contains the full I2V (image-to-video) generation pipeline. Videos are generated from anime/3D source images using WAN 2.2 on WaveSpeed with position-matched LoRAs.

### Pipeline Steps
```
1. rank_top_images.py      → top_1000.json (rank by popularity)
2. classify_positions_clip.py → all_images_classified.json (CLIP classifier, free/local)
3. select_final_1000.py    → top_1000_classified.json (50+ per category, 1000 total)
4. generate_videos.py      → generation_progress.json + downloaded videos + R2 upload + feed update
```

### Running Generation
```bash
cd x-downloads
python3 generate_videos.py [--concurrency 3] [--delay 2.0] [--dry-run]
```

The script is **fully restartable** — tracks state in `generation_progress.json`. On completion it automatically:
1. Downloads completed videos to `x-downloads/generated_videos/`
2. Uploads them to R2 bucket `gaygayfans` at `gaylyfans/generated/` (via `wrangler r2 object put --remote`)
3. Updates `src/data/feed-videos.json` with new entries
4. Syncs classified data to `src/x-downloads-data/` for the admin page

### R2 Storage
- **Bucket**: `gaygayfans`
- **Public URL**: `https://pub-be9e0552363545c5a4778d2715805f99.r2.dev`
- **Path pattern**: `gaylyfans/generated/{account}_{tweetId}_{index}.mp4`
- **Upload**: Must use `wrangler r2 object put ... --remote` (without `--remote` goes to local miniflare)

### LoRA Configuration
- **Anime content**: Position LoRA only at 1.5 in `high_noise_loras` (NO Gay LoRA, NO NSFW-H)
- **Realistic/3D content**: Gay LoRA 1.2 (in `loras`) + PENIS I2V HIGH 1.5 + Position LoRA 1.0 (in `high_noise_loras`)
- Reference: `~/proj/gaylora/FINDINGS.md`

### Position Categories
general, handjob, oral, anal_cowgirl, anal_doggy, anal_missionary, footjob, facial

### Admin Page
`/adm/rating` — admin-only video database showing all videos with LoRA config, position, model, CLIP score. Requires login as `liquanlai1995@gmail.com`.

### Deploy
```bash
vercel --prod --archive=tgz
```
The `x-downloads/` dir is in `.vercelignore` (3+ GB of source images/videos).

## Tech Stack
- Next.js 16 + React 19 + Radix UI + Tailwind 4
- Upstash Redis (sessions, ratings, user data)
- Cloudflare R2 (video hosting)
- Resend (magic link auth)
- Zustand (client state)
