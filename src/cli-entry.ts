import { runCli } from './cli.js'

runCli().then(
  (code) => {
    if (code >= 0) process.exit(code)
  },
  (cause) => {
    process.stderr.write(`aideck: ${cause instanceof Error ? cause.message : String(cause)}\n`)
    process.exit(1)
  }
)
