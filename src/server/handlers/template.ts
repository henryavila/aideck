function builtins(): Record<string, string> {
  const now = new Date()
  return {
    isoDate: now.toISOString().slice(0, 10),
    now: now.toISOString(),
  }
}

export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  const resolved: Record<string, unknown> = { ...builtins(), ...vars }
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) => {
    if (!(name in resolved)) return match
    const value = resolved[name]
    if (typeof value === 'string') return value
    return JSON.stringify(value)
  })
}
