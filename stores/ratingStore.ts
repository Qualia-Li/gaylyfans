import { create } from 'zustand'

interface RatingState {
  ratings: Record<string, number> // variantId -> stars
  bestVariantId: string | null
  submitted: boolean
  setRating: (variantId: string, stars: number) => void
  setBest: (variantId: string | null) => void
  setSubmitted: (v: boolean) => void
  reset: () => void
}

export const useRatingStore = create<RatingState>()((set) => ({
  ratings: {},
  bestVariantId: null,
  submitted: false,
  setRating: (variantId, stars) =>
    set((state) => ({
      ratings: { ...state.ratings, [variantId]: stars },
    })),
  setBest: (variantId) => set({ bestVariantId: variantId }),
  setSubmitted: (v) => set({ submitted: v }),
  reset: () => set({ ratings: {}, bestVariantId: null, submitted: false }),
}))
