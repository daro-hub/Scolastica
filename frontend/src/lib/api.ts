const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('files', file)

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
    throw new Error(error.detail || 'Upload failed')
  }

  const data = await response.json()
  
  if (!data.file_ids || data.file_ids.length === 0) {
    throw new Error('No file ID returned from server')
  }
  
  return data.file_ids[0]
}

export async function processFiles(
  fileIds: string[], 
  taskType: string, 
  customPrompt?: string,
  gammaTemplateId?: string,
  exportFormat?: string
): Promise<{ content: string; filename: string; blob?: Blob }> {
  const response = await fetch(`${API_BASE}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task_type: taskType,
      file_ids: fileIds,
      custom_prompt: customPrompt || undefined,
      gamma_template_id: gammaTemplateId || undefined,
      export_format: exportFormat || undefined,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Processing failed' }))
    throw new Error(error.detail || 'Processing failed')
  }

  const data = await response.json()
  
  if (!data.outputs || data.outputs.length === 0) {
    throw new Error('No outputs returned from server')
  }
  
  const outputId = data.outputs[0]?.id
  const outputExt = data.outputs[0]?.extension || ''

  if (!outputId) {
    throw new Error('No output ID in response')
  }

  const downloadResponse = await fetch(`${API_BASE}/download/${outputId}`)
  
  if (!downloadResponse.ok) {
    throw new Error('Failed to download result')
  }

  const isBinary = ['.pptx', '.pdf', '.ppt'].includes(outputExt)
  const contentDisposition = downloadResponse.headers.get('content-disposition')
  const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/)
  const filename = filenameMatch?.[1] || data.outputs[0]?.filename || 'output'

  if (isBinary) {
    const blob = await downloadResponse.blob()
    return { content: '', filename, blob }
  }

  const content = await downloadResponse.text()
  return { content, filename }
}

export function downloadContent(content: string, filename: string, mimeType?: string) {
  const type = mimeType || (filename.endsWith('.html') ? 'text/html' : 'application/octet-stream')
  const blob = new Blob([content], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf': return '📄'
    case 'doc':
    case 'docx': return '📝'
    case 'txt': return '📃'
    case 'mp3':
    case 'wav': return '🎵'
    case 'mp4':
    case 'webm': return '🎬'
    default: return '📎'
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
