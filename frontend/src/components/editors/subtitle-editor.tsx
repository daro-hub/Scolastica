'use client'

import { useState, useEffect } from 'react'
import { Trash2, Edit3, Plus, Check, X, Clock } from 'lucide-react'
import { useAppStore, SubtitleEntry } from '@/store/useAppStore'

export function SubtitleEditor() {
  const { rawOutput, setRawOutput, selectedTask } = useAppStore()
  const [entries, setEntries] = useState<SubtitleEntry[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  const isKaraoke = selectedTask === 'karaoke'

  useEffect(() => {
    if (rawOutput) {
      const parsed = parseSrt(rawOutput)
      setEntries(parsed)
    }
  }, [])

  const updateEntry = (id: string, updates: Partial<SubtitleEntry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
  }

  const deleteEntry = (id: string) => {
    setEntries(prev => {
      const filtered = prev.filter(e => e.id !== id)
      return filtered.map((e, i) => ({ ...e, index: i + 1 }))
    })
    regenerateSrt()
  }

  const addEntry = () => {
    const lastEntry = entries[entries.length - 1]
    const newEntry: SubtitleEntry = {
      id: `entry-${Date.now()}`,
      index: entries.length + 1,
      startTime: lastEntry ? lastEntry.endTime : '00:00:00,000',
      endTime: lastEntry ? incrementTime(lastEntry.endTime, 3000) : '00:00:03,000',
      text: 'Nuovo sottotitolo...',
      speaker: isKaraoke ? 'Speaker 1' : undefined,
    }
    setEntries(prev => [...prev, newEntry])
    setEditingId(newEntry.id)
  }

  const regenerateSrt = () => {
    const srt = generateSrt(entries, isKaraoke)
    setRawOutput(srt)
  }

  const handleSave = () => {
    setEditingId(null)
    regenerateSrt()
  }

  return (
    <div className="subtitle-editor">
      {entries.map((entry) => (
        <EntryCard
          key={entry.id}
          entry={entry}
          isKaraoke={isKaraoke}
          isEditing={editingId === entry.id}
          onEdit={() => setEditingId(entry.id)}
          onSave={handleSave}
          onCancel={() => setEditingId(null)}
          onUpdate={(updates) => updateEntry(entry.id, updates)}
          onDelete={() => deleteEntry(entry.id)}
        />
      ))}

      <button className="add-item-btn" onClick={addEntry}>
        <Plus size={18} />
        <span>Aggiungi Sottotitolo</span>
      </button>
    </div>
  )
}

interface EntryCardProps {
  entry: SubtitleEntry
  isKaraoke: boolean
  isEditing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onUpdate: (updates: Partial<SubtitleEntry>) => void
  onDelete: () => void
}

function EntryCard({ entry, isKaraoke, isEditing, onEdit, onSave, onCancel, onUpdate, onDelete }: EntryCardProps) {
  const [local, setLocal] = useState(entry)

  useEffect(() => {
    setLocal(entry)
  }, [entry])

  const handleSave = () => {
    onUpdate(local)
    onSave()
  }

  return (
    <div className="editor-card">
      <div className="editor-card-header">
        <span className="editor-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ 
            background: '#6366f1', 
            color: 'white', 
            width: '24px', 
            height: '24px', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            {entry.index}
          </span>
          <Clock size={14} style={{ color: '#64748b' }} />
          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b' }}>
            {entry.startTime} → {entry.endTime}
          </span>
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
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>
                  Inizio
                </label>
                <input
                  className="editor-input"
                  value={local.startTime}
                  onChange={(e) => setLocal(prev => ({ ...prev, startTime: e.target.value }))}
                  placeholder="00:00:00,000"
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>
                  Fine
                </label>
                <input
                  className="editor-input"
                  value={local.endTime}
                  onChange={(e) => setLocal(prev => ({ ...prev, endTime: e.target.value }))}
                  placeholder="00:00:00,000"
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
            </div>
            
            {isKaraoke && (
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>
                  Speaker
                </label>
                <input
                  className="editor-input"
                  value={local.speaker || ''}
                  onChange={(e) => setLocal(prev => ({ ...prev, speaker: e.target.value }))}
                  placeholder="Nome speaker..."
                />
              </div>
            )}
            
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>
                Testo
              </label>
              <textarea
                className="editor-input editor-textarea"
                value={local.text}
                onChange={(e) => setLocal(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Testo del sottotitolo..."
                style={{ minHeight: '80px' }}
              />
            </div>
          </div>
        ) : (
          <>
            {isKaraoke && entry.speaker && (
              <div style={{ 
                display: 'inline-block',
                background: '#e0e7ff', 
                color: '#4338ca',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 500,
                marginBottom: '0.5rem'
              }}>
                {entry.speaker}
              </div>
            )}
            <p style={{ whiteSpace: 'pre-wrap' }}>{entry.text}</p>
          </>
        )}
      </div>
    </div>
  )
}

function parseSrt(srtContent: string): SubtitleEntry[] {
  const blocks = srtContent.trim().split(/\n\n+/)
  const entries: SubtitleEntry[] = []

  for (const block of blocks) {
    const lines = block.split('\n')
    if (lines.length < 3) continue

    const index = parseInt(lines[0], 10)
    const timeLine = lines[1]
    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/)
    
    if (!timeMatch || isNaN(index)) continue

    const text = lines.slice(2).join('\n')
    const speakerMatch = text.match(/^\[([^\]]+)\]:\s*(.*)$/s)

    entries.push({
      id: `entry-${index}`,
      index,
      startTime: timeMatch[1],
      endTime: timeMatch[2],
      text: speakerMatch ? speakerMatch[2].trim() : text,
      speaker: speakerMatch ? speakerMatch[1] : undefined,
    })
  }

  return entries.length > 0 ? entries : [
    { id: 'entry-1', index: 1, startTime: '00:00:00,000', endTime: '00:00:03,000', text: 'Sottotitolo di esempio' }
  ]
}

function generateSrt(entries: SubtitleEntry[], isKaraoke: boolean): string {
  return entries.map((entry, i) => {
    const text = isKaraoke && entry.speaker 
      ? `[${entry.speaker}]: ${entry.text}`
      : entry.text
    
    return `${i + 1}\n${entry.startTime} --> ${entry.endTime}\n${text}`
  }).join('\n\n')
}

function incrementTime(time: string, ms: number): string {
  const match = time.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/)
  if (!match) return time

  let totalMs = 
    parseInt(match[1]) * 3600000 +
    parseInt(match[2]) * 60000 +
    parseInt(match[3]) * 1000 +
    parseInt(match[4]) +
    ms

  const hours = Math.floor(totalMs / 3600000)
  totalMs %= 3600000
  const minutes = Math.floor(totalMs / 60000)
  totalMs %= 60000
  const seconds = Math.floor(totalMs / 1000)
  const milliseconds = totalMs % 1000

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`
}
