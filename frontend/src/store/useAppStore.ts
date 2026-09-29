import { create } from 'zustand'
import type { ImageSearchResult, SlideSection } from '@/lib/api'

export type TaskType =
  | 'presentations'
  | 'subtitles'
  | 'karaoke'
  | 'quiz'
  | 'padlet'
  | 'thinglink'

export type GenerationStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'variants_ready'
  | 'building'
  | 'complete'
  | 'error'

interface AppStore {
  currentStep: 1 | 2 | 3 | 4
  sourceFile: File | null
  masterFile: File | null
  taskType: TaskType | null
  customPrompt: string
  generationStatus: GenerationStatus
  generationId: string | null
  sections: SlideSection[]
  selectedVariants: Record<number, number>
  // Keyed by `${sectionIndex}:${placeholderIdx}` — a section's chosen
  // variant may have more than one image placeholder in principle, so
  // the key can't be just the section index.
  imageSelections: Record<string, ImageSearchResult>
  outputUrl: string | null
  isFirstVisit: boolean
  error: string | null
  progress: { percent: number; message: string }

  setStep: (step: 1 | 2 | 3 | 4) => void
  setSourceFile: (file: File | null) => void
  setMasterFile: (file: File | null) => void
  setTaskType: (type: TaskType | null) => void
  setCustomPrompt: (prompt: string) => void
  setGenerationStatus: (status: GenerationStatus) => void
  setGenerationId: (id: string | null) => void
  setSections: (sections: SlideSection[]) => void
  selectVariant: (sectionIndex: number, variantIndex: number) => void
  setImageSelection: (sectionIndex: number, placeholderIdx: number, image: ImageSearchResult) => void
  setOutputUrl: (url: string | null) => void
  setIsFirstVisit: (value: boolean) => void
  setError: (error: string | null) => void
  setProgress: (progress: { percent: number; message: string }) => void
  reset: () => void
}

const initialState = {
  currentStep: 1 as const,
  sourceFile: null as File | null,
  masterFile: null as File | null,
  taskType: null as TaskType | null,
  customPrompt: '',
  generationStatus: 'idle' as GenerationStatus,
  generationId: null as string | null,
  sections: [] as SlideSection[],
  selectedVariants: {} as Record<number, number>,
  imageSelections: {} as Record<string, ImageSearchResult>,
  outputUrl: null as string | null,
  // Always true here, matching what the static export's server-rendered
  // HTML sees (no `window`). Reading localStorage at module-eval time
  // used to give the client a different value than the pre-rendered
  // HTML for any returning visitor, which is a hydration mismatch — the
  // same AMUSEAPP-WEBAPP-8 pattern (state read from localStorage/
  // sessionStorage/matchMedia outside a useEffect). OnboardingTour
  // corrects this after mount, in a useEffect, once hydration is done.
  isFirstVisit: true,
  error: null as string | null,
  progress: { percent: 0, message: '' },
}

export const useAppStore = create<AppStore>((set) => ({
  ...initialState,

  setStep: (currentStep) => set({ currentStep }),
  setSourceFile: (sourceFile) => set({ sourceFile }),
  setMasterFile: (masterFile) => set({ masterFile }),
  setTaskType: (taskType) => set({ taskType }),
  setCustomPrompt: (customPrompt) => set({ customPrompt }),
  setGenerationStatus: (generationStatus) => set({ generationStatus }),
  setGenerationId: (generationId) => set({ generationId }),
  setSections: (sections) => set({ sections }),
  selectVariant: (sectionIndex, variantIndex) =>
    set((state) => ({
      selectedVariants: { ...state.selectedVariants, [sectionIndex]: variantIndex },
    })),
  setImageSelection: (sectionIndex, placeholderIdx, image) =>
    set((state) => ({
      imageSelections: { ...state.imageSelections, [`${sectionIndex}:${placeholderIdx}`]: image },
    })),
  setOutputUrl: (outputUrl) => set({ outputUrl }),
  setIsFirstVisit: (isFirstVisit) => {
    if (!isFirstVisit && typeof window !== 'undefined') {
      localStorage.setItem('scolastica_visited', 'true')
    }
    set({ isFirstVisit })
  },
  setError: (error) => set({ error }),
  setProgress: (progress) => set({ progress }),
  reset: () => set({ ...initialState, isFirstVisit: false }),
}))
