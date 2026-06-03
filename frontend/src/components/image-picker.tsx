'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Check, X, Loader2, ImageIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { searchImages, type ImageSearchResult } from '@/lib/api'

interface ImagePickerProps {
  open: boolean
  onClose: () => void
  onSelect: (image: ImageSearchResult) => void
}

export function ImagePicker({ open, onClose, onSelect }: ImagePickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ImageSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await searchImages(query)
      setResults(data.results)
      if (data.results.length === 0) {
        setError('Nessuna immagine trovata. Prova con termini diversi.')
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Errore nella ricerca. Riprova tra qualche secondo.'
      )
    } finally {
      setLoading(false)
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleConfirm = () => {
    const selected = results.find((r) => r.id === selectedId)
    if (selected) {
      onSelect(selected)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Cerca immagini</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca immagini per il tuo contenuto..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cerca'}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 mt-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <X className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm">Inserisci un termine e premi Cerca</p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          <AnimatePresence>
            {results.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-3 sm:grid-cols-4 gap-2"
              >
                {results.map((image) => (
                  <motion.button
                    key={image.id}
                    type="button"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.03 }}
                    onClick={() => setSelectedId(image.id)}
                    className={cn(
                      'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                      selectedId === image.id
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent hover:border-primary/40'
                    )}
                  >
                    <img
                      src={image.thumbnailUrl}
                      alt={image.description}
                      className="w-full h-full object-cover"
                    />
                    {selectedId === image.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                      >
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {selectedId && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setSelectedId(null)}>
              Annulla selezione
            </Button>
            <Button onClick={handleConfirm}>Usa questa immagine</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
