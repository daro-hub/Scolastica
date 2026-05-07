'use client'

import { useState, useEffect } from 'react'
import { Trash2, Edit3, Plus, Check, X, FileText, BookOpen, Dumbbell, Link } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

interface PadletCard {
  id: string
  type: 'summary' | 'concept' | 'resource' | 'exercise'
  title: string
  content: string
}

const CARD_TYPES = {
  summary: { label: 'Riepilogo', icon: FileText, color: '#ec4899' },
  concept: { label: 'Concetto', icon: BookOpen, color: '#8b5cf6' },
  resource: { label: 'Risorsa', icon: Link, color: '#06b6d4' },
  exercise: { label: 'Esercizio', icon: Dumbbell, color: '#10b981' },
}

export function PadletEditor() {
  const { rawOutput, setRawOutput } = useAppStore()
  const [cards, setCards] = useState<PadletCard[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (rawOutput) {
      const parsed = parsePadletFromHtml(rawOutput)
      setCards(parsed)
    }
  }, [])

  const updateCard = (id: string, updates: Partial<PadletCard>) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  const deleteCard = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id))
    regenerateHtml()
  }

  const addCard = (type: PadletCard['type']) => {
    const newCard: PadletCard = {
      id: `card-${Date.now()}`,
      type,
      title: `Nuovo ${CARD_TYPES[type].label}`,
      content: 'Clicca per modificare il contenuto...',
    }
    setCards(prev => [...prev, newCard])
    setEditingId(newCard.id)
  }

  const regenerateHtml = () => {
    const html = generatePadletHtml(cards)
    setRawOutput(html)
  }

  const handleSave = (id: string) => {
    setEditingId(null)
    regenerateHtml()
  }

  return (
    <div className="padlet-editor">
      {cards.map((card) => (
        <CardEditor
          key={card.id}
          card={card}
          isEditing={editingId === card.id}
          onEdit={() => setEditingId(card.id)}
          onSave={() => handleSave(card.id)}
          onCancel={() => setEditingId(null)}
          onUpdate={(updates) => updateCard(card.id, updates)}
          onDelete={() => deleteCard(card.id)}
        />
      ))}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '1rem' }}>
        {(Object.keys(CARD_TYPES) as Array<keyof typeof CARD_TYPES>).map((type) => {
          const { label, icon: Icon, color } = CARD_TYPES[type]
          return (
            <button
              key={type}
              className="add-item-btn"
              onClick={() => addCard(type)}
              style={{ borderColor: color }}
            >
              <Icon size={18} style={{ color }} />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface CardEditorProps {
  card: PadletCard
  isEditing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onUpdate: (updates: Partial<PadletCard>) => void
  onDelete: () => void
}

function CardEditor({ card, isEditing, onEdit, onSave, onCancel, onUpdate, onDelete }: CardEditorProps) {
  const [localTitle, setLocalTitle] = useState(card.title)
  const [localContent, setLocalContent] = useState(card.content)
  const typeInfo = CARD_TYPES[card.type]
  const Icon = typeInfo.icon

  useEffect(() => {
    setLocalTitle(card.title)
    setLocalContent(card.content)
  }, [card])

  const handleSave = () => {
    onUpdate({ title: localTitle, content: localContent })
    onSave()
  }

  return (
    <div className="editor-card" style={{ borderLeftColor: typeInfo.color, borderLeftWidth: '4px' }}>
      <div className="editor-card-header">
        <span className="editor-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon size={16} style={{ color: typeInfo.color }} />
          {typeInfo.label}
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
          <>
            <input
              className="editor-input"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              placeholder="Titolo..."
              style={{ marginBottom: '0.75rem', fontWeight: 600 }}
            />
            <textarea
              className="editor-input editor-textarea"
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              placeholder="Contenuto..."
            />
          </>
        ) : (
          <>
            <h3 style={{ marginBottom: '0.5rem', color: typeInfo.color }}>{card.title}</h3>
            <p style={{ color: '#64748b' }}>{card.content}</p>
          </>
        )}
      </div>
    </div>
  )
}

function parsePadletFromHtml(html: string): PadletCard[] {
  const cards: PadletCard[] = []
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  doc.querySelectorAll('.card').forEach((cardEl, index) => {
    const title = cardEl.querySelector('h3')?.textContent || 'Card'
    const content = cardEl.querySelector('p')?.textContent || ''
    
    let type: PadletCard['type'] = 'concept'
    if (cardEl.closest('.summary') || title.toLowerCase().includes('riepilogo')) type = 'summary'
    else if (cardEl.closest('.resource') || title.toLowerCase().includes('risorsa')) type = 'resource'
    else if (cardEl.closest('.exercise') || title.toLowerCase().includes('esercizio')) type = 'exercise'

    cards.push({ id: `card-${index}`, type, title, content })
  })

  return cards.length > 0 ? cards : [
    { id: 'card-1', type: 'summary', title: 'Riepilogo', content: 'Contenuto di esempio...' }
  ]
}

function generatePadletHtml(cards: PadletCard[]): string {
  const grouped = {
    summary: cards.filter(c => c.type === 'summary'),
    concept: cards.filter(c => c.type === 'concept'),
    resource: cards.filter(c => c.type === 'resource'),
    exercise: cards.filter(c => c.type === 'exercise'),
  }

  let content = ''

  if (grouped.summary.length > 0) {
    content += '<h2>Riepilogo</h2>\n'
    grouped.summary.forEach(card => {
      content += `<div class="card"><h3>${card.title}</h3><p>${card.content}</p></div>\n`
    })
  }

  if (grouped.concept.length > 0) {
    content += '<h2>Concetti Chiave</h2>\n'
    grouped.concept.forEach(card => {
      content += `<div class="card"><h3>${card.title}</h3><p>${card.content}</p></div>\n`
    })
  }

  if (grouped.resource.length > 0) {
    content += '<h2>Risorse</h2>\n'
    grouped.resource.forEach(card => {
      content += `<div class="resource"><div><strong>${card.title}</strong><p>${card.content}</p></div></div>\n`
    })
  }

  if (grouped.exercise.length > 0) {
    content += '<h2>Esercizi Pratici</h2>\n'
    grouped.exercise.forEach(card => {
      content += `<div class="exercise"><h3>${card.title}</h3><p>${card.content}</p></div>\n`
    })
  }

  return wrapInHtmlTemplate(content, 'Padlet', '#ec4899')
}

function wrapInHtmlTemplate(content: string, title: string, color: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 2rem; }
        .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }
        .header { background: ${color}; color: white; padding: 2rem; text-align: center; }
        .header h1 { font-size: 2rem; }
        .content { padding: 2rem; }
        h2 { color: ${color}; border-bottom: 3px solid ${color}; padding-bottom: 0.5rem; margin: 2rem 0 1rem 0; }
        h2:first-child { margin-top: 0; }
        .card { background: #f8f9fa; border-radius: 12px; padding: 1.5rem; margin: 1rem 0; border-left: 4px solid ${color}; }
        .card h3 { color: ${color}; margin-bottom: 0.5rem; }
        .resource { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: #fafafa; border-radius: 8px; margin: 0.5rem 0; }
        .exercise { background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-radius: 12px; padding: 1.5rem; margin: 1rem 0; }
        .exercise h3 { color: #1565c0; margin-bottom: 0.5rem; }
        .footer { text-align: center; padding: 1.5rem; background: #f5f5f5; color: #888; font-size: 0.85rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>📌 ${title}</h1></div>
        <div class="content">${content}</div>
        <div class="footer">Generato con Scolastica</div>
    </div>
</body>
</html>`
}
