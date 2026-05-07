import { create } from 'zustand'

export type ExportFormat = 'pptx' | 'pdf'

export type TaskType = 
  | 'quiz' 
  | 'padlet' 
  | 'thinglink' 
  | 'presentations' 
  | 'maps' 
  | 'subtitles' 
  | 'karaoke'

export type AppState = 'idle' | 'uploading' | 'generating' | 'editing' | 'previewing'

export interface UploadedFile {
  id: string
  file: File
  fileId: string | null
}

export interface QuizQuestion {
  id: string
  type: 'true_false' | 'multiple_choice'
  question: string
  options?: string[]
  correctAnswer: string | boolean | number
}

export interface PadletCard {
  id: string
  type: 'summary' | 'concept' | 'resource' | 'exercise'
  title: string
  content: string
}

export interface ThingLinkHotspot {
  id: string
  title: string
  description: string
  deepDive: string
  mediaSuggestion: string
}

export interface SubtitleEntry {
  id: string
  index: number
  startTime: string
  endTime: string
  text: string
  speaker?: string
}

export type EditorContent = 
  | { type: 'quiz'; questions: QuizQuestion[] }
  | { type: 'padlet'; cards: PadletCard[] }
  | { type: 'thinglink'; hotspots: ThingLinkHotspot[] }
  | { type: 'subtitles' | 'karaoke'; entries: SubtitleEntry[] }
  | { type: 'presentations' | 'maps'; htmlContent: string }
  | null

interface ProgressState {
  percent: number
  message: string
}

interface AppStore {
  // State
  appState: AppState
  selectedTask: TaskType | null
  uploadedFiles: UploadedFile[]
  customPrompt: string
  gammaTemplateId: string
  exportFormat: ExportFormat
  progress: ProgressState
  editorContent: EditorContent
  rawOutput: string | null
  error: string | null
  sidebarExpanded: boolean
  hasStartedGeneration: boolean

  // Actions
  setAppState: (state: AppState) => void
  setSelectedTask: (task: TaskType | null) => void
  addFile: (file: File) => string
  updateFileId: (id: string, fileId: string) => void
  removeFile: (id: string) => void
  setCustomPrompt: (prompt: string) => void
  setGammaTemplateId: (id: string) => void
  setExportFormat: (format: ExportFormat) => void
  setProgress: (progress: ProgressState) => void
  setEditorContent: (content: EditorContent) => void
  setRawOutput: (output: string | null) => void
  setError: (error: string | null) => void
  setSidebarExpanded: (expanded: boolean) => void
  setHasStartedGeneration: (started: boolean) => void
  reset: () => void
}

const initialState = {
  appState: 'idle' as AppState,
  selectedTask: null as TaskType | null,
  uploadedFiles: [] as UploadedFile[],
  customPrompt: '',
  gammaTemplateId: 'g_dekycmq6z00ar72',
  exportFormat: 'pptx' as ExportFormat,
  progress: { percent: 0, message: '' },
  editorContent: null as EditorContent,
  rawOutput: null as string | null,
  error: null as string | null,
  sidebarExpanded: true,
  hasStartedGeneration: false,
}

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,

  setAppState: (appState) => set({ appState }),
  setSelectedTask: (selectedTask) => set({ selectedTask }),
  
  addFile: (file) => {
    const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    set((state) => ({
      uploadedFiles: [...state.uploadedFiles, { id, file, fileId: null }]
    }))
    return id
  },
  
  updateFileId: (id, fileId) => {
    set((state) => ({
      uploadedFiles: state.uploadedFiles.map(f => 
        f.id === id ? { ...f, fileId } : f
      )
    }))
  },
  
  removeFile: (id) => {
    set((state) => ({
      uploadedFiles: state.uploadedFiles.filter(f => f.id !== id)
    }))
  },
  
  setCustomPrompt: (customPrompt) => set({ customPrompt }),
  setGammaTemplateId: (gammaTemplateId) => set({ gammaTemplateId }),
  setExportFormat: (exportFormat) => set({ exportFormat }),
  setProgress: (progress) => set({ progress }),
  setEditorContent: (editorContent) => set({ editorContent }),
  setRawOutput: (rawOutput) => set({ rawOutput }),
  setError: (error) => set({ error }),
  setSidebarExpanded: (sidebarExpanded) => set({ sidebarExpanded }),
  setHasStartedGeneration: (hasStartedGeneration) => set({ hasStartedGeneration }),
  reset: () => set(initialState),
}))
