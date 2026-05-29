import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const base = process.env.SHOT_BASE ?? 'http://127.0.0.1:7799'
const out = 'docs/design-handoff/screenshots/after'
mkdirSync(out, { recursive: true })

const shots = [
  ['home', '/', 1440, 900],
  ['overview', '/aideck-demo/overview', 1440, 1000],
  ['board', '/aideck-demo/board', 1440, 1000],
  ['analytics', '/aideck-demo/analytics', 1440, 1000],
  ['widgets', '/aideck-demo/widgets', 1440, 1300],
  ['projects', '/aideck-demo/projects', 1440, 1100],
  ['docs', '/aideck-demo/docs', 1440, 1200],
  ['home-mobile', '/', 390, 844],
  ['overview-mobile', '/aideck-demo/overview', 390, 844],
  ['board-mobile', '/aideck-demo/board', 390, 844],
]

const browser = await chromium.launch()
for (const [name, path, width, height] of shots) {
  const page = await browser.newPage({ viewport: { width, height } })
  try {
    // 'networkidle' never settles — the SSE connection stays open. Wait for
    // the app shell + a render settle window instead.
    await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForSelector('.app', { timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${out}/${name}.png` })
    console.log('shot', name)
  } catch (e) {
    console.log('FAIL', name, String(e).slice(0, 120))
  }
  await page.close()
}
await browser.close()
console.log('DONE ->', out)
