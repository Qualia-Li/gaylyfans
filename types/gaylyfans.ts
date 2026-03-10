// Rating types
export interface Variant {
  id: string
  label: string
  videoUrl: string
}

export interface Scenario {
  id: string
  name: string
  sourceImageUrl: string | null
  variants: Variant[]
}

export interface VariantRating {
  variantId: string
  stars: number
}

export interface RatingSubmission {
  scenarioId: string
  visitorId: string
  ratings: VariantRating[]
  bestVariantId: string | null
}

export interface AggregatedVariantResult {
  variantId: string
  label: string
  avgStars: number
  totalRatings: number
  bestPicks: number
}

export interface AggregatedScenarioResult {
  scenarioId: string
  name: string
  sourceImageUrl: string | null
  variants: AggregatedVariantResult[]
  totalSubmissions: number
}

// Feed video type
export interface FeedVideo {
  id: number
  videoUrl: string
  title: string
  creator: string
  creatorAvatar: string
  likes: number
  comments: number
  shares: number
  tags: string[]
  isAiGenerated?: boolean
}

// LoRA preset type
export interface LoraPreset {
  id: string
  name: string
  description: string | null
  loras: { path: string; scale: number }[]
}

// Generation job type
export interface GenerationJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  prompt: string | null
  sourceImageUrl: string | null
  presetId: string | null
  duration: number
  resultVideoUrl: string | null
  creditsCharged: number
  errorMessage: string | null
  createdAt: string
}
