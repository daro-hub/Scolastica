'use client'

import {
  Presentation,
  Subtitles,
  Music4,
  HelpCircle,
  LayoutGrid,
  Map,
  MousePointerClick,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { TaskType } from '@/store/useAppStore'

interface TaskSelectorProps {
  selected: TaskType | null
  onSelect: (type: TaskType) => void
  id?: string
}

const tasks: Array<{
  type: TaskType
  label: string
  description: string
  icon: React.ReactNode
  badge?: string
}> = [
  {
    type: 'presentations',
    label: 'Presentazione',
    description: 'Genera slide da un documento con layout professionali',
    icon: <Presentation className="w-6 h-6" />,
  },
  {
    type: 'subtitles',
    label: 'Sottotitoli',
    description: 'Crea sottotitoli sincronizzati per video',
    icon: <Subtitles className="w-6 h-6" />,
  },
  {
    type: 'karaoke',
    label: 'Karaoke',
    description: 'Sottotitoli con evidenziazione parola per parola',
    icon: <Music4 className="w-6 h-6" />,
  },
  {
    type: 'quiz',
    label: 'Quiz',
    description: 'Genera domande a risposta multipla e vero/falso',
    icon: <HelpCircle className="w-6 h-6" />,
  },
  {
    type: 'padlet',
    label: 'Padlet',
    description: 'Crea schede riassuntive per bacheca digitale',
    icon: <LayoutGrid className="w-6 h-6" />,
  },
  {
    type: 'maps',
    label: 'Mappe',
    description: 'Genera mappe concettuali interattive',
    icon: <Map className="w-6 h-6" />,
    badge: 'Beta',
  },
  {
    type: 'thinglink',
    label: 'ThingLink',
    description: 'Crea immagini interattive con hotspot',
    icon: <MousePointerClick className="w-6 h-6" />,
    badge: 'Beta',
  },
]

export function TaskSelector({ selected, onSelect, id }: TaskSelectorProps) {
  return (
    <div id={id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {tasks.map((task) => {
        const isSelected = selected === task.type
        return (
          <button
            key={task.type}
            type="button"
            onClick={() => onSelect(task.type)}
            className={cn(
              'relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
              isSelected
                ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                : 'border-border hover:border-primary/40 hover:bg-muted/50'
            )}
          >
            {task.badge && (
              <Badge variant="secondary" className="absolute top-3 right-3 text-[10px]">
                {task.badge}
              </Badge>
            )}
            <div
              className={cn(
                'w-11 h-11 rounded-lg flex items-center justify-center transition-colors',
                isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}
            >
              {task.icon}
            </div>
            <div>
              <p className={cn(
                'font-semibold text-sm',
                isSelected ? 'text-primary' : 'text-foreground'
              )}>
                {task.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {task.description}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
