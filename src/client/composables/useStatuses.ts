import { computed, type ComputedRef } from 'vue'
import type { StatusOverrides } from '../utils/status.js'

/**
 * The consumer-supplied status vocabulary for a widget, read reactively from
 * `config.statuses` (threaded into `statusInfo(value, statuses)`). Extracted
 * because this identical computed was copy-pasted into ~10 status-rendering
 * widgets — the lockstep risk already bit CardWidget once.
 */
export function useStatuses(props: {
  config: Record<string, unknown>
}): ComputedRef<StatusOverrides | undefined> {
  return computed(() => props.config.statuses as StatusOverrides | undefined)
}
