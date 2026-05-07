'use client'

import { useState, useEffect } from 'react'
import { Trash2, Edit3, Plus, Check, X, MapPin, Image } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

interface Hotspot {
  id: string
  title: string
  description: string
  deepDive: string
  mediaSuggestion: string
}

export function ThingLinkEditor() {
  const { rawOutput, setRawOutput } = useAppStore()
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (rawOutput) {
      const parsed = parseHotspotsFromHtml(rawOutput)
      setHotspots(parsed)
    }
  }, [])

  const updateHotspot = (id: string, updates: Partial<Hotspot>) => {
    setHotspots(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
  }

  const deleteHotspot = (id: string) => {
    setHotspots(prev => prev.filter(h => h.id !== id))
    regenerateHtml()
  }

  const addHotspot = () => {
    const newHotspot: Hotspot = {
      id: `hotspot-${Date.now()}`,
      title: 'Nuovo Hotspot',
      description: 'Breve descrizione del concetto...',
      deepDive: 'Approfondimento dettagliato...',
      mediaSuggestion: 'Suggerimento per immagine o video...',
    }
    setHotspots(prev => [...prev, newHotspot])
    setEditingId(newHotspot.id)
  }

  const regenerateHtml = () => {
    const html = generateThingLinkHtml(hotspots)
    setRawOutput(html)
  }

  const handleSave = (id: string) => {
    setEditingId(null)
    regenerateHtml()
  }

  return (
    <div className="thinglink-editor">
      {hotspots.map((hotspot, index) => (
        <HotspotCard
          key={hotspot.id}
          hotspot={hotspot}
          index={index}
          isEditing={editingId === hotspot.id}
          onEdit={() => setEditingId(hotspot.id)}
          onSave={() => handleSave(hotspot.id)}
          onCancel={() => setEditingId(null)}
          onUpdate={(updates) => updateHotspot(hotspot.id, updates)}
          onDelete={() => deleteHotspot(hotspot.id)}
        />
      ))}

      <button className="add-item-btn" onClick={addHotspot}>
        <Plus size={18} />
        <span>Aggiungi Hotspot</span>
      </button>
    </div>
  )
}

interface HotspotCardProps {
  hotspot: Hotspot
  index: number
  isEditing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onUpdate: (updates: Partial<Hotspot>) => void
  onDelete: () => void
}

function HotspotCard({ hotspot, index, isEditing, onEdit, onSave, onCancel, onUpdate, onDelete }: HotspotCardProps) {
  const [local, setLocal] = useState(hotspot)

  useEffect(() => {
    setLocal(hotspot)
  }, [hotspot])

  const handleSave = () => {
    onUpdate(local)
    onSave()
  }

  const updateLocal = (field: keyof Hotspot, value: string) => {
    setLocal(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="editor-card">
      <div className="editor-card-header">
        <span className="editor-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={16} style={{ color: '#14b8a6' }} />
          Hotspot {index + 1}
        </span>
        <div className="editor-card-actions">
          {isEditing ? (
            <>
              <button className="editor-card-btn" onClick={handleSave} title="Salva">
                <Check size={16} />
              </button>
              <button className="editor-card-btn" onClick={onCancel} title="Annulla">
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <button className="editor-card-btn" onClick={onEdit} title="Modifica">
                <Edit3 size={16} />
              </button>
              <button className="editor-card-btn danger" onClick={onDelete} title="Elimina">
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="editor-card-content">
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>
                Titolo
              </label>
              <input
                className="editor-input"
                value={local.title}
                onChange={(e) => updateLocal('title', e.target.value)}
                placeholder="Titolo breve (2-5 parole)..."
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>
                Descrizione
              </label>
              <textarea
                className="editor-input editor-textarea"
                value={local.description}
                onChange={(e) => updateLocal('description', e.target.value)}
                placeholder="Breve descrizione (1-2 frasi)..."
                style={{ minHeight: '60px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>
                Approfondimento
              </label>
              <textarea
                className="editor-input editor-textarea"
                value={local.deepDive}
                onChange={(e) => updateLocal('deepDive', e.target.value)}
                placeholder="Informazioni dettagliate..."
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>
                Suggerimento Media
              </label>
              <input
                className="editor-input"
                value={local.mediaSuggestion}
                onChange={(e) => updateLocal('mediaSuggestion', e.target.value)}
                placeholder="Tipo di immagine/video consigliato..."
              />
            </div>
          </div>
        ) : (
          <>
            <h3 style={{ color: '#14b8a6', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📍 {hotspot.title}
            </h3>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Descrizione:</strong> {hotspot.description}
            </p>
            <p style={{ marginBottom: '0.75rem', color: '#64748b' }}>
              <strong>Approfondimento:</strong> {hotspot.deepDive}
            </p>
            <div style={{ 
              background: '#fff3e0', 
              borderRadius: '8px', 
              padding: '0.75rem 1rem', 
              fontSize: '0.875rem',
              color: '#e65100',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Image size={16} />
              {hotspot.mediaSuggestion}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function parseHotspotsFromHtml(html: string): Hotspot[] {
  const hotspots: Hotspot[] = []
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  doc.querySelectorAll('.hotspot').forEach((el, index) => {
    const title = el.querySelector('h3')?.textContent?.replace('📍 ', '') || 'Hotspot'
    const paragraphs = el.querySelectorAll('p')
    
    let description = ''
    let deepDive = ''
    
    paragraphs.forEach(p => {
      const text = p.textContent || ''
      if (text.includes('Descrizione:')) {
        description = text.replace('Descrizione:', '').trim()
      } else if (text.includes('Approfondimento:')) {
        deepDive = text.replace('Approfondimento:', '').trim()
      }
    })

    const mediaSuggestion = el.querySelector('.media-suggestion')?.textContent || ''

    hotspots.push({
      id: `hotspot-${index}`,
      title,
      description,
      deepDive,
      mediaSuggestion,
    })
  })

  return hotspots.length > 0 ? hotspots : [
    { 
      id: 'hotspot-1', 
      title: 'Esempio', 
      description: 'Descrizione di esempio', 
      deepDive: 'Approfondimento di esempio',
      mediaSuggestion: 'Immagine illustrativa'
    }
  ]
}

function generateThingLinkHtml(hotspots: Hotspot[]): string {
  let content = ''

  hotspots.forEach(hotspot => {
    content += `<div class="hotspot">
    <h3>📍 ${hotspot.title}</h3>
    <p><strong>Descrizione:</strong> ${hotspot.description}</p>
    <p><strong>Approfondimento:</strong> ${hotspot.deepDive}</p>
    <div class="media-suggestion">🎬 ${hotspot.mediaSuggestion}</div>
</div>\n`
  })

  return `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ThingLink</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 2rem; }
        .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }
        .header { background: #14b8a6; color: white; padding: 2rem; text-align: center; }
        .header h1 { font-size: 2rem; }
        .content { padding: 2rem; }
        .hotspot { background: linear-gradient(135deg, #fff 0%, #f5f5f5 100%); border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; border: 1px solid #e0e0e0; border-left: 4px solid #14b8a6; }
        .hotspot h3 { color: #14b8a6; margin-bottom: 0.75rem; }
        .hotspot p { margin-bottom: 0.5rem; }
        .media-suggestion { background: #fff3e0; border-radius: 8px; padding: 0.75rem 1rem; margin-top: 1rem; font-size: 0.9rem; color: #e65100; }
        .footer { text-align: center; padding: 1.5rem; background: #f5f5f5; color: #888; font-size: 0.85rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>🎯 ThingLink</h1></div>
        <div class="content">${content}</div>
        <div class="footer">Generato con Scolastica</div>
    </div>
</body>
</html>`
}
