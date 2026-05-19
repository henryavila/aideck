import { describe, expect, it } from 'vitest'
import { createEventBus } from '../../../src/server/event-bus.js'

const baseTick = { kind: 'health-tick' as const, uptimeMs: 0 }

describe('createEventBus', () => {
  it('delivers emitted events to all subscribers', () => {
    const bus = createEventBus()
    const a: unknown[] = []
    const b: unknown[] = []
    bus.subscribe((e) => a.push(e))
    bus.subscribe((e) => b.push(e))
    bus.emit({ ...baseTick, uptimeMs: 1 })
    bus.emit({ ...baseTick, uptimeMs: 2 })
    expect(a).toHaveLength(2)
    expect(b).toHaveLength(2)
  })

  it('replaySince returns events newer than the cursor', () => {
    let t = 1000
    const bus = createEventBus({ retentionMs: 60_000, now: () => t })
    const e1 = bus.emit({ ...baseTick, uptimeMs: 1 })
    t = 2000
    const e2 = bus.emit({ ...baseTick, uptimeMs: 2 })
    t = 3000
    const e3 = bus.emit({ ...baseTick, uptimeMs: 3 })
    const after = bus.replaySince(e1.id)
    expect(after).toEqual([e2, e3])
  })

  it('evicts events older than retentionMs', () => {
    let t = 0
    const bus = createEventBus({ retentionMs: 1_000, now: () => t })
    bus.emit({ ...baseTick, uptimeMs: 1 })
    t = 5_000
    bus.emit({ ...baseTick, uptimeMs: 2 })
    expect(bus.size()).toBe(1)
  })

  it('subscribe returns an unsubscribe function', () => {
    const bus = createEventBus()
    const got: unknown[] = []
    const off = bus.subscribe((e) => got.push(e))
    bus.emit({ ...baseTick, uptimeMs: 1 })
    off()
    bus.emit({ ...baseTick, uptimeMs: 2 })
    expect(got).toHaveLength(1)
  })

  it('isolates a throwing listener from other subscribers', () => {
    const bus = createEventBus()
    bus.subscribe(() => { throw new Error('boom') })
    const ok: unknown[] = []
    bus.subscribe((e) => ok.push(e))
    bus.emit({ ...baseTick, uptimeMs: 1 })
    expect(ok).toHaveLength(1)
  })
})
