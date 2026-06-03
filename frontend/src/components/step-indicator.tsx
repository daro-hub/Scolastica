'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4
  onStepClick?: (step: 1 | 2 | 3 | 4) => void
}

const steps = [
  { id: 1, label: 'Scegli', description: 'Cosa vuoi creare' },
  { id: 2, label: 'Carica', description: 'File sorgente e template' },
  { id: 3, label: 'Revisiona', description: 'Scegli le varianti' },
  { id: 4, label: 'Esporta', description: 'Scarica il risultato' },
] as const

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="w-full px-4 py-6">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id
          const isCurrent = currentStep === step.id
          const isClickable = isCompleted && onStepClick

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(step.id)}
                className={cn(
                  'flex flex-col items-center gap-2 group',
                  isClickable && 'cursor-pointer'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                    !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : step.id}
                </div>
                <div className="text-center">
                  <p
                    className={cn(
                      'text-sm font-medium transition-colors',
                      (isCurrent || isCompleted) ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </button>

              {index < steps.length - 1 && (
                <div className="flex-1 mx-4 hidden sm:block">
                  <div
                    className={cn(
                      'h-0.5 rounded-full transition-colors duration-300',
                      currentStep > step.id ? 'bg-primary' : 'bg-border'
                    )}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
