#!/usr/bin/env python3
"""
Batch I2V video generation using WaveSpeed API.

Reads top_1000_classified.json, maps each image's position to LoRA presets,
submits to WaveSpeed wan-2.2 i2v endpoint, and polls for results.

Restartable: tracks progress in generation_progress.json.

Usage:
    python generate_videos.py [--concurrency N] [--delay S] [--dry-run]
"""

import argparse
import asyncio
import base64
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

import aiohttp

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent  # gaylyfans root
INPUT_FILE = BASE_DIR / "top_1000_classified.json"
PROGRESS_FILE = BASE_DIR / "generation_progress.json"
GENERATED_DIR = BASE_DIR / "generated_videos"
FEED_FILE = PROJECT_DIR / "src" / "data" / "feed-videos.json"
CLASSIFIED_SRC = PROJECT_DIR / "src" / "x-downloads-data" / "top_1000_classified.json"
ENV_GLOBAL = Path.home() / ".claude" / ".env.global"

# ---------------------------------------------------------------------------
# R2 config
# ---------------------------------------------------------------------------
R2_BUCKET = "gaygayfans"
R2_PREFIX = "gaylyfans/generated"
R2_PUBLIC_URL = "https://pub-be9e0552363545c5a4778d2715805f99.r2.dev"

# ---------------------------------------------------------------------------
# API — standard wan-2.2 (NOT spicy, per FINDINGS.md)
# ---------------------------------------------------------------------------
API_BASE = "https://api.wavespeed.ai/api/v3"
SUBMIT_URL = f"{API_BASE}/wavespeed-ai/wan-2.2/image-to-video-lora"
RESULT_URL = f"{API_BASE}/predictions/{{request_id}}/result"
POLL_INTERVAL = 5  # seconds
MAX_RETRIES = 5
RETRY_BASE_DELAY = 2.0  # seconds, doubles each retry

# ---------------------------------------------------------------------------
# LoRA URLs (from FINDINGS.md)
# ---------------------------------------------------------------------------
# HuggingFace base URLs
LKZD7 = "https://huggingface.co/lkzd7/WAN2.2_LoraSet_NSFW/resolve/main"
WIIKOO = "https://huggingface.co/wiikoo/WAN-LORA/resolve/main"
GIORGIOV = "https://huggingface.co/GiorgioV/LoRA_for_WAN_22/resolve/main"

LORA_URLS = {
    "cowgirl_high": f"{LKZD7}/Blink_Squatting_Cowgirl_Position_I2V_HIGH.safetensors",
    "doggy_high": f"{LKZD7}/iGoon%20-%20Blink_Front_Doggystyle_I2V_HIGH.safetensors",
    "oral_high": f"{LKZD7}/iGOON_Blink_Blowjob_I2V_HIGH.safetensors",
    "handjob_high": f"{GIORGIOV}/iGoon%20-%20Blink_Handjob_I2V_HIGH.safetensors",
    "orgasm_high": f"{WIIKOO}/wan2.2/NEW/Wan2.2%20-%20I2V%20-%20Orgasm%20-%20HIGH%2014B.safetensors",
    "missionary_high": f"{WIIKOO}/wan2.2/NEW/Wan2.2%20-%20I2V%20-%20Missionary%20Sex%20-%20HIGH%2014B.safetensors",
    "facial_high": f"{WIIKOO}/wan2.2/NEW/Wan2.2%20-%20I2V%20-%20Blowjob%20-%20HIGH%2014B.safetensors",
    "cumshot_low": f"https://huggingface.co/JERRYNPC/WAN2.2-LORA-NSFW/resolve/main/56Low%20noise-Cumshot%20Aesthetics.safetensors",
    "nsfw_general_high": f"https://huggingface.co/lopi999/Wan2.2-I2V_General-NSFW-LoRA/resolve/main/NSFW-22-H-e8.safetensors",
}

# ---------------------------------------------------------------------------
# Per-position LoRA configs
# ANIME images: position LoRA only at 1.5 in high_noise_loras (no Gay LoRA)
# From FINDINGS.md: "Anime (any pose) — Position LoRA 1.5 only (no Gay LoRA, no NSFW-H)"
# ---------------------------------------------------------------------------
def get_lora_config(position: str) -> dict:
    """Return {high_noise_loras, low_noise_loras, loras} for given position."""
    configs = {
        "anal_cowgirl": {
            "high_noise_loras": [
                {"path": LORA_URLS["cowgirl_high"], "scale": 1.5},
            ],
        },
        "cowgirl": {
            "high_noise_loras": [
                {"path": LORA_URLS["cowgirl_high"], "scale": 1.5},
            ],
        },
        "anal_doggy": {
            "high_noise_loras": [
                {"path": LORA_URLS["doggy_high"], "scale": 1.5},
            ],
        },
        "doggy": {
            "high_noise_loras": [
                {"path": LORA_URLS["doggy_high"], "scale": 1.5},
            ],
        },
        "oral": {
            "high_noise_loras": [
                {"path": LORA_URLS["oral_high"], "scale": 1.5},
            ],
        },
        "handjob": {
            "high_noise_loras": [
                {"path": LORA_URLS["handjob_high"], "scale": 1.2},
                {"path": LORA_URLS["orgasm_high"], "scale": 0.8},
            ],
        },
        "facial": {
            "high_noise_loras": [
                {"path": LORA_URLS["facial_high"], "scale": 1.0},
            ],
            "low_noise_loras": [
                {"path": LORA_URLS["cumshot_low"], "scale": 1.2},
            ],
        },
        "anal_missionary": {
            "high_noise_loras": [
                {"path": LORA_URLS["missionary_high"], "scale": 1.5},
            ],
        },
        "missionary": {
            "high_noise_loras": [
                {"path": LORA_URLS["missionary_high"], "scale": 1.5},
            ],
        },
        "footjob": {
            "high_noise_loras": [
                {"path": LORA_URLS["handjob_high"], "scale": 1.2},
            ],
        },
        "general": {
            "high_noise_loras": [
                {"path": LORA_URLS["nsfw_general_high"], "scale": 1.0},
            ],
        },
    }
    return configs.get(position, configs["general"])


# ---------------------------------------------------------------------------
# Prompt templates — explicit motion words per FINDINGS.md
# ---------------------------------------------------------------------------
PROMPT_MAP: dict[str, str] = {
    "cowgirl": "two muscular anime males, cowgirl riding position, rhythmic bouncing hip motion, vigorous thrusting, smooth animation",
    "anal_cowgirl": "two muscular anime males, cowgirl riding position, rhythmic bouncing hip motion, vigorous thrusting, smooth animation",
    "doggy": "two muscular anime males, doggy style from behind, vigorous thrusting hip motion, back and forth penetration, smooth animation",
    "anal_doggy": "two muscular anime males, doggy style from behind, vigorous thrusting hip motion, back and forth penetration, smooth animation",
    "oral": "two muscular anime males, oral blowjob, smooth head bobbing motion, high quality animation",
    "handjob": "muscular anime male, handjob stroking motion, smooth rhythmic hand movement, high quality animation",
    "facial": "muscular anime male, facial cumshot scene, smooth motion, high quality animation",
    "missionary": "two muscular anime males, missionary position, vigorous thrusting motion, bodies rocking, smooth animation",
    "anal_missionary": "two muscular anime males, missionary position, vigorous thrusting motion, bodies rocking, smooth animation",
    "footjob": "two muscular anime males, footjob scene, smooth rhythmic motion, high quality animation",
    "general": "muscular anime males, intimate scene, smooth natural motion, high quality animation",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def load_api_key() -> str:
    """Read WAVESPEED_API_KEY from env or ~/.claude/.env.global."""
    key = os.environ.get("WAVESPEED_API_KEY")
    if key:
        return key
    if ENV_GLOBAL.exists():
        for line in ENV_GLOBAL.read_text().splitlines():
            line = line.strip()
            if line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k = k.strip()
            v = v.strip().strip("'\"")
            if k == "WAVESPEED_API_KEY":
                return v
    print("ERROR: WAVESPEED_API_KEY not found in environment or ~/.claude/.env.global")
    sys.exit(1)


def image_to_data_uri(path: str) -> str:
    """Encode a local image file as a base64 data URI."""
    p = Path(path)
    suffix = p.suffix.lower()
    mime = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }.get(suffix, "image/jpeg")
    data = p.read_bytes()
    b64 = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{b64}"


def load_progress() -> dict[str, dict]:
    """Load progress file (keyed by image path)."""
    if PROGRESS_FILE.exists():
        return json.loads(PROGRESS_FILE.read_text())
    return {}


def save_progress(progress: dict[str, dict]) -> None:
    """Atomically save progress file."""
    tmp = PROGRESS_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(progress, indent=2))
    tmp.replace(PROGRESS_FILE)


def print_stats(progress: dict[str, dict]) -> None:
    """Print a one-line summary of current progress."""
    counts: dict[str, int] = {"pending": 0, "submitted": 0, "completed": 0, "failed": 0}
    for entry in progress.values():
        s = entry.get("status", "pending")
        counts[s] = counts.get(s, 0) + 1
    total = sum(counts.values())
    print(
        f"[progress] completed={counts['completed']}  submitted={counts['submitted']}  "
        f"failed={counts['failed']}  remaining={counts['pending']}  total={total}"
    )


# ---------------------------------------------------------------------------
# Async workers
# ---------------------------------------------------------------------------
async def submit_one(
    session: aiohttp.ClientSession,
    entry: dict,
    progress: dict[str, dict],
    headers: dict,
    delay: float,
    semaphore: asyncio.Semaphore,
    dry_run: bool,
) -> None:
    """Submit a single image for I2V generation."""
    path = entry["path"]
    position = entry.get("position", "general")
    lora_config = get_lora_config(position)
    prompt = PROMPT_MAP.get(position, PROMPT_MAP["general"])

    async with semaphore:
        if dry_run:
            hn = len(lora_config.get("high_noise_loras", []))
            ln = len(lora_config.get("low_noise_loras", []))
            print(f"[dry-run] {Path(path).name}  pos={position}  high_noise={hn} low_noise={ln}")
            progress[path]["status"] = "completed"
            progress[path]["videoUrl"] = "(dry-run)"
            save_progress(progress)
            return

        # Encode image
        try:
            data_uri = image_to_data_uri(path)
        except FileNotFoundError:
            progress[path]["status"] = "failed"
            progress[path]["error"] = f"Image file not found: {path}"
            save_progress(progress)
            print(f"[error] Image not found: {path}")
            return

        body: dict[str, Any] = {
            "image": data_uri,
            "prompt": prompt,
            "duration": 5,
        }
        # Add LoRA slots
        if "loras" in lora_config:
            body["loras"] = lora_config["loras"]
        if "high_noise_loras" in lora_config:
            body["high_noise_loras"] = lora_config["high_noise_loras"]
        if "low_noise_loras" in lora_config:
            body["low_noise_loras"] = lora_config["low_noise_loras"]

        # Submit with retry on 429
        for attempt in range(MAX_RETRIES):
            try:
                async with session.post(SUBMIT_URL, json=body, headers=headers) as resp:
                    if resp.status == 429:
                        backoff = RETRY_BASE_DELAY * (2 ** attempt)
                        print(f"[rate-limit] 429 for {Path(path).name}, retry {attempt+1}/{MAX_RETRIES} in {backoff:.0f}s")
                        await asyncio.sleep(backoff)
                        continue
                    resp_data = await resp.json()
                    if resp.status != 200:
                        progress[path]["status"] = "failed"
                        progress[path]["error"] = f"HTTP {resp.status}: {json.dumps(resp_data)}"
                        save_progress(progress)
                        print(f"[error] Submit failed for {Path(path).name}: HTTP {resp.status}")
                        return
                    request_id = resp_data.get("data", {}).get("id") or resp_data.get("id")
                    if not request_id:
                        progress[path]["status"] = "failed"
                        progress[path]["error"] = f"No request ID in response: {json.dumps(resp_data)}"
                        save_progress(progress)
                        print(f"[error] No request ID for {Path(path).name}")
                        return
                    progress[path]["status"] = "submitted"
                    progress[path]["requestId"] = request_id
                    save_progress(progress)
                    print(f"[submitted] {Path(path).name}  pos={position}  id={request_id}")
                    break
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    backoff = RETRY_BASE_DELAY * (2 ** attempt)
                    print(f"[error] Exception for {Path(path).name}: {e}, retry in {backoff:.0f}s")
                    await asyncio.sleep(backoff)
                else:
                    progress[path]["status"] = "failed"
                    progress[path]["error"] = str(e)
                    save_progress(progress)
                    print(f"[error] All retries failed for {Path(path).name}: {e}")
                    return

        # Rate-limit between submissions
        await asyncio.sleep(delay)


async def poll_one(
    session: aiohttp.ClientSession,
    path: str,
    progress: dict[str, dict],
    headers: dict,
) -> bool:
    """Poll a single submitted prediction. Returns True if terminal (completed/failed)."""
    request_id = progress[path].get("requestId")
    if not request_id:
        progress[path]["status"] = "failed"
        progress[path]["error"] = "No requestId to poll"
        save_progress(progress)
        return True

    url = RESULT_URL.format(request_id=request_id)
    try:
        async with session.get(url, headers=headers) as resp:
            if resp.status != 200:
                progress[path].setdefault("poll_errors", 0)
                progress[path]["poll_errors"] += 1
                if progress[path]["poll_errors"] >= 10:
                    progress[path]["status"] = "failed"
                    progress[path]["error"] = f"Too many poll errors (HTTP {resp.status})"
                    save_progress(progress)
                    print(f"[failed] {Path(path).name}: HTTP {resp.status} after 10 retries")
                    return True
                print(f"[warn] Poll HTTP {resp.status} for {Path(path).name}")
                return False
            resp_data = await resp.json()
            status = resp_data.get("data", {}).get("status", "unknown")
            if status == "completed":
                outputs = resp_data.get("data", {}).get("outputs", [])
                progress[path]["status"] = "completed"
                progress[path]["videoUrl"] = outputs[0] if outputs else None
                save_progress(progress)
                print(f"[completed] {Path(path).name}")
                return True
            elif status == "failed":
                progress[path]["status"] = "failed"
                progress[path]["error"] = resp_data.get("data", {}).get("error", "Unknown error")
                save_progress(progress)
                print(f"[failed] {Path(path).name}: {progress[path]['error']}")
                return True
            elif status == "unknown":
                progress[path].setdefault("poll_errors", 0)
                progress[path]["poll_errors"] += 1
                if progress[path]["poll_errors"] >= 10:
                    progress[path]["status"] = "failed"
                    progress[path]["error"] = f"Unknown status after 10 polls"
                    save_progress(progress)
                    print(f"[failed] {Path(path).name}: unknown status after 10 retries")
                    return True
            # still processing
            return False
    except Exception as e:
        progress[path].setdefault("poll_errors", 0)
        progress[path]["poll_errors"] += 1
        if progress[path]["poll_errors"] >= 10:
            progress[path]["status"] = "failed"
            progress[path]["error"] = f"Poll exception after 10 retries: {e}"
            save_progress(progress)
            print(f"[failed] {Path(path).name}: {e} after 10 retries")
            return True
        print(f"[warn] Poll error for {Path(path).name}: {e}")
        return False


async def poll_loop(
    session: aiohttp.ClientSession,
    progress: dict[str, dict],
    headers: dict,
) -> None:
    """Continuously poll all submitted items until none remain."""
    while True:
        submitted = [p for p, e in progress.items() if e["status"] == "submitted"]
        if not submitted:
            break
        print(f"[polling] {len(submitted)} items in flight...")
        tasks = [poll_one(session, p, progress, headers) for p in submitted]
        await asyncio.gather(*tasks)
        still_submitted = [p for p, e in progress.items() if e["status"] == "submitted"]
        if not still_submitted:
            break
        print_stats(progress)
        await asyncio.sleep(POLL_INTERVAL)


# ---------------------------------------------------------------------------
# Post-generation: download → R2 upload → feed-videos.json update
# ---------------------------------------------------------------------------
def _derive_video_key(image_path: str) -> str:
    """Derive R2 object key from source image path.
    e.g. .../twitter/gaizellic/1945940187520884932_1.jpg → gaizellic_1945940187520884932_1
    """
    p = Path(image_path)
    account = p.parent.name
    stem = p.stem  # e.g. 1945940187520884932_1
    return f"{account}_{stem}"


async def post_generation(progress: dict[str, dict], items: list[dict]) -> None:
    """Download completed videos, upload to R2, and update feed-videos.json."""
    GENERATED_DIR.mkdir(exist_ok=True)

    # Build lookup from items for metadata
    items_by_path = {item["path"]: item for item in items}

    # Load existing feed
    feed: list[dict] = []
    if FEED_FILE.exists():
        feed = json.loads(FEED_FILE.read_text())
    existing_urls = {v["videoUrl"] for v in feed}
    next_id = max((int(v["id"]) for v in feed if v["id"].isdigit()), default=0) + 1

    new_entries = []

    async with aiohttp.ClientSession() as session:
        for path, entry in progress.items():
            if entry["status"] != "completed" or not entry.get("videoUrl"):
                continue

            video_key = _derive_video_key(path)
            local_file = GENERATED_DIR / f"{video_key}.mp4"
            r2_url = f"{R2_PUBLIC_URL}/{R2_PREFIX}/{video_key}.mp4"

            # Skip if already in feed
            if r2_url in existing_urls:
                continue

            # Step 1: Download from CloudFront if not already local
            if not local_file.exists():
                cloudfront_url = entry["videoUrl"]
                print(f"[download] {video_key}.mp4 ...")
                try:
                    async with session.get(cloudfront_url) as resp:
                        if resp.status == 200:
                            with open(local_file, "wb") as f:
                                async for chunk in resp.content.iter_chunked(1024 * 1024):
                                    f.write(chunk)
                        else:
                            print(f"[warn] Download failed for {video_key}: HTTP {resp.status}")
                            continue
                except Exception as e:
                    print(f"[warn] Download error for {video_key}: {e}")
                    continue

            # Step 2: Upload to R2
            r2_key = f"{R2_BUCKET}/{R2_PREFIX}/{video_key}.mp4"
            print(f"[r2-upload] {video_key}.mp4 ...")
            try:
                result = subprocess.run(
                    ["wrangler", "r2", "object", "put", r2_key,
                     "--file", str(local_file), "--content-type", "video/mp4", "--remote"],
                    capture_output=True, text=True, timeout=120,
                )
                if result.returncode != 0:
                    print(f"[warn] R2 upload failed for {video_key}: {result.stderr[:200]}")
                    continue
            except Exception as e:
                print(f"[warn] R2 upload error for {video_key}: {e}")
                continue

            # Step 3: Build feed entry
            meta = items_by_path.get(path, {})
            position = meta.get("position", "general")
            account = meta.get("account", Path(path).parent.name)
            likes = meta.get("favorite_count", 0)

            new_entries.append({
                "id": str(next_id),
                "videoUrl": r2_url,
                "title": f"{position.replace('_', ' ').title()} - {account}",
                "creator": account,
                "creatorAvatar": "\U0001f3ac",  # 🎬
                "likes": likes,
                "comments": 0,
                "shares": 0,
                "tags": ["ai", "wan2.2", position],
            })
            next_id += 1
            print(f"[feed] Added {video_key} as id={next_id - 1}")

    if new_entries:
        feed.extend(new_entries)
        tmp_file = FEED_FILE.with_suffix(".json.tmp")
        tmp_file.write_text(json.dumps(feed, indent=2, ensure_ascii=False))
        tmp_file.replace(FEED_FILE)
        print(f"\n[feed] Updated {FEED_FILE.name}: added {len(new_entries)} videos (total: {len(feed)})")

        # Also copy classified data to src for admin page
        if INPUT_FILE.exists():
            CLASSIFIED_SRC.parent.mkdir(parents=True, exist_ok=True)
            import shutil
            shutil.copy2(INPUT_FILE, CLASSIFIED_SRC)
            print(f"[sync] Copied classified data to {CLASSIFIED_SRC}")
    else:
        print("[feed] No new videos to add.")


async def run(concurrency: int, delay: float, dry_run: bool) -> None:
    """Main async entry point."""
    api_key = load_api_key()
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    # Load input
    if not INPUT_FILE.exists():
        print(f"ERROR: Input file not found: {INPUT_FILE}")
        sys.exit(1)
    items: list[dict] = json.loads(INPUT_FILE.read_text())
    print(f"Loaded {len(items)} items from {INPUT_FILE.name}")

    # Load or initialize progress
    progress = load_progress()
    for item in items:
        path = item["path"]
        if path not in progress:
            progress[path] = {
                "path": path,
                "status": "pending",
                "requestId": None,
                "videoUrl": None,
                "error": None,
            }
    # Reset failed items to pending so they get retried
    for path, entry in progress.items():
        if entry["status"] == "failed":
            entry["status"] = "pending"
            entry["error"] = None
    save_progress(progress)
    print_stats(progress)

    semaphore = asyncio.Semaphore(concurrency)

    async with aiohttp.ClientSession() as session:
        # Phase 1: Re-poll any already-submitted items from a previous run
        submitted_from_before = [p for p, e in progress.items() if e["status"] == "submitted"]
        if submitted_from_before:
            print(f"Resuming: re-polling {len(submitted_from_before)} previously submitted items...")
            await poll_loop(session, progress, headers)
            print_stats(progress)

        # Phase 2: Submit all pending items
        pending_items = [item for item in items if progress[item["path"]]["status"] == "pending"]
        if pending_items:
            print(f"Submitting {len(pending_items)} pending items (concurrency={concurrency}, delay={delay}s)...")
            tasks = [
                submit_one(session, item, progress, headers, delay, semaphore, dry_run)
                for item in pending_items
            ]
            await asyncio.gather(*tasks)
            print_stats(progress)

        # Phase 3: Poll all newly submitted items until done
        if not dry_run:
            await poll_loop(session, progress, headers)

    # Final stats
    print("\n=== FINAL RESULTS ===")
    print_stats(progress)
    completed = sum(1 for e in progress.values() if e["status"] == "completed")
    failed = sum(1 for e in progress.values() if e["status"] == "failed")
    if failed:
        print(f"\n{failed} items failed. Re-run to retry them.")
    print(f"Progress saved to {PROGRESS_FILE}")

    # Post-generation: download, upload to R2, update feed
    if not dry_run and completed > 0:
        print("\n=== POST-GENERATION: Download, Upload, Update Feed ===")
        await post_generation(progress, items)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(description="Batch I2V video generation via WaveSpeed API")
    parser.add_argument("--concurrency", type=int, default=3, help="Max parallel requests (default: 3)")
    parser.add_argument("--delay", type=float, default=2.0, help="Delay in seconds between submissions (default: 2.0)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be generated without calling API")
    args = parser.parse_args()

    asyncio.run(run(args.concurrency, args.delay, args.dry_run))


if __name__ == "__main__":
    main()
