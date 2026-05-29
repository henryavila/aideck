function builtins(): Record<string, string> {
  const now = new Date()
  return {
    isoDate: now.toISOString().slice(0, 10),
    now: now.toISOString(),
  }
}

/**
 * Render `{{ var }}` placeholders. When `escapeValue` is supplied, each
 * substituted value is passed through it before insertion — callers that
 * splice the result into a shell command MUST pass a shell-escaping function
 * so attacker-controlled args cannot inject commands.
 */
export function renderTemplate(
  template: string,
  vars: Record<string, unknown>,
  escapeValue?: (value: string) => string
): string {
  const resolved: Record<string, unknown> = { ...builtins(), ...vars }
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) => {
    if (!(name in resolved)) return match
    const value = resolved[name]
    const str = typeof value === 'string' ? value : JSON.stringify(value)
    return escapeValue ? escapeValue(str) : str
  })
}
