'use client'

import { useEffect, useRef } from 'react'
import { pollGeneration } from '@/lib/api'
import { useAppStore } from '@/store/useAppStore'

const POLL_INTERVAL_MS = 2500

/**
 * Polls GET /v2/generations/{id} while a job (of any task type) is in
 * flight. That endpoint didn't used to exist — the whole pipeline ran
 * inline in the generate request, so the frontend just displayed a
 * hardcoded progress percentage with no relation to what the backend
 * was actually doing. This hook feeds the real step/percent into the
 * store and stops itself once the job reaches variants_ready/completed/
 * failed.
 */
export function useGenerationPolling() {
  const generationId = useAppStore((s) => s.generationId)
  const generationStatus = useAppStore((s) => s.generationStatus)
  const setGenerationStatus = useAppStore((s) => s.setGenerationStatus)
  const setSections = useAppStore((s) => s.setSections)
  const setProgress = useAppStore((s) => s.setProgress)
  const setOutputUrl = useAppStore((s) => s.setOutputUrl)
  const setStep = useAppStore((s) => s.setStep)
  const setError = useAppStore((s) => s.setError)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Only the 'generate' phase is a polled job — 'building' is a single
    // POST /v2/generations/{id}/build request awaited directly in
    // ReviewStep, not something to poll. Polling during 'building' used
    // to race that request: the job's DB status is still 'variants_ready'
    // until the build POST resolves, so a poll landing in between would
    // see 'variants_ready' and stomp generationStatus/step right back to
    // step 3 mid-build.
    if (!generationId || generationStatus !== 'processing') {
      return
    }

    let cancelled = false

    const tick = async () => {
      try {
        const result = await pollGeneration(generationId)
        if (cancelled) return

        setProgress({ percent: result.percent, message: result.step || '' })

        if (result.status === 'variants_ready' && result.sections) {
          setSections(result.sections)
          setGenerationStatus('variants_ready')
          setStep(3)
          return
        }
        if (result.status === 'completed') {
          if (result.outputUrl) setOutputUrl(result.outputUrl)
          setGenerationStatus('complete')
          setStep(4)
          return
        }
        if (result.status === 'failed') {
          setGenerationStatus('error')
          setError(result.error || 'Si è verificato un errore durante la generazione.')
          return
        }

        // Still in progress (extracting/planning/grounding/rendering/...): poll again.
        timerRef.current = setTimeout(tick, POLL_INTERVAL_MS)
      } catch (err) {
        if (cancelled) return
        setGenerationStatus('error')
        setError(err instanceof Error ? err.message : 'Errore di connessione con il server.')
      }
    }

    tick()

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [generationId, generationStatus, setGenerationStatus, setSections, setProgress, setOutputUrl, setStep, setError])
}
