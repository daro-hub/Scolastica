'use client'

import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/useAppStore'
import { VariantSelector } from '@/components/variant-selector'
import { ImagePicker } from '@/components/image-picker'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { buildFinal } from '@/lib/api'

export function ReviewStep() {
  const {
    sections,
    selectedVariants,
    imageSelections,
    generationId,
    generationStatus,
    progress,
    selectVariant,
    setImageSelection,
    setOutputUrl,
    setGenerationStatus,
    setProgress,
    setStep,
    setError,
  } = useAppStore()

  const [imageTarget, setImageTarget] = useState<{ sectionIndex: number; placeholderIdx: number } | null>(null)

  const allVariantsSelected =
    sections.length > 0 &&
    sections.every((section) => selectedVariants[section.section_index] !== undefined)
  const isBuilding = generationStatus === 'building'

  const handleBuildFinal = useCallback(async () => {
    if (!generationId) return

    try {
      setGenerationStatus('building')
      setProgress({ percent: 50, message: 'Costruzione file finale...' })

      const variantSelections: Record<string, number> = {}
      for (const [k, v] of Object.entries(selectedVariants)) {
        variantSelections[k] = v
      }

      const imageUrls: Record<string, string> = {}
      for (const [key, image] of Object.entries(imageSelections)) {
        imageUrls[key] = image.url
      }

      const url = await buildFinal(generationId, variantSelections, imageUrls)

      setOutputUrl(url)
      setGenerationStatus('complete')
      setStep(4)
      toast.success('File pronto per il download!')
    } catch (err) {
      setGenerationStatus('error')
      setError(err instanceof Error ? err.message : 'Errore nella costruzione del file finale.')
    }
  }, [generationId, selectedVariants, imageSelections, setGenerationStatus, setProgress, setOutputUrl, setStep, setError])

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Scegli le varianti</h2>
        <p className="text-muted-foreground">
          Per ogni sezione, seleziona la versione che preferisci
        </p>
      </div>

      {sections.length > 0 ? (
        <VariantSelector
          id="variant-selector"
          sections={sections}
          selectedVariants={selectedVariants}
          imageSelections={imageSelections}
          onSelect={selectVariant}
          onPickImage={(sectionIndex, placeholderIdx) => setImageTarget({ sectionIndex, placeholderIdx })}
        />
      ) : (
        <EmptyState
          icon={<Sparkles className="w-16 h-16" />}
          title="Nessuna variante disponibile"
          description="Le varianti appariranno qui una volta completata la generazione."
        />
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep(2)}>
          Indietro
        </Button>
        <Button
          size="lg"
          disabled={!allVariantsSelected || isBuilding}
          onClick={handleBuildFinal}
          className="px-8"
        >
          {isBuilding ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Costruzione in corso...
            </>
          ) : (
            <>
              Crea file finale
              <Download className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      {isBuilding && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="overflow-hidden"
        >
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{progress.message}</span>
                  <span className="font-medium">{progress.percent}%</span>
                </div>
                <Progress value={progress.percent} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <ImagePicker
        open={imageTarget !== null}
        onClose={() => setImageTarget(null)}
        onSelect={(image) => {
          if (imageTarget) {
            setImageSelection(imageTarget.sectionIndex, imageTarget.placeholderIdx, image)
            toast.success(`Immagine "${image.description || 'selezionata'}" impostata per questa slide`)
          }
        }}
      />
    </div>
  )
}
