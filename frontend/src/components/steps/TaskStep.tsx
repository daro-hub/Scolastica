'use client'

import { Upload } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { TaskSelector } from '@/components/task-selector'
import { Button } from '@/components/ui/button'

export function TaskStep() {
  const taskType = useAppStore((s) => s.taskType)
  const setTaskType = useAppStore((s) => s.setTaskType)
  const setStep = useAppStore((s) => s.setStep)

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Cosa vuoi creare?</h2>
        <p className="text-muted-foreground">Scegli il tipo di contenuto da generare</p>
      </div>

      <div id="task-selector">
        <TaskSelector selected={taskType} onSelect={setTaskType} />
      </div>

      <div className="flex justify-end pt-4">
        <Button size="lg" disabled={!taskType} onClick={() => setStep(2)} className="px-8">
          Avanti: Carica file
          <Upload className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
