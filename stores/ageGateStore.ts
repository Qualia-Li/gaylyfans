import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AgeGateState {
  verified: boolean
  setVerified: (v: boolean) => void
}

export const useAgeGate = create<AgeGateState>()(
  persist(
    (set) => ({
      verified: false,
      setVerified: (v) => set({ verified: v }),
    }),
    { name: 'ggf-age-gate' }
  )
)
