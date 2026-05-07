'use client'

import { useState } from 'react'
import { Eye, Download, Sparkles, FileText, AlertCircle, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { downloadContent } from '@/lib/api'
import { QuizEditor } from './editors/quiz-editor'
import { PadletEditor } from './editors/padlet-editor'
import { ThingLinkEditor } from './editors/thinglink-editor'
import { SubtitleEditor } from './editors/subtitle-editor'
import { HtmlEditor } from './editors/html-editor'

export function Canvas() {
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  
  const { 
    appState, 
    selectedTask, 
    progress, 
    editorContent, 
    rawOutput,
    error,
    setAppState,
    setEditorContent,
    setRawOutput,
    setError,
  } = useAppStore()

  const handlePreview = () => {
    setAppState('previewing')
  }

  const handleExport = () => {
    if (!rawOutput) return
    
    const extensions: Record<string, string> = {
      quiz: '.html',
      padlet: '.html',
      thinglink: '.html',
      presentations: '.pptx',
      maps: '.pptx',
      subtitles: '.srt',
      karaoke: '.srt',
    }
    
    const ext = selectedTask ? extensions[selectedTask] || '.txt' : '.txt'
    const filename = `output${ext}`
    
    downloadContent(rawOutput, filename)
  }

  const handleCancelClick = () => {
    setShowCancelDialog(true)
  }

  const handleConfirmCancel = () => {
    setEditorContent(null)
    setRawOutput(null)
    setError(null)
    setAppState('idle')
    setShowCancelDialog(false)
  }

  const getTitle = () => {
    if (appState === 'generating') return 'Generazione in corso...'
    if (appState === 'editing' && selectedTask) {
      const titles: Record<string, string> = {
        quiz: 'Editor Quiz',
        padlet: 'Editor Padlet',
        thinglink: 'Editor ThingLink',
        presentations: 'Presentazione',
        maps: 'Mappa Interattiva',
        subtitles: 'Editor Sottotitoli',
        karaoke: 'Editor Karaoke',
      }
      return titles[selectedTask] || 'Editor'
    }
    return 'Canvas'
  }

  const renderEditor = () => {
    if (!editorContent || !selectedTask) return null

    switch (selectedTask) {
      case 'quiz':
        return <QuizEditor />
      case 'padlet':
        return <PadletEditor />
      case 'thinglink':
        return <ThingLinkEditor />
      case 'subtitles':
      case 'karaoke':
        return <SubtitleEditor />
      case 'presentations':
      case 'maps':
        return <HtmlEditor />
      default:
        return null
    }
  }

  return (
    <main className="main-content">
      <header className="content-header">
        <h1 className="content-title">{getTitle()}</h1>
        
        {appState === 'editing' && (
          <div className="content-actions">
            <button className="action-btn action-btn-danger" onClick={handleCancelClick}>
              <X size={18} />
              <span>Annulla</span>
            </button>
            <button className="action-btn action-btn-secondary" onClick={handlePreview}>
              <Eye size={18} />
              <span>Anteprima</span>
            </button>
            <button className="action-btn action-btn-primary" onClick={handleExport}>
              <Download size={18} />
              <span>Esporta</span>
            </button>
          </div>
        )}
      </header>

      <div className="canvas">
        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {appState === 'idle' && !editorContent && (
          <EmptyState />
        )}

        {(appState === 'uploading' || appState === 'generating') && (
          <LoadingState message={progress.message} percent={progress.percent} />
        )}

        {appState === 'editing' && editorContent && (
          <div className="editor-container">
            {renderEditor()}
          </div>
        )}
      </div>

      {showCancelDialog && (
        <CancelDialog 
          onConfirm={handleConfirmCancel}
          onCancel={() => setShowCancelDialog(false)}
        />
      )}
    </main>
  )
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Sparkles size={64} />
      </div>
      <h2 className="empty-state-title">Inizia a creare</h2>
      <p className="empty-state-text">
        Carica un file e seleziona il tipo di output che vuoi generare dalla sidebar
      </p>
    </div>
  )
}

function LoadingState({ message, percent }: { message: string; percent: number }) {
  return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <div className="loading-message">{message || 'Elaborazione...'}</div>
      <div className="progress-bar">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${percent}%` }} 
        />
      </div>
      <div className="progress-percent">{percent}%</div>
    </div>
  )
}

function CancelDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-icon">
          <AlertCircle size={48} />
        </div>
        <h2 className="dialog-title">Annullare la generazione?</h2>
        <p className="dialog-text">
          Il contenuto generato andrà perso e non sarà possibile recuperarlo.
        </p>
        <div className="dialog-actions">
          <button className="dialog-btn dialog-btn-secondary" onClick={onCancel}>
            Continua a modificare
          </button>
          <button className="dialog-btn dialog-btn-danger" onClick={onConfirm}>
            Annulla generazione
          </button>
        </div>
      </div>
    </div>
  )
}
