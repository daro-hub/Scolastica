'use client'

import { useCallback, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, File, X, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface UploadZoneProps {
  label: string
  description: string
  accept?: string
  file: File | null
  onFileSelect: (file: File) => void
  onFileClear: () => void
  id?: string
  className?: string
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return <FileText className="w-8 h-8 text-red-500" />
  if (ext === 'pptx' || ext === 'ppt') return <FileText className="w-8 h-8 text-orange-500" />
  if (ext === 'docx' || ext === 'doc') return <FileText className="w-8 h-8 text-blue-500" />
  return <File className="w-8 h-8 text-muted-foreground" />
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadZone({
  label,
  description,
  accept,
  file,
  onFileSelect,
  onFileClear,
  id,
  className,
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) onFileSelect(droppedFile)
    },
    [onFileSelect]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) onFileSelect(selectedFile)
    },
    [onFileSelect]
  )

  return (
    <div id={id} className={cn('w-full', className)}>
      <label className="text-sm font-medium text-foreground mb-2 block">{label}</label>

      <AnimatePresence mode="wait">
        {file ? (
          <motion.div
            key="file-preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative flex items-center gap-4 p-4 rounded-xl border-2 border-primary/30 bg-primary/5"
          >
            <div className="flex-shrink-0">{getFileIcon(file.name)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-8 w-8"
                    onClick={onFileClear}
                  />
                }
              >
                <X className="w-4 h-4" />
              </TooltipTrigger>
              <TooltipContent>Rimuovi file</TooltipContent>
            </Tooltip>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200',
              isDragOver
                ? 'border-primary bg-primary/10 scale-[1.02]'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            )}
          >
            <motion.div
              animate={isDragOver ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Upload className={cn(
                'w-10 h-10 transition-colors',
                isDragOver ? 'text-primary' : 'text-muted-foreground/60'
              )} />
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Trascina qui il file o <span className="text-primary underline">sfoglia</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={handleInputChange}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
