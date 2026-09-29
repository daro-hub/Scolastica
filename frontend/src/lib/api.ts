const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

/**
 * Every backend-relative path (thumbnail URLs, download URLs) goes
 * through this so there's exactly one place that decides the API's
 * origin. Before this existed, page.tsx had its own hardcoded
 * `http://localhost:8000` fallback for the download link while
 * VariantSelector's thumbnails used a separate `apiBase=""` prop passed
 * down from the same page — two different fallbacks for the same
 * problem, out of sync with each other and wrong for any deploy where
 * NEXT_PUBLIC_API_URL isn't set to something reachable from the browser.
 */
export function resolveApiUrl(path: string): string {
  if (!path) return path
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE}${path}`
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const pw = sessionStorage.getItem('scolastica_password') || ''
  return pw ? { 'x-app-password': pw } : {}
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const error = await response.json().catch(() => ({ detail: fallback }))
  return error.detail || fallback
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

  const response = await fetch(resolveApiUrl('/upload'), {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Errore durante il caricamento dei file'))
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
  const response = await fetch(resolveApiUrl('/v2/projects'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      name,
      master_file_id: masterFileId || undefined,
    }),
  })

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Errore nella creazione del progetto'))
  }

  const data = await response.json()
  return {
    projectId: data.project_id,
    masterLayouts: data.master_layouts,
  }
}

export interface GroundingInfo {
  score: number
  grounded: boolean
  flagged_idx: string[]
}

export interface SlideVariant {
  variant_index: number
  slide_index: number
  layout_name: string
  design_rationale: string
  thumbnail_url: string
  image_placeholder_idx: number | string | null
  grounding: GroundingInfo | null
}

export interface SlideSection {
  section_index: number
  heading: string
  variants: SlideVariant[]
}

export interface StartGenerationResult {
  generationId: string
  status: string
}

export async function startGeneration(
  projectId: string,
  taskType: string,
  sourceFileIds: string[],
  prompt?: string
): Promise<StartGenerationResult> {
  const response = await fetch(resolveApiUrl(`/v2/projects/${projectId}/generate`), {
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
    throw new Error(await parseErrorDetail(response, "Errore nell'avvio della generazione"))
  }

  const data = await response.json()
  return { generationId: data.generation_id, status: data.status }
}

export interface GenerationPollResult {
  generationId: string
  status: 'queued' | 'processing' | 'extracting' | 'planning' | 'grounding' | 'rendering' | 'variants_ready' | 'building' | 'completed' | 'failed'
  step: string | null
  percent: number
  error: string | null
  sections?: SlideSection[]
  outputUrl?: string
}

/** Polls GET /v2/generations/{id} — this endpoint didn't used to exist:
 * the whole pipeline ran inline in the generate request and the
 * frontend just displayed made-up progress percentages while waiting. */
export async function pollGeneration(generationId: string): Promise<GenerationPollResult> {
  const response = await fetch(resolveApiUrl(`/v2/generations/${generationId}`), {
    headers: { ...getAuthHeaders() },
  })

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Errore nel recupero dello stato della generazione'))
  }

  const data = await response.json()
  return {
    generationId: data.generation_id,
    status: data.status,
    step: data.step,
    percent: data.percent ?? 0,
    error: data.error,
    sections: data.sections,
    outputUrl: data.output_url,
  }
}

export async function buildFinal(
  generationId: string,
  variantSelections: Record<string, number>,
  imageSelections?: Record<string, string>
): Promise<string> {
  const response = await fetch(resolveApiUrl(`/v2/generations/${generationId}/build`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      variant_selections: variantSelections,
      image_selections: imageSelections || undefined,
    }),
  })

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Errore nella creazione del file finale'))
  }

  const data = await response.json()
  return resolveApiUrl(data.output_url)
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

  const response = await fetch(resolveApiUrl(`/v2/images/search?${params}`), {
    headers: { ...getAuthHeaders() },
  })

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Errore nella ricerca immagini'))
  }

  const data = await response.json()

  const results: ImageSearchResult[] = (data.images || []).map((img: Record<string, unknown>) => ({
    id: img.id as string,
    url: (img.download_url || img.preview_url || img.url) as string,
    thumbnailUrl: (img.preview_url || img.url) as string,
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
