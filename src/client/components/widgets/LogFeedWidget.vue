<template>
  <WidgetFrame
    :title="title"
    icon="≡"
    :meta="meta"
    :live="live"
    body-class="tight"
    :state="lines.length === 0 ? 'empty' : 'ready'"
    empty-note="no log entries"
  >
    <div ref="containerRef" class="log">
      <span v-for="(line, i) in lines" :key="i" class="row">
        <span v-if="line.ts" class="ts">{{ line.ts }}</span>
        <span class="lv" :class="line.lv">{{ line.lvLabel }}</span>
        <span class="msg">{{ line.msg }}</span>
        <span v-if="line.key" class="key">{{ line.key }}</span>
        <span v-if="line.tail" class="msg">{{ line.tail }}</span>
        <span v-if="line.val" class="val"> {{ line.val }}</span>
      </span>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

const containerRef = ref<HTMLElement | null>(null)

const title = computed(() => (props.config.title as string | undefined) ?? 'Log · stdout')
const live = computed(() => props.config.live === true)

const tsField = computed(() => String(props.config.timestampField ?? 'ts'))
const msgField = computed(() => String(props.config.messageField ?? 'msg'))
const levelField = computed(() => String(props.config.levelField ?? 'lv'))
const maxLines = computed(() => Number(props.config.maxLines ?? 200))

// Normalize arbitrary level words onto the 4 terminal level classes.
const LEVEL_MAP: Record<string, string> = {
  ok: 'ok',
  success: 'ok',
  done: 'ok',
  info: 'info',
  log: 'info',
  debug: 'info',
  warn: 'warn',
  warning: 'warn',
  err: 'err',
  error: 'err',
  fail: 'err',
  failed: 'err',
}

function levelClass(lv: string): string {
  return LEVEL_MAP[lv.toLowerCase()] ?? 'info'
}

interface LogLine {
  ts: string
  lv: string
  lvLabel: string
  msg: string
  key: string
  tail: string
  val: string
}

const lines = computed<LogLine[]>(() => {
  const all = props.source.map((r): LogLine => {
    const rawLv = String(r[levelField.value] ?? 'info')
    const lv = levelClass(rawLv)
    return {
      ts: r[tsField.value] ? String(r[tsField.value]) : '',
      lv,
      lvLabel: `${rawLv}    `.slice(0, 4),
      msg: String(r[msgField.value] ?? r.message ?? JSON.stringify(r)),
      key: r.key != null ? String(r.key) : '',
      tail: r.tail != null ? String(r.tail) : '',
      val: r.val != null ? String(r.val) : '',
    }
  })
  return all.slice(-maxLines.value)
})

watch(lines, async () => {
  await nextTick()
  if (containerRef.value) {
    containerRef.value.scrollTop = containerRef.value.scrollHeight
  }
})

const meta = computed(() => {
  const n = lines.value.length
  return `${n} ${n === 1 ? 'line' : 'lines'}`
})
</script>
