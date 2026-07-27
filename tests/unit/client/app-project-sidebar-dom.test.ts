// @vitest-environment jsdom
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import App from '../../../src/client/App.vue'
import { buildApp, type BuiltApp } from '../../../src/server/index.js'
import { __resetActiveManifest } from '../../../src/client/composables/useActiveManifest.js'

const Blank = { template: '<div />' }

let baseDir: string
let rootDir: string
let aideckBaseDir: string

function makeRouter(path: string) {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: Blank },
      { path: '/:consumerId', component: Blank },
      { path: '/:consumerId/:pageSlug', component: Blank },
      { path: '/:consumerId/:pageSlug/:routeParam', component: Blank },
      { path: '/:consumerId/:pageSlug/:projectId/:slug', component: Blank },
    ],
  })
  router.push(path)
  return router
}

async function writeAtomicSkillsConsumer() {
  const consumerDir = join(aideckBaseDir, 'consumers', 'atomic-skills')
  await mkdir(consumerDir, { recursive: true })
  await writeFile(
    join(consumerDir, 'manifest.yaml'),
    [
      'schemaVersion: "0.1"',
      'id: atomic-skills',
      'mcpNamespace: atomic_skills',
      'title: Atomic Skills',
      'nav:',
      '  style: projects',
      '  landingPage: panorama',
      '  projectsLabel: PROJETOS',
      'dataSources:',
      '  - id: plans',
      '    root: project',
      '    path: .atomic-skills/.aideck/state/plans.json',
      '    format: json',
      'pages:',
      '  - slug: panorama',
      '    title: Panorama',
      '    default: true',
      '    layout: sections',
      '    sections: []',
      '  - slug: foco-agora',
      '    title: Foco agora',
      '    layout: sections',
      '    sections: []',
      '  - slug: plan',
      '    title: Detalhe do plano',
      '    layout: sections',
      '    sections: []',
      '  - slug: help',
      '    title: Ajuda',
      '    showInNav: false',
      '    layout: sections',
      '    sections: []',
      '',
    ].join('\n'),
  )
}

async function postProject(app: BuiltApp['app'], body: unknown) {
  return app.fetch(new Request('http://127.0.0.1/api/projects/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }))
}

function installFetch(app: BuiltApp['app']) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' || input instanceof URL ? String(input) : input.url
    const url = new URL(raw, 'http://127.0.0.1')
    return app.fetch(new Request(url, init))
  }) as typeof fetch
}

describe('App project sidebar DOM', () => {
  beforeEach(async () => {
    __resetActiveManifest()
    baseDir = await mkdtemp(join(tmpdir(), 'aideck-dom-'))
    rootDir = join(baseDir, 'plan-dependencies')
    aideckBaseDir = join(baseDir, 'aideck-home')
    await mkdir(join(rootDir, '.atomic-skills'), { recursive: true })
    await writeAtomicSkillsConsumer()
  })

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true })
  })

  it('renders the canonical project id and the plan detail item after explicit re-registration', async () => {
    const built = buildApp({
      rootDir,
      aideckBaseDir,
      skipWatcher: true,
      demo: false,
      version: 'test',
    })
    await built.consumers.scan()
    expect(built.consumers.errors()).toEqual([])

    const basenameRegistration = await postProject(built.app, { rootDir })
    expect(basenameRegistration.status).toBe(201)
    const explicitRegistration = await postProject(built.app, { rootDir, projectId: 'atomic-skills' })
    expect(explicitRegistration.status).toBe(200)

    installFetch(built.app)
    const router = makeRouter('/atomic-skills/foco-agora?project=plan-dependencies')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins: [router] } })
    for (let i = 0; i < 5; i++) await flushPromises()

    const projectNames = wrapper
      .findAll('.side .consumer-row')
      .filter((row) => !row.classes('landing-row'))
      .map((row) => row.find('.name').text())
    expect(projectNames).toEqual(['atomic-skills'])
    expect(projectNames).not.toContain('plan-dependencies')

    const pageNames = wrapper.findAll('.side .page-row .name').map((row) => row.text())
    expect(pageNames).toContain('Foco agora')
    expect(pageNames).toContain('Detalhe do plano')
    expect(pageNames).not.toContain('Ajuda')
  })
})
