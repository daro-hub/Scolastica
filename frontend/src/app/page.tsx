'use client'

import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RotateCcw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/useAppStore'
import { useGenerationPolling } from '@/hooks/useGenerationPolling'
import { StepIndicator } from '@/components/step-indicator'
import { TaskStep } from '@/components/steps/TaskStep'
import { UploadStep } from '@/components/steps/UploadStep'
import { ReviewStep } from '@/components/steps/ReviewStep'
import { DoneStep } from '@/components/steps/DoneStep'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const fadeVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

export default function Home() {
  const currentStep = useAppStore((s) => s.currentStep)
  const error = useAppStore((s) => s.error)
  const setStep = useAppStore((s) => s.setStep)
  const setError = useAppStore((s) => s.setError)
  const reset = useAppStore((s) => s.reset)

  // Drives real progress for both the "generate" (step 2->3) and "build"
  // (step 3->4) phases — see hooks/useGenerationPolling.ts.
  useGenerationPolling()

  const handleReset = useCallback(() => {
    reset()
    toast('Progetto resettato. Puoi ricominciare da capo.')
  }, [reset])

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
            <motion.div key="step-1" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
              <TaskStep />
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div key="step-2" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
              <UploadStep />
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div key="step-3" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
              <ReviewStep />
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div key="step-4" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
              <DoneStep onReset={handleReset} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
