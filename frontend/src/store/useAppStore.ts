import { create } from 'zustand'
import type { SlideSection } from '@/lib/api'

export type TaskType =
  | 'presentations'
  | 'subtitles'
  | 'karaoke'
  | 'quiz'
  | 'padlet'
  | 'maps'
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
  outputUrl: null as string | null,
  isFirstVisit: typeof window !== 'undefined'
    ? localStorage.getItem('scolastica_visited') !== 'true'
    : true,
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
