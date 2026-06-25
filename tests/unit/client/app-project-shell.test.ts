// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import App from '../../../src/client/App.vue'
import { __resetActiveManifest } from '../../../src/client/composables/useActiveManifest.js'

vi.mock('../../../src/client/api.js', () => ({
  fetchHealth: vi.fn().mockResolvedValue({ version: '0.2.0' }),
  fetchConsumers: vi.fn().mockResolvedValue([
    { id: 'acme', title: 'Acme', dataSourceCount: 1, pageCount: 3 }
  ]),
  fetchConsumerManifest: vi.fn().mockResolvedValue({
    id: 'acme',
    schemaVersion: '0.1',
    title: 'Acme',
    nav: { style: 'projects', landingPage: 'landing', projectsLabel: 'workspaces' },
    pages: [
      { slug: 'landing', title: 'Landing', layout: 'sections', default: true, sections: [] },
      { slug: 'work', title: 'Work', layout: 'sections', sections: [] },
      { slug: 'detail', title: 'Detail', layout: 'sections', sections: [] }
    ]
  }),
  fetchProjects: vi.fn().mockResolvedValue([
    { projectId: 'web', rootDir: '/repos/web' },
    { projectId: 'api', rootDir: '/repos/api' }
  ])
}))

function makeRouter(path: string) {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/:consumerId', component: { template: '<div />' } },
      { path: '/:consumerId/:pageSlug', component: { template: '<div />' } },
      { path: '/:consumerId/:pageSlug/:routeParam', component: { template: '<div />' } }
    ]
  })
  router.push(path)
  return router
}

describe('App project shell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __resetActiveManifest()
  })

  it('expands the registered project named by a generic route segment', async () => {
    const router = makeRouter('/acme/work/api')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.find('.consumer-row.on .name').text()).toBe('api')
    expect(wrapper.findAll('.page-row .name').map((row) => row.text())).toEqual(['Work', 'Detail'])
  })
})
