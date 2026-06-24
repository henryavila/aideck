// Manifest icons may be a literal glyph/emoji ("🎯", "◆") or an icon-font token.
// `mdi:<name>` tokens render via the bundled Material Design Icons webfont (see
// `mdiClass`); other tokens have no font, so they degrade to a neutral mark.
// Prefer the <Icon> component for rendering — it picks font vs glyph correctly.
const FALLBACK_GLYPH = '◆'

/** The MDI webfont class for an `mdi:<name>` token, else null. */
export function mdiClass(icon?: string): string | null {
  return icon && icon.startsWith('mdi:') ? `mdi-${icon.slice(4)}` : null
}

/** Literal glyph for non-font icons; fallback mark for tokens (incl. mdi:) and empty. */
export function iconGlyph(icon?: string): string {
  if (!icon) return FALLBACK_GLYPH
  return icon.includes(':') ? FALLBACK_GLYPH : icon
}

/** Whether aiDeck can render this icon as something other than the fallback mark. */
export function isRenderableIcon(icon?: string): boolean {
  return !!icon && (!icon.includes(':') || icon.startsWith('mdi:'))
}
