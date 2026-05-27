// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { ref } from 'vue'
import App from '../../../src/client/App.vue'

const demoRef = ref(false)

vi.mock('../../../src/client/composables/useDemoMode.js', () => ({
  useDemoMode: vi.fn(() => ({ isDemo: demoRef })),
}))

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', component: { template: '<div>home</div>' } }],
})

describe('App demo banner', () => {
  it('shows demo banner when demo mode is active', async () => {
    demoRef.value = true
    const wrapper = mount(App, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.find('.demo-banner').exists()).toBe(true)
    expect(wrapper.text()).toContain('DEMO MODE')
    expect(wrapper.text()).toContain('seeded fixtures')
  })

  it('hides demo banner when not in demo mode', async () => {
    demoRef.value = false
    const wrapper = mount(App, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.find('.demo-banner').exists()).toBe(false)
  })

  it('banner is not dismissible (no close button)', async () => {
    demoRef.value = true
    const wrapper = mount(App, { global: { plugins: [router] } })
    await flushPromises()

    const banner = wrapper.find('.demo-banner')
    expect(banner.find('button').exists()).toBe(false)
  })
})
