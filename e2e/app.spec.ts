import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const FIXTURES_DIR = path.join(__dirname, 'fixtures')
const SOURCE_PDF = path.join(FIXTURES_DIR, 'source.pdf')
const MASTER_PPTX = path.join(FIXTURES_DIR, 'master.pptx')

async function pollUntilReady(request: import('@playwright/test').APIRequestContext, apiBase: string, generationId: string) {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    const res = await request.get(`${apiBase}/v2/generations/${generationId}`)
    expect(res.ok()).toBeTruthy()
    const data = await res.json()
    if (data.status === 'variants_ready' || data.status === 'failed') return data
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error('Timed out waiting for generation to finish')
}

test.describe('Backend pipeline (API-level, FAKE_LLM)', () => {
  test('upload -> generate -> poll -> build round-trips a real PPTX', async ({ request, baseURL }) => {
    // webServer's frontend runs at baseURL; the backend is proxied via
    // NEXT_PUBLIC_API_URL, read directly here since this test talks to
    // the API, not the browser.
    const apiBase = process.env.SCOLASTICA_API_URL as string

    // Plain fetch + FormData here instead of request.post's `multipart`
    // option — that option currently throws ("stream3.on is not a
    // function") against a real multi-file upload on this Playwright/
    // Node combination, so we sidestep it rather than fight it.
    const form = new FormData()
    form.append('files', new Blob([fs.readFileSync(SOURCE_PDF)]), 'source.pdf')
    form.append('files', new Blob([fs.readFileSync(MASTER_PPTX)]), 'master.pptx')
    const uploadRes = await fetch(`${apiBase}/upload`, { method: 'POST', body: form })
    expect(uploadRes.ok).toBeTruthy()
    const { file_ids } = await uploadRes.json()
    const [sourceId, masterId] = file_ids

    const project = await request.post(`${apiBase}/v2/projects`, {
      data: { name: 'E2E Test', master_file_id: masterId },
    })
    expect(project.ok()).toBeTruthy()
    const { project_id, master_layouts } = await project.json()
    expect(master_layouts.layouts.length).toBeGreaterThan(0)

    const generate = await request.post(`${apiBase}/v2/projects/${project_id}/generate`, {
      data: { task_type: 'presentations', source_file_ids: [sourceId], num_variants: 1 },
    })
    expect(generate.ok()).toBeTruthy()
    const genData = await generate.json()
    // The generate endpoint must return immediately with a job id, not
    // block for the whole pipeline — this is the behavior that replaced
    // the old inline, single-request implementation.
    expect(genData.status).toBe('queued')

    const finalStatus = await pollUntilReady(request, apiBase, genData.generation_id)
    expect(finalStatus.status, finalStatus.error).toBe('variants_ready')
    expect(finalStatus.sections.length).toBeGreaterThan(0)

    for (const section of finalStatus.sections) {
      for (const variant of section.variants) {
        const thumb = await request.get(`${apiBase}${variant.thumbnail_url}`)
        expect(thumb.ok()).toBeTruthy()
        expect(thumb.headers()['content-type']).toContain('image/png')
      }
    }

    const variantSelections: Record<string, number> = {}
    for (const section of finalStatus.sections) {
      variantSelections[section.section_index] = 0
    }

    const build = await request.post(`${apiBase}/v2/generations/${genData.generation_id}/build`, {
      data: { variant_selections: variantSelections },
    })
    expect(build.ok()).toBeTruthy()
    const buildData = await build.json()
    expect(buildData.status).toBe('completed')

    const download = await request.get(`${apiBase}${buildData.output_url}`)
    expect(download.ok()).toBeTruthy()
    const body = await download.body()
    expect(body.length).toBeGreaterThan(1000)
  })
})

test.describe('Frontend wizard', () => {
  test('generate presentation end to end through the UI', async ({ page }) => {
    // Skip the onboarding tour overlay (Onborda) — irrelevant to this
    // test and a real source of flakiness for automated clicks (a
    // full-screen spotlight overlay repositioning under a real button).
    await page.addInitScript(() => localStorage.setItem('scolastica_visited', 'true'))
    await page.goto('/')

    // No APP_PASSWORD set for the e2e backend, so any value clears the gate.
    await page.getByPlaceholder('Password').fill('e2e')
    await page.getByRole('button', { name: 'Accedi' }).click()
    await expect(page.getByText('Cosa vuoi creare?')).toBeVisible()

    await page.getByRole('button', { name: /Presentazione/ }).click()
    await page.getByRole('button', { name: /Avanti/ }).click()

    await page.locator('#upload-source input[type="file"]').setInputFiles(SOURCE_PDF)
    await page.locator('#upload-master input[type="file"]').setInputFiles(MASTER_PPTX)

    await page.getByRole('button', { name: /Genera contenuti/ }).click()

    // FAKE_LLM + a small fixture keeps this well under the real 2-4 min budget.
    await expect(page.getByText('Scegli le varianti')).toBeVisible({ timeout: 60_000 })
    await expect(page.locator('img[alt*="Variante"]').first()).toBeVisible({ timeout: 30_000 })

    // Click the slide thumbnail itself, not a generic "cursor-pointer"
    // selector — the StepIndicator's already-completed step buttons
    // (steps 1 and 2, both clickable to go back) also carry a literal
    // `cursor-pointer` class and sit earlier in the DOM, so `[class*=
    // "cursor-pointer"]').first()` matched one of those instead of a
    // variant card.
    await page.locator('img[alt*="Variante"]').first().click()
    await expect(page.getByText('Selezionate 1 di 1 sezioni')).toBeVisible()

    await page.getByRole('button', { name: /Crea file finale/ }).click()
    await expect(page.getByText('File pronto!')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: /Scarica file/ })).toBeVisible()
  })
})
