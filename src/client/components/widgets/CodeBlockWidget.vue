<template>
  <WidgetFrame :title="title" :icon="icon ?? '⟨⟩'" :meta="meta" :live="live" body-class="flush">
    <div class="code-block" :class="{ 'is-tall': tall }">
      <div class="cb-head">
        <span class="cb-lang">{{ language }}</span>
        <button
          type="button"
          class="cb-copy"
          :class="{ done: copied }"
          @click="doCopy"
        >{{ copied ? '✓ copied' : '⧉ copy' }}</button>
      </div>
      <div class="cb-scroll">
        <pre><div v-for="(ln, i) in lines" :key="i" class="cb-line"><span
          v-if="lineNumbers"
          class="cb-num"
        >{{ i + 1 }}</span><span class="cb-code"><span
          v-for="(tk, j) in tokenizeLine(ln, language)"
          :key="j"
          :class="tk.cls"
        >{{ tk.t }}</span>{{ ln === '' ? ' ' : '' }}</span></div></pre>
      </div>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

const title = computed(() => props.config.title as string | undefined)
const icon = computed(() => props.config.icon as string | undefined)
const meta = computed(() => props.config.meta as string | undefined)
const live = computed(() => props.config.live === true)
const lineNumbers = computed(() => props.config.lineNumbers === true)
const tall = computed(() => props.config.tall === true)

const language = computed(() => String(props.config.language ?? 'text'))

const content = computed(() => {
  const field = String(props.config.field ?? 'content')
  const row = props.source[0]
  if (row && row[field] !== undefined) return String(row[field])
  if (props.config.content !== undefined) return String(props.config.content)
  return ''
})

const lines = computed(() => content.value.replace(/\n$/, '').split('\n'))

const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined
function doCopy() {
  try {
    void navigator.clipboard?.writeText(content.value)
  } catch {
    // clipboard unavailable (e.g. non-secure context) — silently no-op
  }
  copied.value = true
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copied.value = false
  }, 1400)
}

// ── Lightweight per-language tokenizer (ported from design handoff) ──────
interface Token {
  t: string
  cls?: string
}

const KW_TS =
  /\b(export|import|interface|type|const|let|var|function|return|if|else|for|while|class|extends|implements|new|async|await|public|private|readonly|enum|namespace|as|from|default)\b/
const TYPES =
  /\b(string|number|boolean|void|any|unknown|never|object|Promise|Array|Record|Consumer|Widget|Page)\b/

function valueTokens(s: string): Token[] {
  const out: Token[] = []
  const trimmed = s.replace(/^\s+/, '')
  const lead = s.slice(0, s.length - trimmed.length)
  if (lead) out.push({ t: lead })
  if (!trimmed) return out
  if (/^["'].*["']$/.test(trimmed)) out.push({ t: trimmed, cls: 'tk-str' })
  else if (/^\d+$/.test(trimmed)) out.push({ t: trimmed, cls: 'tk-num' })
  else if (/^(true|false|null)$/.test(trimmed)) out.push({ t: trimmed, cls: 'tk-kw' })
  else out.push({ t: trimmed, cls: 'tk-str' })
  return out
}

function tokenizeLine(line: string, lang: string): Token[] {
  const tokens: Token[] = []
  if (lang === 'yaml') {
    const cm = line.indexOf('#')
    let work = line
    let trailing: string | null = null
    if (cm >= 0) {
      trailing = line.slice(cm)
      work = line.slice(0, cm)
    }
    const kv = /^(\s*)([\w.-]+)(:)(.*)$/.exec(work)
    const li = /^(\s*)(- )(.*)$/.exec(work)
    if (kv) {
      tokens.push({ t: kv[1] })
      tokens.push({ t: kv[2], cls: 'tk-key' })
      tokens.push({ t: kv[3], cls: 'tk-pun' })
      if (kv[4]) tokens.push(...valueTokens(kv[4]))
    } else if (li) {
      tokens.push({ t: li[1] })
      tokens.push({ t: li[2], cls: 'tk-pun' })
      tokens.push(...valueTokens(li[3]))
    } else {
      tokens.push({ t: work })
    }
    if (trailing) tokens.push({ t: trailing, cls: 'tk-com' })
    return tokens
  }
  if (lang === 'shell' || lang === 'bash' || lang === 'sh') {
    const cm = line.indexOf('#')
    let work = line
    let trailing: string | null = null
    if (cm >= 0 && !line.slice(0, cm).includes('"')) {
      trailing = line.slice(cm)
      work = line.slice(0, cm)
    }
    const parts = work.split(/(\s+)/)
    parts.forEach((p, idx) => {
      if (/^\s+$/.test(p)) {
        tokens.push({ t: p })
        return
      }
      if (idx === 0 && /^[\w-]+$/.test(p)) {
        tokens.push({ t: p, cls: 'tk-fn' })
        return
      }
      if (/^--?[\w-]+$/.test(p)) {
        tokens.push({ t: p, cls: 'tk-key' })
        return
      }
      if (/^\d+$/.test(p)) {
        tokens.push({ t: p, cls: 'tk-num' })
        return
      }
      tokens.push({ t: p })
    })
    if (trailing) tokens.push({ t: trailing, cls: 'tk-com' })
    return tokens
  }
  // ts / js / typescript / default
  const cm = line.indexOf('//')
  let work = line
  let trailing: string | null = null
  if (cm >= 0) {
    trailing = line.slice(cm)
    work = line.slice(0, cm)
  }
  const re = /(\s+|[{}()[\]<>:;,.?=|&]+|"[^"]*"|'[^']*'|`[^`]*`|[A-Za-z_$][\w$]*|\d+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(work)) !== null) {
    const t = m[0]
    if (/^\s+$/.test(t)) tokens.push({ t })
    else if (/^["'`]/.test(t)) tokens.push({ t, cls: 'tk-str' })
    else if (/^\d+$/.test(t)) tokens.push({ t, cls: 'tk-num' })
    else if (KW_TS.test(t)) tokens.push({ t, cls: 'tk-kw' })
    else if (TYPES.test(t)) tokens.push({ t, cls: 'tk-typ' })
    else if (/^[{}()[\]<>:;,.?=|&]+$/.test(t)) tokens.push({ t, cls: 'tk-pun' })
    else tokens.push({ t })
  }
  if (trailing) tokens.push({ t: trailing, cls: 'tk-com' })
  return tokens
}
</script>
