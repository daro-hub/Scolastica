'use client'

import { Onborda, OnbordaProvider, type OnbordaProps, type CardComponentProps } from 'onborda'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

const tourSteps: OnbordaProps['steps'] = [
  {
    tour: 'main-tour',
    steps: [
      {
        icon: <>👋</>,
        title: 'Benvenuto in Scolastica!',
        content: 'Carica qui il tuo documento sorgente: PDF, Word o qualsiasi file di testo da cui generare contenuti educativi.',
        selector: '#upload-source',
        side: 'bottom',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 12,
      },
      {
        icon: <>🎨</>,
        title: 'Template Master (opzionale)',
        content: 'Se hai un template PowerPoint del cliente, caricalo qui. Le slide generate seguiranno il suo stile.',
        selector: '#upload-master',
        side: 'bottom',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 12,
      },
      {
        icon: <>📋</>,
        title: 'Scegli cosa creare',
        content: 'Seleziona il tipo di contenuto che vuoi generare: presentazioni, sottotitoli, quiz e molto altro.',
        selector: '#task-selector',
        side: 'top',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 12,
      },
      {
        icon: <>🚀</>,
        title: 'Avvia la generazione',
        content: "Quando sei pronto, clicca qui per generare le proposte. L'AI creerà diverse varianti per te.",
        selector: '#generate-button',
        side: 'top',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 12,
      },
      {
        icon: <>✨</>,
        title: 'Scegli le varianti',
        content: 'Per ogni sezione vedrai 5 proposte diverse. Clicca su quella che preferisci per selezionarla.',
        selector: '#variant-selector',
        side: 'bottom',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 12,
      },
      {
        icon: <>🖼️</>,
        title: 'Cerca immagini',
        content: 'Usa la ricerca integrata per trovare immagini perfette per il tuo contenuto.',
        selector: '#image-search-button',
        side: 'bottom',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 12,
      },
      {
        icon: <>📥</>,
        title: 'Scarica il risultato',
        content: 'Una volta completato, scarica il file finale pronto per essere usato!',
        selector: '#export-button',
        side: 'top',
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 12,
      },
    ],
  },
]

function TourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  arrow,
}: CardComponentProps) {
  const { setIsFirstVisit } = useAppStore()

  const handleClose = () => {
    setIsFirstVisit(false)
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-xl p-5 max-w-xs relative">
      <button
        onClick={handleClose}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{step.icon}</span>
        <h4 className="font-semibold text-sm">{step.title}</h4>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        {step.content}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {currentStep + 1} di {totalSteps}
        </span>
        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button variant="ghost" size="sm" onClick={prevStep}>
              Indietro
            </Button>
          )}
          <Button size="sm" onClick={currentStep === totalSteps - 1 ? handleClose : nextStep}>
            {currentStep === totalSteps - 1 ? 'Fine' : 'Avanti'}
          </Button>
        </div>
      </div>
      {arrow}
    </div>
  )
}

export function OnboardingTour({ children }: { children: React.ReactNode }) {
  const { isFirstVisit } = useAppStore()

  return (
    <OnbordaProvider>
      <Onborda
        steps={tourSteps}
        showOnborda={isFirstVisit}
        cardComponent={TourCard}
        shadowOpacity="0.6"
      >
        {children}
      </Onborda>
    </OnbordaProvider>
  )
}
