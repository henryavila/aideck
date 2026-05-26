import { cp, mkdir, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEMO_SOURCE = join(__dirname, 'consumer')

export async function seedDemoConsumer(baseDir?: string): Promise<string> {
  const base = baseDir ?? join(homedir(), '.aideck')
  const target = join(base, 'consumers', 'aideck-demo')
  await rm(target, { recursive: true, force: true })
  await mkdir(join(base, 'consumers'), { recursive: true })
  await cp(DEMO_SOURCE, target, { recursive: true })
  return target
}

export async function cleanDemoConsumer(baseDir?: string): Promise<void> {
  const base = baseDir ?? join(homedir(), '.aideck')
  const target = join(base, 'consumers', 'aideck-demo')
  await rm(target, { recursive: true, force: true })
}
