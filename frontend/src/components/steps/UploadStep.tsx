'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/useAppStore'
import { UploadZone } from '@/components/upload-zone'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { uploadFiles, createProject, startGeneration } from '@/lib/api'

const AUDIO_VIDEO_TASKS = new Set(['subtitles', 'karaoke'])

export function UploadStep() {
  const {
    taskType,
    sourceFile,
    masterFile,
    customPrompt,
    generationStatus,
    progress,
    setSourceFile,
    setMasterFile,
    setCustomPrompt,
    setStep,
    setError,
    setGenerationStatus,
    setGenerationId,
    setProgress,
  } = useAppStore()

  const isAudioVideo = taskType ? AUDIO_VIDEO_TASKS.has(taskType) : false
  const isProcessing = generationStatus === 'uploading' || generationStatus === 'processing'

  const handleGenerate = useCallback(async () => {
    if (!sourceFile || !taskType) return

    try {
      setError(null)
      setGenerationStatus('uploading')
      setProgress({ percent: 5, message: 'Caricamento file in corso...' })

      const { sourceFileId, masterFileId } = await uploadFiles(sourceFile, masterFile)

      setProgress({ percent: 8, message: 'Creazione progetto...' })
      const { projectId } = await createProject(
        sourceFile.name.replace(/\.[^.]+$/, ''),
        masterFileId
      )

      // Kicks off the job and returns immediately — the pipeline itself
      // (LLM call, rendering) used to run inline here, blocking this
      // request for up to several minutes. useGenerationPolling takes
      // over reporting real progress once generationStatus flips to
      // 'processing'.
      const result = await startGeneration(projectId, taskType, [sourceFileId], customPrompt)
      setGenerationId(result.generationId)

      if (result.status === 'failed') {
        setGenerationStatus('error')
        setError('Si è verificato un errore durante l\'avvio della generazione.')
        toast.error('Errore nella generazione')
        return
      }

      setProgress({ percent: 10, message: 'In coda...' })
      setGenerationStatus('processing')
    } catch (err) {
      setGenerationStatus('error')
      setError(err instanceof Error ? err.message : 'Errore di connessione con il server.')
      toast.error('Si è verificato un errore.')
    }
  }, [sourceFile, masterFile, taskType, customPrompt, setError, setGenerationStatus, setProgress, setGenerationId])

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Carica i tuoi file</h2>
        <p className="text-muted-foreground">
          {isAudioVideo
            ? 'Carica il file audio o video da trascrivere'
            : 'Carica il documento sorgente da cui generare i contenuti'}
        </p>
      </div>

      <UploadZone
        id="upload-source"
        label={isAudioVideo ? 'File audio/video *' : 'Documento sorgente *'}
        description={isAudioVideo ? 'MP3, WAV, MP4 (max 50 MB)' : 'PDF, Word (max 50 MB)'}
        accept={isAudioVideo ? '.mp3,.wav,.mp4' : '.pdf,.doc,.docx,.txt,.md'}
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
    </div>
  )
}
