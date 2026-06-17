import type { InjectionKey, Ref } from 'vue'

// Page-scoped reactive interaction state (§ cross-widget bus). A widget that
// `emits` a selection writes a key here; another widget's `source.param` can read
// that key (`{ field, state }`) to re-scope without navigation. Provided by the
// consumer page and reset whenever the page changes, so state never leaks across
// pages. It is ephemeral UI state — never canonical data (Iron Law: files own state).
export type PageState = Record<string, unknown>

export const PAGE_STATE_KEY: InjectionKey<Ref<PageState>> = Symbol('aideck.pageState')
