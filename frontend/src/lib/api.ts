import { createClient } from '@supabase/supabase-js'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '' : 'http://localhost:8000')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const pw = sessionStorage.getItem('scolastica_password') || ''
  return pw ? { 'x-app-password': pw } : {}
}

export async function uploadFiles(
  sourceFile: File,
  masterFile?: File | null
): Promise<{ sourceFileId: string; masterFileId?: string }> {
  const formData = new FormData()
  formData.append('files', sourceFile)
  if (masterFile) {
    formData.append('files', masterFile)
  }

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Errore durante il caricamento dei file' }))
    throw new Error(error.detail || 'Errore durante il caricamento dei file')
  }

  const data = await response.json()
  const fileIds: string[] = data.file_ids

  return {
    sourceFileId: fileIds[0],
    masterFileId: fileIds.length > 1 ? fileIds[1] : undefined,
  }
}

export async function createProject(
  name: string,
  masterFileId?: string
): Promise<{ projectId: string; masterLayouts: unknown }> {
  const response = await fetch(`${API_BASE}/v2/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      name,
      master_file_id: masterFileId || undefined,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Errore nella creazione del progetto' }))
    throw new Error(error.detail || 'Errore nella creazione del progetto')
  }

  const data = await response.json()
  return {
    projectId: data.project_id,
    masterLayouts: data.master_layouts,
  }
}

export interface SlideVariant {
  variant_index: number
  slide_index: number
  layout_name: string
  design_rationale: string
  thumbnail_url: string
}

export interface SlideSection {
  section_index: number
  heading: string
  variants: SlideVariant[]
}

export interface GenerationResult {
  generationId: string
  status: 'variants_ready' | 'completed' | 'failed'
  sections?: SlideSection[]
  output?: { id: string; filename: string; extension: string }
  error?: string
}

export async function startGeneration(
  projectId: string,
  taskType: string,
  sourceFileIds: string[],
  prompt?: string
): Promise<GenerationResult> {
  const response = await fetch(`${API_BASE}/v2/projects/${projectId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      task_type: taskType,
      source_file_ids: sourceFileIds,
      custom_prompt: prompt || undefined,
      num_variants: 5,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Errore nell\'avvio della generazione' }))
    throw new Error(error.detail || 'Errore nell\'avvio della generazione')
  }

  const data = await response.json()
  return {
    generationId: data.generation_id,
    status: data.status,
    sections: data.sections,
    output: data.output,
    error: data.error,
  }
}

export async function buildFinal(
  generationId: string,
  imageSelections?: Record<string, string>
): Promise<string> {
  const response = await fetch(`${API_BASE}/v2/generations/${generationId}/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      image_selections: imageSelections || undefined,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Errore nella creazione del file finale' }))
    throw new Error(error.detail || 'Errore nella creazione del file finale')
  }

  const data = await response.json()
  return data.output_url || `${API_BASE}/download/${data.generation_id}`
}

export interface ImageSearchResult {
  id: string
  url: string
  thumbnailUrl: string
  description: string
  source: string
}

export async function searchImages(
  query: string,
  page: number = 1
): Promise<{ results: ImageSearchResult[]; totalPages: number }> {
  const params = new URLSearchParams({
    query,
    page: String(page),
    page_size: '20',
  })

  const response = await fetch(`${API_BASE}/v2/images/search?${params}`, {
    headers: { ...getAuthHeaders() },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Errore nella ricerca immagini' }))
    throw new Error(error.detail || 'Errore nella ricerca immagini')
  }

  const data = await response.json()

  const results: ImageSearchResult[] = (data.images || []).map((img: Record<string, unknown>) => ({
    id: img.id as string,
    url: (img.preview_url || img.url) as string,
    thumbnailUrl: (img.thumbnail_url || img.preview_url || img.url) as string,
    description: (img.title || img.description || '') as string,
    source: (img.source || 'unsplash') as string,
  }))

  return {
    results,
    totalPages: Math.ceil((data.result_count || results.length) / 20),
  }
}

export function downloadFromUrl(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
