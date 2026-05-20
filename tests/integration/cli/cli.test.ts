// @vitest-environment node
import { Writable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { runCli } from '../../../src/cli.js'

function captureStream(): { stream: Writable; output: () => string } {
  const chunks: Buffer[] = []
  const stream = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(Buffer.from(chunk))
      cb()
    }
  })
  return { stream, output: () => Buffer.concat(chunks).toString('utf8') }
}

describe('aideck --help', () => {
  it('prints help and returns 0', async () => {
    const out = captureStream()
    const err = captureStream()
    const code = await runCli({ argv: ['--help'], stdout: out.stream, stderr: err.stream })
    expect(code).toBe(0)
    const text = out.output()
    expect(text).toContain('USAGE')
    expect(text).toContain('COMMANDS')
    expect(text).toContain('env')
    expect(text).toContain('serve')
  })

  it('prints help when no subcommand is given', async () => {
    const out = captureStream()
    const err = captureStream()
    const code = await runCli({ argv: [], stdout: out.stream, stderr: err.stream })
    expect(code).toBe(0)
    expect(out.output()).toContain('aideck')
  })
})

describe('aideck --version', () => {
  it('prints a semver version and returns 0', async () => {
    const out = captureStream()
    const err = captureStream()
    const code = await runCli({ argv: ['--version'], stdout: out.stream, stderr: err.stream })
    expect(code).toBe(0)
    expect(out.output().trim()).toMatch(/^\d+\.\d+\.\d+/)
  })
})

describe('aideck — invalid input', () => {
  it('rejects an unknown subcommand with exit 1', async () => {
    const out = captureStream()
    const err = captureStream()
    const code = await runCli({ argv: ['bogus'], stdout: out.stream, stderr: err.stream })
    expect(code).toBe(1)
    expect(err.output()).toContain('unknown subcommand')
  })

  it('rejects --port out of range with exit 1', async () => {
    const out = captureStream()
    const err = captureStream()
    const code = await runCli({ argv: ['serve', '--port=80'], stdout: out.stream, stderr: err.stream })
    expect(code).toBe(1)
    expect(err.output()).toContain('1024')
  })

  it('rejects --no-mcp (no such flag) with exit 1', async () => {
    const out = captureStream()
    const err = captureStream()
    const code = await runCli({ argv: ['serve', '--no-mcp'], stdout: out.stream, stderr: err.stream })
    expect(code).toBe(1)
  })

  it('rejects --static-dir pointing at a non-existent path with exit 1', async () => {
    const out = captureStream()
    const err = captureStream()
    const code = await runCli({
      argv: ['serve', '--static-dir=/nonexistent/path/aideck-test-' + Date.now()],
      stdout: out.stream,
      stderr: err.stream
    })
    expect(code).toBe(1)
    expect(err.output()).toContain('does not exist')
  })

  it('rejects --static-dir pointing at a file (not a directory) with exit 1', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const tmp = await mkdtemp(join(tmpdir(), 'aideck-cli-'))
    const file = join(tmp, 'not-a-dir.txt')
    await writeFile(file, 'hello')
    try {
      const out = captureStream()
      const err = captureStream()
      const code = await runCli({
        argv: ['serve', `--static-dir=${file}`],
        stdout: out.stream,
        stderr: err.stream
      })
      expect(code).toBe(1)
      expect(err.output()).toContain('not a directory')
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })
})

describe('aideck --help — --static-dir documented', () => {
  it('mentions the --static-dir flag in help output', async () => {
    const out = captureStream()
    const err = captureStream()
    const code = await runCli({ argv: ['--help'], stdout: out.stream, stderr: err.stream })
    expect(code).toBe(0)
    expect(out.output()).toContain('--static-dir')
  })
})

describe('aideck env (no env file present)', () => {
  it('exits 0 and prints nothing when no env file exists', async () => {
    const out = captureStream()
    const err = captureStream()
    // The HOME env var is not overridable per-call here; the test relies on the
    // process homedir not having a stale env file. This is normally the case in
    // CI; if it fails locally because a previous serve left an env file behind,
    // remove ~/.aideck/env and rerun.
    const code = await runCli({ argv: ['env'], stdout: out.stream, stderr: err.stream })
    expect(code).toBe(0)
    expect(err.output()).toBe('')
  })
})
