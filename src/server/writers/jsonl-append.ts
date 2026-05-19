/**
 * Atomic JSONL append.
 *
 * POSIX guarantees atomic write(2) for byte counts below PIPE_BUF (4096 on
 * Linux/macOS) when opened with O_APPEND. Node's `fs.appendFile` uses
 * `open(O_WRONLY|O_CREAT|O_APPEND)` under the hood, so a single
 * `appendJsonlLine` of a typical (sub-kilobyte) record is interleave-safe
 * against concurrent appenders.
 *
 * Lines longer than 4 KB lose this guarantee. v0.1 contracts (Annotation,
 * Highlight, Decision, IntentRecord, etc.) cap well under that ceiling; a
 * cooperative lock can be added in v0.2 if a heavier payload type emerges.
 */
import { appendFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

export async function appendJsonlLine(path: string, payload: object): Promise<void> {
  const serialized = JSON.stringify(payload)
  if (serialized === undefined) {
    throw new TypeError('appendJsonlLine: payload is not JSON-serializable')
  }
  await mkdir(dirname(path), { recursive: true })
  await appendFile(path, `${serialized}\n`, { flag: 'a' })
}
