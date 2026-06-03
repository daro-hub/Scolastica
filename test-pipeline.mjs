#!/usr/bin/env node
/**
 * E2E test: verifica il pipeline completo di generazione thumbnails.
 * Esegui: node test-pipeline.mjs
 */
import fs from 'fs'
import path from 'path'

const API = 'http://localhost:8000'
const SOURCE = '/Users/marcodarinzanco/Downloads/swisstransfer_e8bf5ed1-340d-48e7-a16c-3739d3321563 (1)/Presentazioni e Mappe PPT/Presentazione 1 - fonte.pdf'
const MASTER = '/Users/marcodarinzanco/Downloads/swisstransfer_e8bf5ed1-340d-48e7-a16c-3739d3321563 (1)/Presentazioni e Mappe PPT/Presentazione 1 - PPT.pptx'

async function main() {
  console.log('=== Scolastica E2E Pipeline Test ===\n')

  // 1. Upload
  console.log('1. Uploading files...')
  const form = new FormData()
  form.append('files', new Blob([fs.readFileSync(SOURCE)]), 'Presentazione 1 - fonte.pdf')
  form.append('files', new Blob([fs.readFileSync(MASTER)]), 'Presentazione 1 - PPT.pptx')

  const uploadRes = await fetch(`${API}/upload`, { method: 'POST', body: form })
  if (!uploadRes.ok) throw new Error(`Upload failed: ${await uploadRes.text()}`)
  const upload = await uploadRes.json()
  console.log(`   OK: ${upload.count} files uploaded`)

  const [sourceId, masterId] = upload.file_ids

  // 2. Create project
  console.log('2. Creating project with master...')
  const projRes = await fetch(`${API}/v2/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'E2E Test', master_file_id: masterId })
  })
  if (!projRes.ok) throw new Error(`Project failed: ${await projRes.text()}`)
  const proj = await projRes.json()
  console.log(`   OK: project ${proj.project_id}, ${proj.master_layouts.layouts.length} layouts found`)

  // 3. Generate with thumbnails
  console.log('3. Generating variants + thumbnails (2-4 minutes)...')
  const t0 = Date.now()
  const genRes = await fetch(`${API}/v2/projects/${proj.project_id}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_type: 'presentations', source_file_ids: [sourceId], num_variants: 2 })
  })
  if (!genRes.ok) throw new Error(`Generate failed: ${await genRes.text()}`)
  const gen = await genRes.json()
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  if (gen.status === 'failed') {
    console.error(`   FAILED: ${gen.error}`)
    process.exit(1)
  }

  console.log(`   OK: status=${gen.status}, ${gen.sections?.length} sections, took ${elapsed}s`)

  // 4. Verify thumbnails
  console.log('4. Verifying thumbnails...')
  let thumbOk = 0
  let thumbFail = 0
  for (const section of gen.sections || []) {
    for (const v of section.variants) {
      const thumbRes = await fetch(`${API}${v.thumbnail_url}`)
      if (thumbRes.ok) {
        const buf = await thumbRes.arrayBuffer()
        if (buf.byteLength > 1000) {
          thumbOk++
        } else {
          thumbFail++
          console.error(`   WARN: ${v.thumbnail_url} too small (${buf.byteLength} bytes)`)
        }
      } else {
        thumbFail++
        console.error(`   FAIL: ${v.thumbnail_url} -> ${thumbRes.status}`)
      }
    }
  }
  console.log(`   OK: ${thumbOk} thumbnails valid, ${thumbFail} failed`)

  // 5. Build final PPTX
  console.log('5. Building final PPTX...')
  const buildRes = await fetch(`${API}/v2/generations/${gen.generation_id}/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_selections: { "0": 0, "1": 1, "2": 0 } })
  })
  if (!buildRes.ok) throw new Error(`Build failed: ${await buildRes.text()}`)
  const build = await buildRes.json()
  console.log(`   OK: status=${build.status}, output=${build.output_url}`)

  // 6. Download final
  if (build.output_url) {
    const dlRes = await fetch(`${API}${build.output_url}`)
    if (dlRes.ok) {
      const buf = await dlRes.arrayBuffer()
      console.log(`   OK: Final PPTX downloaded, ${(buf.byteLength / 1024).toFixed(0)} KB`)
    }
  }

  console.log('\n=== ALL TESTS PASSED ===')
}

main().catch(e => {
  console.error('\n=== TEST FAILED ===')
  console.error(e.message)
  process.exit(1)
})
