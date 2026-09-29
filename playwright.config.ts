import { defineConfig } from '@playwright/test'

const BACKEND_PORT = 8099
const FRONTEND_PORT = 3099
const API_BASE = `http://localhost:${BACKEND_PORT}`

// Read by e2e/app.spec.ts's API-level test.
process.env.SCOLASTICA_API_URL = API_BASE

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
  },
  webServer: [
    {
      // FAKE_LLM: the whole point of this suite is to exercise the
      // pipeline (upload, job state machine, rendering, build) without
      // needing real Bedrock/Anthropic credentials or spending on every
      // run — see backend/llm/__init__.py's _default_fake_response.
      command: `python -m uvicorn main:app --app-dir backend --port ${BACKEND_PORT}`,
      port: BACKEND_PORT,
      env: {
        FAKE_LLM: '1',
        ALLOWED_ORIGINS: `http://localhost:${FRONTEND_PORT}`,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: `npm --prefix frontend run dev -- -p ${FRONTEND_PORT}`,
      port: FRONTEND_PORT,
      env: {
        NEXT_PUBLIC_API_URL: API_BASE,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
})
