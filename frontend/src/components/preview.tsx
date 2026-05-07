'use client'

import { X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export function Preview() {
  const { rawOutput, setAppState } = useAppStore()

  const handleClose = () => {
    setAppState('editing')
  }

  if (!rawOutput) return null

  return (
    <div className="preview-overlay" onClick={handleClose}>
      <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <h2 className="preview-title">Anteprima</h2>
          <button className="preview-close" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>
        <div className="preview-content">
          <iframe
            className="preview-iframe"
            srcDoc={rawOutput}
            title="Preview"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  )
}
