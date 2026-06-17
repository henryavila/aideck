// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import Sidebar from '../../../src/client/components/shell/Sidebar.vue'
import {
  landingSlug,
  pinLanding,
  type PageMeta,
} from '../../../src/client/composables/useActiveManifest.js'

const Blank = { template: '<div />' }
function router() {
  const r = createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', component: Blank },
      { path: '/:consumerId', component: Blank },
      { path: '/:consumerId/:pageSlug', component: Blank }
    ]
  })
  return r
}

const consumers = [
  { id: 'alpha', title: 'Alpha', dataSourceCount: 2, pageCount: 3 },
  { id: 'beta', title: 'Beta', dataSourceCount: 1, pageCount: 1 }
]
const pages: PageMeta[] = [
  { slug: 'home', title: 'Home', icon: '🏠' },
  { slug: 'docs', title: 'Docs', icon: 'mdi:book' }
]

describe('Sidebar nav.style: sidebar', () => {
  it('nests the active consumer pages and not other consumers', async () => {
    const wrapper = mount(Sidebar, {
      global: { plugins: [router()] },
      props: { consumers, currentId: 'alpha', pages, currentPageSlug: 'docs', showIcons: true }
    })
    const rows = wrapper.findAll('.page-row')
    expect(rows).toHaveLength(2)
    expect(wrapper.text()).toContain('Home')
    expect(wrapper.text()).toContain('Docs')
    // active page row is marked
    expect(wrapper.find('.page-row.on').text()).toContain('Docs')
  })

  it('honors a page.route override for the nested link target', () => {
    const wrapper = mount(Sidebar, {
      global: { plugins: [router()] },
      props: {
        consumers,
        currentId: 'alpha',
        pages: [{ slug: 'home', title: 'Home', route: '/alpha/custom' }],
        showIcons: false
      }
    })
    expect(wrapper.find('.page-row').attributes('href')).toContain('/alpha/custom')
  })

  it('renders no page rows when pages are empty (tabs mode)', () => {
    const wrapper = mount(Sidebar, {
      global: { plugins: [router()] },
      props: { consumers, currentId: 'alpha', pages: [] }
    })
    expect(wrapper.findAll('.page-row')).toHaveLength(0)
  })

  it('renders a glyph icon as text and an mdi token via the webfont class', () => {
    const wrapper = mount(Sidebar, {
      global: { plugins: [router()] },
      props: { consumers, currentId: 'alpha', pages, showIcons: true }
    })
    const ico = wrapper.findAll('.page-ico')
    expect(ico).toHaveLength(2)
    expect(ico[0].text()).toBe('🏠')
    // 'mdi:book' renders the bundled webfont glyph, not the ◆ fallback
    expect(ico[1].find('i.mdi.mdi-book').exists()).toBe(true)
  })

  it('renders the (already pinned) landing page first, marked active at root', () => {
    // App.vue passes pinLanding(pages) + activePageSlug (= landingSlug at root).
    const declared: PageMeta[] = [
      { slug: 'foco', title: 'Foco' },
      { slug: 'panorama', title: 'Panorama', default: true },
    ]
    const wrapper = mount(Sidebar, {
      global: { plugins: [router()] },
      props: {
        consumers,
        currentId: 'alpha',
        pages: pinLanding(declared),
        currentPageSlug: landingSlug(declared), // what App.vue computes at /:consumerId
      },
    })
    const names = wrapper.findAll('.page-row .name').map((n) => n.text())
    expect(names).toEqual(['Panorama', 'Foco'])
    // at the consumer root the landing row reads active
    expect(wrapper.find('.page-row.on .name').text()).toBe('Panorama')
  })
})

describe('landing helpers (G4: default page = landing)', () => {
  const pages: PageMeta[] = [
    { slug: 'foco', title: 'Foco' },
    { slug: 'panorama', title: 'Panorama', default: true },
    { slug: 'concluidos', title: 'Concluídos' },
  ]

  it('landingSlug picks the default page, else the first', () => {
    expect(landingSlug(pages)).toBe('panorama')
    expect(landingSlug([{ slug: 'a', title: 'A' }, { slug: 'b', title: 'B' }])).toBe('a')
    expect(landingSlug([])).toBeUndefined()
  })

  it('pinLanding moves the default page to the front, keeping the rest in order', () => {
    expect(pinLanding(pages).map((p) => p.slug)).toEqual(['panorama', 'foco', 'concluidos'])
  })

  it('pinLanding is a no-op when no page is default', () => {
    const noDefault: PageMeta[] = [{ slug: 'a', title: 'A' }, { slug: 'b', title: 'B' }]
    expect(pinLanding(noDefault).map((p) => p.slug)).toEqual(['a', 'b'])
  })
})
