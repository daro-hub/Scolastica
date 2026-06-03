'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ZoomIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'

export interface SlideVariant {
  variant_index: number
  slide_index: number
  layout_name: string
  design_rationale: string
  thumbnail_url: string
}

export interface SlideSection {
  section_index: number
  heading: string
  variants: SlideVariant[]
}

interface VariantSelectorProps {
  sections: SlideSection[]
  selectedVariants: Record<number, number>
  onSelect: (sectionIndex: number, variantIndex: number) => void
  apiBase: string
  id?: string
}

export function VariantSelector({
  sections,
  selectedVariants,
  onSelect,
  apiBase,
  id,
}: VariantSelectorProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)

  const totalSections = sections.length
  const selectedCount = Object.keys(selectedVariants).length

  return (
    <>
      <div id={id} className="space-y-10">
        <div className="flex items-center justify-between sticky top-16 z-10 bg-background/95 backdrop-blur-sm py-3 -mx-4 px-4 border-b">
          <p className="text-sm text-muted-foreground">
            Selezionate <span className="font-semibold text-foreground">{selectedCount}</span> di{' '}
            <span className="font-semibold text-foreground">{totalSections}</span> sezioni
          </p>
          {selectedCount === totalSections && (
            <Badge variant="default" className="bg-green-600">
              Tutte selezionate
            </Badge>
          )}
        </div>

        {sections.map((section, sectionIdx) => {
          const hasSelection = selectedVariants[section.section_index] !== undefined

          return (
            <div key={section.section_index} className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                  hasSelection ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {hasSelection ? <Check className="w-4 h-4" /> : sectionIdx + 1}
                </div>
                <div>
                  <h3 className="text-sm font-semibold leading-tight">
                    {cleanHeading(section.heading || `Sezione ${section.section_index + 1}`)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Clicca sulla slide che preferisci
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pl-11">
                {section.variants.map((variant) => {
                  const isSelected = selectedVariants[section.section_index] === variant.variant_index
                  const thumbUrl = `${apiBase}${variant.thumbnail_url}`

                  return (
                    <motion.div
                      key={variant.slide_index}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative group"
                    >
                      <div
                        className={cn(
                          'cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200',
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20 shadow-lg'
                            : 'border-border hover:border-primary/40 hover:shadow-md'
                        )}
                        onClick={() => onSelect(section.section_index, variant.variant_index)}
                      >
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-primary flex items-center justify-center z-10 shadow-md"
                          >
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </motion.div>
                        )}

                        <button
                          type="button"
                          className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            setZoomedImage(thumbUrl)
                          }}
                        >
                          <ZoomIn className="w-3.5 h-3.5 text-white" />
                        </button>

                        <div className="aspect-[16/9] bg-muted">
                          <img
                            src={thumbUrl}
                            alt={`${variant.layout_name} - Variante ${variant.variant_index + 1}`}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>

                        <div className="p-3 bg-card">
                          <p className="text-xs font-medium truncate">
                            {variant.layout_name}
                          </p>
                          {variant.design_rationale && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                              {variant.design_rationale}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="max-w-4xl p-2">
          {zoomedImage && (
            <img
              src={zoomedImage}
              alt="Slide preview"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function cleanHeading(text: string): string {
  return text
    .replace(/\n+/g, ' ')
    .replace(/\t+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\d+\s*/, '')
    .trim()
    .slice(0, 80)
}
