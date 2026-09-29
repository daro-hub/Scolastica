'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Download, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { downloadFromUrl } from '@/lib/api'

export function DoneStep({ onReset }: { onReset: () => void }) {
  const outputUrl = useAppStore((s) => s.outputUrl)

  const handleDownload = useCallback(() => {
    if (outputUrl) {
      downloadFromUrl(outputUrl, 'output-scolastica')
      toast.success('Download avviato!')
    }
  }, [outputUrl])

  return (
    <div className="space-y-8">
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
          <Button id="export-button" size="lg" className="w-full" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Scarica file
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-center pt-4">
        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Crea un nuovo contenuto
        </Button>
      </div>
    </div>
  )
}
