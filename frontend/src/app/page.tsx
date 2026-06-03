'use client'

import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  Sparkles,
  Download,
  Loader2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ImagePlus,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { StepIndicator } from '@/components/step-indicator'
import { UploadZone } from '@/components/upload-zone'
import { TaskSelector } from '@/components/task-selector'
import { VariantSelector } from '@/components/variant-selector'
import { ImagePicker } from '@/components/image-picker'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  uploadFiles,
  createProject,
  startGeneration,
  buildFinal,
  downloadFromUrl,
} from '@/lib/api'
import { toast } from 'sonner'
import { useState } from 'react'

const fadeVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

export default function Home() {
  const {
    currentStep,
    sourceFile,
    masterFile,
    taskType,
    customPrompt,
    generationStatus,
    generationId,
    sections,
    selectedVariants,
    outputUrl,
    error,
    progress,
    setStep,
    setSourceFile,
    setMasterFile,
    setTaskType,
    setCustomPrompt,
    setGenerationStatus,
    setGenerationId,
    setSections,
    selectVariant,
    setOutputUrl,
    setError,
    setProgress,
    reset,
  } = useAppStore()

  const [imagePickerOpen, setImagePickerOpen] = useState(false)

  const allVariantsSelected =
    sections.length > 0 &&
    sections.every((section) => selectedVariants[section.section_index] !== undefined)

  const handleGenerate = useCallback(async () => {
    if (!sourceFile || !taskType) return

    try {
      setError(null)
      setGenerationStatus('uploading')
      setProgress({ percent: 10, message: 'Caricamento file in corso...' })

      const { sourceFileId, masterFileId } = await uploadFiles(sourceFile, masterFile)

      setProgress({ percent: 25, message: 'Creazione progetto...' })
      const { projectId } = await createProject(
        sourceFile.name.replace(/\.[^.]+$/, ''),
        masterFileId
      )

      setGenerationStatus('processing')
      setProgress({ percent: 40, message: 'Generazione varianti in corso... Questo può richiedere fino a 2 minuti.' })

      const result = await startGeneration(projectId, taskType, [sourceFileId], customPrompt)
      setGenerationId(result.generationId)

      if (result.status === 'variants_ready' && result.sections) {
        setSections(result.sections)
        setGenerationStatus('variants_ready')
        setStep(3)
        toast.success('Varianti pronte! Scegli le tue preferite.')
      } else if (result.status === 'completed' && result.output) {
        setOutputUrl(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/download/${result.output.id}`)
        setGenerationStatus('complete')
        setStep(4)
        toast.success('File generato con successo!')
      } else if (result.status === 'failed') {
        setGenerationStatus('error')
        setError(result.error || 'Si è verificato un errore durante la generazione.')
        toast.error('Errore nella generazione')
      }
    } catch (err) {
      setGenerationStatus('error')
      setError(err instanceof Error ? err.message : 'Errore di connessione con il server.')
      toast.error('Si è verificato un errore.')
    }
  }, [sourceFile, masterFile, taskType, customPrompt, setError, setGenerationStatus, setProgress, setGenerationId, setSections, setStep, setOutputUrl])

  const handleBuildFinal = useCallback(async () => {
    if (!generationId) return

    try {
      setGenerationStatus('building')
      setProgress({ percent: 80, message: 'Costruzione file finale...' })

      const selectionsAsStrings: Record<string, string> = {}
      for (const [k, v] of Object.entries(selectedVariants)) {
        selectionsAsStrings[String(k)] = String(v)
      }

      const url = await buildFinal(generationId, selectionsAsStrings)

      setOutputUrl(url)
      setGenerationStatus('complete')
      setStep(4)
      toast.success('File pronto per il download!')
    } catch (err) {
      setGenerationStatus('error')
      setError(
        err instanceof Error
          ? err.message
          : 'Errore nella costruzione del file finale.'
      )
    }
  }, [generationId, selectedVariants, setGenerationStatus, setProgress, setOutputUrl, setStep, setError])

  const handleDownload = useCallback(() => {
    if (outputUrl) {
      downloadFromUrl(outputUrl, 'output-scolastica')
      toast.success('Download avviato!')
    }
  }, [outputUrl])

  const handleReset = useCallback(() => {
    reset()
    toast('Progetto resettato. Puoi ricominciare da capo.')
  }, [reset])

  const isProcessing = generationStatus === 'uploading' || generationStatus === 'processing' || generationStatus === 'building'

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Scolastica</h1>
          </div>
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Tooltip>
                <TooltipTrigger
                  render={<Button variant="ghost" size="sm" onClick={handleReset} />}
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Ricomincia
                </TooltipTrigger>
                <TooltipContent>Cancella tutto e ricomincia da zero</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </header>

      <StepIndicator
        currentStep={currentStep}
        onStepClick={(step) => {
          if (step < currentStep) setStep(step)
        }}
      />

      {error && (
        <div className="max-w-4xl mx-auto px-4 w-full">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 mb-6"
          >
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Qualcosa è andato storto</p>
              <p className="text-sm text-destructive/80 mt-0.5">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setError(null)}
            >
              Chiudi
            </Button>
          </motion.div>
        </div>
      )}

      <main className="flex-1 max-w-4xl mx-auto px-4 pb-12 w-full">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Cosa vuoi creare?</h2>
                <p className="text-muted-foreground">
                  Scegli il tipo di contenuto da generare
                </p>
              </div>

              <div id="task-selector">
                <TaskSelector selected={taskType} onSelect={setTaskType} />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  size="lg"
                  disabled={!taskType}
                  onClick={() => setStep(2)}
                  className="px-8"
                >
                  Avanti: Carica file
                  <Upload className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step-2"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Carica i tuoi file</h2>
                <p className="text-muted-foreground">
                  {taskType === 'subtitles' || taskType === 'karaoke'
                    ? 'Carica il file audio o video da trascrivere'
                    : 'Carica il documento sorgente da cui generare i contenuti'}
                </p>
              </div>

              <UploadZone
                id="upload-source"
                label={
                  taskType === 'subtitles' || taskType === 'karaoke'
                    ? 'File audio/video *'
                    : 'Documento sorgente *'
                }
                description={
                  taskType === 'subtitles' || taskType === 'karaoke'
                    ? 'MP3, WAV, MP4 (max 50 MB)'
                    : 'PDF, Word (max 50 MB)'
                }
                accept={
                  taskType === 'subtitles' || taskType === 'karaoke'
                    ? '.mp3,.wav,.mp4'
                    : '.pdf,.doc,.docx,.txt,.md'
                }
                file={sourceFile}
                onFileSelect={setSourceFile}
                onFileClear={() => setSourceFile(null)}
              />

              {taskType === 'presentations' && (
                <UploadZone
                  id="upload-master"
                  label="Template Master (opzionale)"
                  description="Il PowerPoint PPTX del cliente. Se fornito, il risultato rispetterà i suoi layout."
                  accept=".pptx,.ppt"
                  file={masterFile}
                  onFileSelect={setMasterFile}
                  onFileClear={() => setMasterFile(null)}
                />
              )}

              <Separator />

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Istruzioni personalizzate (opzionale)
                </label>
                <Textarea
                  placeholder="Es: Usa un tono informale, adatto a studenti di scuola media. Focus su concetti chiave con esempi pratici..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Indica tono, pubblico target, lunghezza o qualsiasi altra preferenza
                </p>
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Indietro
                </Button>
                <Button
                  id="generate-button"
                  size="lg"
                  disabled={!sourceFile || isProcessing}
                  onClick={handleGenerate}
                  className="px-8"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generazione in corso...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Genera contenuti
                    </>
                  )}
                </Button>
              </div>

              {isProcessing && (
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
                        <p className="text-xs text-muted-foreground">
                          L'elaborazione può richiedere da 30 secondi a qualche minuto, a seconda della lunghezza del documento.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step-3"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
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
                  onSelect={selectVariant}
                  apiBase=""
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
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(2)}>
                    Indietro
                  </Button>
                  <Button
                    id="image-search-button"
                    variant="outline"
                    onClick={() => setImagePickerOpen(true)}
                  >
                    <ImagePlus className="w-4 h-4 mr-2" />
                    Cerca immagini
                  </Button>
                </div>
                <Button
                  size="lg"
                  disabled={!allVariantsSelected || isProcessing}
                  onClick={handleBuildFinal}
                  className="px-8"
                >
                  {isProcessing ? (
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

              {isProcessing && (
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
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step-4"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                >
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">File pronto!</h2>
                <p className="text-muted-foreground">
                  Il tuo contenuto è stato generato con successo. Scaricalo qui sotto.
                </p>
              </div>

              <Card className="max-w-md mx-auto">
                <CardContent className="p-8 text-center space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Download className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium mb-1">Il tuo file è pronto</p>
                    <p className="text-sm text-muted-foreground">
                      Clicca il pulsante per scaricarlo sul tuo computer
                    </p>
                  </div>
                  <Button
                    id="export-button"
                    size="lg"
                    className="w-full"
                    onClick={handleDownload}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Scarica file
                  </Button>
                </CardContent>
              </Card>

              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Crea un nuovo contenuto
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <ImagePicker
        open={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onSelect={(image) => {
          toast.success(`Immagine "${image.description}" selezionata`)
        }}
      />
    </div>
  )
}
