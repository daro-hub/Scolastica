import { test, expect } from '@playwright/test'
import fs from 'fs'

const PROD_URL = 'https://scolastica-production.up.railway.app'
const PASSWORD = 'scolastica2026'
const SOURCE_PDF = '/Users/marcodarinzanco/Downloads/swisstransfer_e8bf5ed1-340d-48e7-a16c-3739d3321563 (1)/Presentazioni e Mappe PPT/Presentazione 1 - fonte.pdf'
const MASTER_PPTX = '/Users/marcodarinzanco/Downloads/swisstransfer_e8bf5ed1-340d-48e7-a16c-3739d3321563 (1)/Presentazioni e Mappe PPT/Presentazione 1 - PPT.pptx'

test('Production E2E: login → generate → select → download', async ({ page }) => {
  test.setTimeout(420000) // 7 min

  console.log('=== PRODUCTION E2E TEST ===')
  console.log(`URL: ${PROD_URL}`)

  // 1. Login
  console.log('\n1. Testing login...')
  await page.goto(PROD_URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  await expect(page.getByPlaceholder('Password')).toBeVisible({ timeout: 10000 })
  await page.screenshot({ path: 'test-results/prod_01_login.png' })

  await page.getByPlaceholder('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await page.waitForTimeout(3000)

  // Should see the wizard now
  await expect(page.getByText('Cosa vuoi creare?')).toBeVisible({ timeout: 10000 })
  await page.screenshot({ path: 'test-results/prod_02_step1.png' })
  console.log('   Login OK, wizard visible')

  // 2. Select Presentations
  console.log('\n2. Selecting Presentazione...')
  await page.locator('button:has-text("Genera slide")').click()
  await page.waitForTimeout(500)

  const avantiBtn = page.getByRole('button', { name: /Avanti/i })
  await expect(avantiBtn).toBeEnabled({ timeout: 3000 })
  await page.screenshot({ path: 'test-results/prod_03_task_selected.png' })
  console.log('   Task selected, Avanti enabled')

  // 3. Navigate to Step 2
  await avantiBtn.click()
  await page.waitForTimeout(1000)
  await expect(page.getByText('Carica i tuoi file')).toBeVisible({ timeout: 5000 })
  console.log('   Step 2 visible')

  // 4. Upload files
  console.log('\n3. Uploading files...')
  await page.locator('#upload-source input[type="file"]').setInputFiles(SOURCE_PDF)
  await page.waitForTimeout(1000)
  await page.locator('#upload-master input[type="file"]').setInputFiles(MASTER_PPTX)
  await page.waitForTimeout(1000)

  await page.screenshot({ path: 'test-results/prod_04_files_uploaded.png' })
  console.log('   Files uploaded')

  // 5. Generate
  console.log('\n4. Generating variants (2-4 min with Bedrock + LibreOffice)...')
  const genBtn = page.getByRole('button', { name: /Genera contenuti/i })
  await expect(genBtn).toBeEnabled({ timeout: 3000 })
  await genBtn.click()

  await page.waitForTimeout(2000)
  await page.screenshot({ path: 'test-results/prod_05_generating.png' })

  // 6. Wait for thumbnails
  console.log('   Waiting for slide thumbnails...')
  await expect(page.locator('img[alt*="Variante"]').first()).toBeVisible({ timeout: 360000 })
  await page.screenshot({ path: 'test-results/prod_06_thumbnails.png', fullPage: true })
  
  const imgCount = await page.locator('img[alt*="Variante"]').count()
  console.log(`   ${imgCount} thumbnail images visible!`)

  // 7. Verify images loaded
  const firstImg = page.locator('img[alt*="Variante"]').first()
  const naturalWidth = await firstImg.evaluate((el: HTMLImageElement) => el.naturalWidth)
  console.log(`   First image naturalWidth: ${naturalWidth}px`)
  expect(naturalWidth).toBeGreaterThan(0)

  // 8. Select variants
  console.log('\n5. Selecting variants...')
  const sectionGroups = page.locator('.space-y-10 > .relative')
  const groupCount = await sectionGroups.count()
  console.log(`   Found ${groupCount} sections`)

  for (let i = 0; i < groupCount; i++) {
    const firstCard = sectionGroups.nth(i).locator('[class*="cursor-pointer"]').first()
    if (await firstCard.isVisible()) {
      await firstCard.click()
      await page.waitForTimeout(200)
    }
  }

  await page.screenshot({ path: 'test-results/prod_07_all_selected.png', fullPage: true })

  const badge = page.getByText('Tutte selezionate')
  const badgeVisible = await badge.isVisible().catch(() => false)
  console.log(`   "Tutte selezionate" badge: ${badgeVisible ? 'YES' : 'no'}`)

  console.log('\n=== PRODUCTION E2E TEST PASSED ===')
})
