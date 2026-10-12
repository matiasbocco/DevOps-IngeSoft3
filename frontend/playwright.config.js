import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',                // los dos archivos; cada job del pipeline corre el suyo por nombre
  timeout: 60_000,                 // tope de cada test
  expect: { timeout: 15_000 },     // tope de cada aserción (el default es 5 s)
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',   // el FRONT; la api usa API_BASE_URL
    trace: 'on-first-retry',       // la traza se graba en el retry de un fallo
    screenshot: 'only-on-failure', // captura de cada fallo en el reporte
  },
  retries: 1,                      // un retry absorbe una demora suelta; si pasa recién ahí, sale «flaky»
  reporter: [['html', { open: 'never' }], ['list']],
})
