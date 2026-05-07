'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import { 
  Sparkles, 
  ChevronLeft,
  ChevronRight,
  Upload, 
  MessageSquare,
  ClipboardList,
  Layout,
  MapPin,
  Presentation,
  Map,
  Subtitles,
  Mic,
  X,
  Plus
} from 'lucide-react'
import { useAppStore, TaskType, ExportFormat } from '@/store/useAppStore'
import { uploadFile, processFiles, getFileIcon, formatFileSize } from '@/lib/api'

const TASKS: { value: TaskType; label: string; icon: React.ReactNode; badge: string }[] = [
  { value: 'quiz', label: 'Quiz', icon: <ClipboardList size={18} />, badge: 'HTML' },
  { value: 'padlet', label: 'Padlet', icon: <Layout size={18} />, badge: 'HTML' },
  { value: 'thinglink', label: 'ThingLink', icon: <MapPin size={18} />, badge: 'HTML' },
  { value: 'presentations', label: 'Presentazione', icon: <Presentation size={18} />, badge: 'PPTX' },
  { value: 'maps', label: 'Mappa Interattiva', icon: <Map size={18} />, badge: 'PPTX' },
  { value: 'subtitles', label: 'Sottotitoli', icon: <Subtitles size={18} />, badge: 'SRT' },
  { value: 'karaoke', label: 'Karaoke', icon: <Mic size={18} />, badge: 'SRT' },
]

export function Sidebar() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  
  const {
    appState,
    selectedTask,
    uploadedFiles,
    customPrompt,
    gammaTemplateId,
    exportFormat,
    sidebarExpanded,
    editorContent,
    setSelectedTask,
    addFile,
    updateFileId,
    removeFile,
    setCustomPrompt,
    setGammaTemplateId,
    setExportFormat,
    setAppState,
    setProgress,
    setEditorContent,
    setRawOutput,
    setError,
    setSidebarExpanded,
  } = useAppStore()

  const isGenerating = appState === 'generating' || appState === 'uploading'
  const isEditing = appState === 'editing'
  const isLocked = isGenerating || isEditing
  const hasValidFiles = uploadedFiles.length > 0 && uploadedFiles.every(f => f.fileId !== null)
  const needsGammaTemplate = selectedTask === 'presentations' || selectedTask === 'maps'
  const canGenerate = hasValidFiles && selectedTask && !isLocked && (!needsGammaTemplate || gammaTemplateId.trim() !== '')

  // Auto-collapse sidebar when generation starts, expand when idle with no content
  useEffect(() => {
    if (isGenerating || isEditing) {
      setSidebarExpanded(false)
    } else if (appState === 'idle' && !editorContent) {
      setSidebarExpanded(true)
    }
  }, [appState, isGenerating, isEditing, editorContent, setSidebarExpanded])

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    
    for (const file of fileArray) {
      const id = addFile(file)
      
      try {
        const fileId = await uploadFile(file)
        updateFileId(id, fileId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore durante il caricamento')
        removeFile(id)
      }
    }
  }, [addFile, updateFileId, removeFile, setError])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    if (e.dataTransfer.files.length > 0 && !isLocked) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [handleFileSelect, isLocked])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isLocked) setIsDragOver(true)
  }, [isLocked])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleGenerate = useCallback(async () => {
    const fileIds = uploadedFiles.map(f => f.fileId).filter((id): id is string => id !== null)
    if (fileIds.length === 0 || !selectedTask) return

    setError(null)
    setAppState('generating')
    setProgress({ percent: 0, message: 'Avvio generazione...' })

    try {
      const progressMessages = [
        { percent: 20, message: 'Estrazione contenuto dal documento...' },
        { percent: 40, message: 'Analisi del testo...' },
        { percent: 60, message: 'Generazione contenuti con AI...' },
        { percent: 80, message: 'Formattazione output...' },
      ]

      let messageIndex = 0
      const progressInterval = setInterval(() => {
        if (messageIndex < progressMessages.length) {
          setProgress(progressMessages[messageIndex])
          messageIndex++
        }
      }, 1500)

      const result = await processFiles(fileIds, selectedTask, customPrompt, needsGammaTemplate ? gammaTemplateId.trim() : undefined, needsGammaTemplate ? exportFormat : undefined)
      
      clearInterval(progressInterval)
      setProgress({ percent: 100, message: 'Completato!' })
      
      if (needsGammaTemplate) {
        // Binary file (PPTX/PDF) — trigger direct download
        if (result.blob) {
          const url = URL.createObjectURL(result.blob)
          const a = document.createElement('a')
          a.href = url
          a.download = result.filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
        setAppState('idle')
      } else {
        setRawOutput(result.content || '')
        
        if (selectedTask === 'quiz' || selectedTask === 'padlet' || selectedTask === 'thinglink') {
          setEditorContent({ type: selectedTask, htmlContent: result.content } as any)
        } else if (selectedTask === 'subtitles' || selectedTask === 'karaoke') {
          setEditorContent({ type: selectedTask, entries: parseSrt(result.content || '') })
        } else {
          setEditorContent({ type: selectedTask, htmlContent: result.content } as any)
        }
        
        setAppState('editing')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la generazione')
      setAppState('idle')
    }
  }, [uploadedFiles, selectedTask, customPrompt, setAppState, setError, setProgress, setRawOutput, setEditorContent])

  return (
    <aside className={`sidebar ${sidebarExpanded ? 'expanded' : ''} ${isLocked ? 'locked' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Sparkles size={22} />
          <span>Scolastica</span>
        </div>
        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          title={sidebarExpanded ? 'Comprimi' : 'Espandi'}
        >
          {sidebarExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <div className="sidebar-content">
        {isEditing && (
          <div className="sidebar-locked-notice">
            <span>Revisione in corso</span>
            <p>Annulla la generazione per modificare</p>
          </div>
        )}

        {/* Files Section */}
        <div 
          className={`sidebar-section sidebar-dropzone ${isDragOver ? 'dragover' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="sidebar-section-title">
            <Upload size={14} />
            <span>File</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.mp3,.wav,.mp4,.webm"
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            style={{ display: 'none' }}
            multiple
          />

          <div className="sidebar-files">
            {uploadedFiles.map((uploadedFile) => (
              <div key={uploadedFile.id} className="sidebar-file-card">
                <div className="sidebar-file-icon">
                  {uploadedFile.fileId === null ? (
                    <div className="sidebar-file-spinner" />
                  ) : (
                    <span>{getFileIcon(uploadedFile.file.name)}</span>
                  )}
                </div>
                <div className="sidebar-file-info">
                  <div className="sidebar-file-name">{uploadedFile.file.name}</div>
                  <div className="sidebar-file-size">{formatFileSize(uploadedFile.file.size)}</div>
                </div>
                <button 
                  className="sidebar-file-remove"
                  onClick={() => removeFile(uploadedFile.id)}
                  disabled={isLocked}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            
            <button
              className="sidebar-file-add"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLocked}
            >
              <Plus size={16} />
              <span>{isDragOver ? 'Rilascia qui' : 'Aggiungi file'}</span>
            </button>
          </div>
        </div>

        {/* Prompt Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">
            <MessageSquare size={14} />
            <span>Istruzioni aggiuntive</span>
          </div>
          <textarea
            className="prompt-input"
            placeholder="Es: Concentrati sul capitolo 3, usa un linguaggio semplice..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            disabled={isLocked}
          />
        </div>

        {/* Gamma Template ID Section */}
        {needsGammaTemplate && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">
              <Presentation size={14} />
              <span>Gamma Template ID</span>
            </div>
            <input
              type="text"
              className="prompt-input"
              placeholder="Es: g_abcdef123456ghi"
              value={gammaTemplateId}
              onChange={(e) => setGammaTemplateId(e.target.value)}
              disabled={isLocked}
            />
            <div className="sidebar-section-title" style={{ marginTop: '12px' }}>
              <span>Formato esportazione</span>
            </div>
            <div className="sidebar-format-toggle">
              <button
                className={`sidebar-format-btn ${exportFormat === 'pptx' ? 'active' : ''}`}
                onClick={() => setExportFormat('pptx')}
                disabled={isLocked}
              >
                PPTX
              </button>
              <button
                className={`sidebar-format-btn ${exportFormat === 'pdf' ? 'active' : ''}`}
                onClick={() => setExportFormat('pdf')}
                disabled={isLocked}
              >
                PDF
              </button>
            </div>
          </div>
        )}

        <div className="sidebar-divider" />

        {/* Task Selection */}
        <div className="sidebar-section sidebar-task-section">
          <div className="sidebar-section-title">
            <Sparkles size={14} />
            <span>Tipo di output</span>
          </div>

          <div className="sidebar-task-grid">
            {TASKS.map((task) => (
              <button
                key={task.value}
                className={`sidebar-task-card ${selectedTask === task.value ? 'selected' : ''}`}
                onClick={() => setSelectedTask(task.value)}
                disabled={isLocked}
              >
                <div className="sidebar-task-card-icon">{task.icon}</div>
                <div className="sidebar-task-card-content">
                  <span className="sidebar-task-card-label">{task.label}</span>
                </div>
                <span className="sidebar-task-card-badge">{task.badge}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={!canGenerate}
        >
          <Sparkles size={18} />
          <span>Genera</span>
        </button>
      </div>
    </aside>
  )
}

function parseSrt(srtContent: string): any[] {
  const blocks = srtContent.trim().split(/\n\n+/)
  const entries: any[] = []

  for (const block of blocks) {
    const lines = block.split('\n')
    if (lines.length < 3) continue

    const index = parseInt(lines[0], 10)
    const timeLine = lines[1]
    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/)
    
    if (!timeMatch) continue

    const text = lines.slice(2).join('\n')
    const speakerMatch = text.match(/^\[([^\]]+)\]:\s*(.*)$/s)

    entries.push({
      id: `entry-${index}`,
      index,
      startTime: timeMatch[1],
      endTime: timeMatch[2],
      text: speakerMatch ? speakerMatch[2] : text,
      speaker: speakerMatch ? speakerMatch[1] : undefined,
    })
  }

  return entries
}
