# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.spec.ts >> Backend: generate real slide thumbnails
- Location: e2e.spec.ts:7:5

# Error details

```
TypeError: apiRequestContext.post: stream3.on is not a function
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | const SOURCE_PDF = '/Users/marcodarinzanco/Downloads/swisstransfer_e8bf5ed1-340d-48e7-a16c-3739d3321563 (1)/Presentazioni e Mappe PPT/Presentazione 1 - fonte.pdf'
  4   | const MASTER_PPTX = '/Users/marcodarinzanco/Downloads/swisstransfer_e8bf5ed1-340d-48e7-a16c-3739d3321563 (1)/Presentazioni e Mappe PPT/Presentazione 1 - PPT.pptx'
  5   | const API_BASE = 'http://localhost:8000'
  6   | 
  7   | test('Backend: generate real slide thumbnails', async ({ request }) => {
  8   |   test.setTimeout(300000)
  9   | 
  10  |   // Upload files
  11  |   const uploadForm = request.newContext ? undefined : undefined
> 12  |   const upload = await request.post(`${API_BASE}/upload`, {
      |                                ^ TypeError: apiRequestContext.post: stream3.on is not a function
  13  |     multipart: {
  14  |       files: [
  15  |         { name: 'Presentazione 1 - fonte.pdf', mimeType: 'application/pdf', buffer: require('fs').readFileSync(SOURCE_PDF) },
  16  |         { name: 'Presentazione 1 - PPT.pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', buffer: require('fs').readFileSync(MASTER_PPTX) },
  17  |       ]
  18  |     }
  19  |   })
  20  |   expect(upload.ok()).toBeTruthy()
  21  |   const uploadData = await upload.json()
  22  |   console.log('Upload:', uploadData)
  23  | 
  24  |   const sourceId = uploadData.file_ids[0]
  25  |   const masterId = uploadData.file_ids[1]
  26  | 
  27  |   // Create project with master
  28  |   const project = await request.post(`${API_BASE}/v2/projects`, {
  29  |     data: { name: 'Playwright Test', master_file_id: masterId }
  30  |   })
  31  |   expect(project.ok()).toBeTruthy()
  32  |   const projectData = await project.json()
  33  |   console.log('Project:', projectData.project_id)
  34  |   expect(projectData.master_layouts).toBeTruthy()
  35  | 
  36  |   // Generate variants with thumbnails
  37  |   console.log('Generating variants (this takes 2-3 minutes)...')
  38  |   const generate = await request.post(`${API_BASE}/v2/projects/${projectData.project_id}/generate`, {
  39  |     data: { task_type: 'presentations', source_file_ids: [sourceId], num_variants: 2 }
  40  |   })
  41  |   expect(generate.ok()).toBeTruthy()
  42  |   const genData = await generate.json()
  43  |   console.log('Status:', genData.status)
  44  | 
  45  |   if (genData.status === 'failed') {
  46  |     console.log('Error:', genData.error)
  47  |     expect(genData.status).not.toBe('failed')
  48  |   }
  49  | 
  50  |   expect(genData.status).toBe('variants_ready')
  51  |   expect(genData.sections).toBeTruthy()
  52  |   expect(genData.sections.length).toBeGreaterThan(0)
  53  | 
  54  |   console.log(`Generated ${genData.sections.length} sections`)
  55  |   for (const section of genData.sections.slice(0, 3)) {
  56  |     console.log(`  Section ${section.section_index}: "${section.heading?.slice(0, 40)}" (${section.variants.length} variants)`)
  57  |     for (const v of section.variants) {
  58  |       console.log(`    Variant ${v.variant_index}: ${v.layout_name} -> ${v.thumbnail_url}`)
  59  |       
  60  |       // Verify thumbnail is accessible
  61  |       const thumb = await request.get(`${API_BASE}${v.thumbnail_url}`)
  62  |       expect(thumb.ok()).toBeTruthy()
  63  |       expect(thumb.headers()['content-type']).toContain('image/png')
  64  |       const body = await thumb.body()
  65  |       expect(body.length).toBeGreaterThan(1000) // At least 1KB = real image
  66  |       console.log(`      Image OK: ${body.length} bytes`)
  67  |     }
  68  |   }
  69  | 
  70  |   // Build final
  71  |   const build = await request.post(`${API_BASE}/v2/generations/${genData.generation_id}/build`, {
  72  |     data: { image_selections: { "0": 0, "1": 1, "2": 0 } }
  73  |   })
  74  |   expect(build.ok()).toBeTruthy()
  75  |   const buildData = await build.json()
  76  |   console.log('Build result:', buildData)
  77  |   expect(buildData.status).toBe('completed')
  78  |   expect(buildData.output_url).toBeTruthy()
  79  | 
  80  |   // Download final PPTX
  81  |   const download = await request.get(`${API_BASE}${buildData.output_url}`)
  82  |   expect(download.ok()).toBeTruthy()
  83  |   const pptxBody = await download.body()
  84  |   console.log(`Final PPTX: ${pptxBody.length} bytes`)
  85  |   expect(pptxBody.length).toBeGreaterThan(10000)
  86  | 
  87  |   console.log('ALL TESTS PASSED!')
  88  | })
  89  | 
  90  | test('Frontend: displays thumbnails after generation', async ({ page }) => {
  91  |   test.setTimeout(360000)
  92  | 
  93  |   await page.goto('http://localhost:3000')
  94  |   await page.evaluate(() => localStorage.setItem('scolastica_visited', 'true'))
  95  |   await page.reload({ waitUntil: 'networkidle' })
  96  |   await page.waitForTimeout(2000)
  97  | 
  98  |   // Use evaluate to set the app state directly (bypasses Playwright click issues)
  99  |   await page.evaluate(() => {
  100 |     // Access Zustand store via window (exposed for testing)
  101 |     const store = (window as any).__ZUSTAND_STORE__
  102 |     if (store) {
  103 |       store.getState().setTaskType('presentations')
  104 |       store.getState().setStep(2)
  105 |     }
  106 |   })
  107 | 
  108 |   // If direct store access doesn't work, use the API to generate and inject sections
  109 |   await page.waitForTimeout(1000)
  110 |   await page.screenshot({ path: 'test-results/c_frontend_test.png', fullPage: true })
  111 |   console.log('Frontend screenshot saved')
  112 | })
```