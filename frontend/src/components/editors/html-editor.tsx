'use client'

import { useAppStore } from '@/store/useAppStore'
import { FileText } from 'lucide-react'

export function HtmlEditor() {
  const { rawOutput, selectedTask } = useAppStore()

  const title = selectedTask === 'presentations' ? 'Presentazione' : 'Mappa Interattiva'

  return (
    <div className="html-editor">
      <div className="editor-card">
        <div className="editor-card-header">
          <span className="editor-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} style={{ color: '#6366f1' }} />
            {title}
          </span>
        </div>
        <div className="editor-card-content">
          <div style={{ 
            background: '#f8fafc', 
            borderRadius: '8px', 
            padding: '2rem', 
            textAlign: 'center',
            color: '#64748b'
          }}>
            <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>
              File PPTX generato
            </p>
            <p style={{ fontSize: '0.875rem' }}>
              Usa il pulsante "Esporta" per scaricare la presentazione.
            </p>
            <p style={{ fontSize: '0.75rem', marginTop: '1rem', color: '#94a3b8' }}>
              L'anteprima non è disponibile per i file PowerPoint.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
