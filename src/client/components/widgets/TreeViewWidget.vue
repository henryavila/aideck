<template>
  <WidgetFrame
    :title="title"
    :icon="icon"
    :meta="meta"
    :live="live"
    :state="nodes.length === 0 ? 'empty' : 'ready'"
    body-class="flush"
    empty-note="no tree data"
  >
    <div class="tree">
      <tree-node
        v-for="(node, i) in nodes"
        :key="i"
        :node="node"
        :depth="0"
        :expand-depth="expandDepth"
      />
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed, defineComponent, ref, h } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'
import { statusInfo } from '../../utils/status.js'
import { useStatuses } from '../../composables/useStatuses.js'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

const statuses = useStatuses(props)

const title = computed(() => props.config.title as string | undefined)
const icon = computed(() => (props.config.icon as string | undefined) ?? '⊟')
const live = computed(() => props.config.live === true)

const labelField = computed(() => String(props.config.labelField ?? 'label'))
const idField = computed(() => String(props.config.idField ?? 'id'))
const statusField = computed(() => String(props.config.statusField ?? 'status'))
const childrenField = computed(() => String(props.config.childrenField ?? 'children'))
const expandDepth = computed(() => Number(props.config.expandDepth ?? 2))

interface TreeNode {
  id: string
  label: string
  status?: string
  priority?: number
  children: TreeNode[]
}

function toNode(r: Record<string, unknown>): TreeNode {
  const raw = r[childrenField.value]
  const children = Array.isArray(raw)
    ? (raw as Record<string, unknown>[]).map(toNode)
    : []
  const id = r[idField.value]
  const status = r[statusField.value]
  const priority = r.priority
  return {
    id: id != null ? String(id) : '',
    label: String(r[labelField.value] ?? r.name ?? r.title ?? JSON.stringify(r)),
    status: status != null ? String(status) : undefined,
    priority: typeof priority === 'number' ? priority : undefined,
    children,
  }
}

const nodes = computed(() => props.source.map(toNode))

const meta = computed(() => {
  const top = nodes.value.length
  const leaves = nodes.value.reduce((n, p) => n + p.children.length, 0)
  if (props.config.meta) return String(props.config.meta)
  return `${top} ${top === 1 ? 'node' : 'nodes'}${leaves ? ` · ${leaves} children` : ''}`
})

const TreeNode = defineComponent({
  name: 'TreeNode',
  props: {
    node: { type: Object as () => TreeNode, required: true },
    depth: { type: Number, default: 0 },
    expandDepth: { type: Number, default: 2 },
  },
  setup(nodeProps) {
    const open = ref(nodeProps.depth < nodeProps.expandDepth)
    const hasKids = computed(() => nodeProps.node.children.length > 0)
    const isProject = computed(() => nodeProps.depth === 0 || hasKids.value)

    return () => {
      const node = nodeProps.node
      const info = node.status ? statusInfo(node.status, statuses.value) : null

      const rowChildren = [
        h(
          'span',
          {
            class: ['caret', hasKids.value ? '' : 'empty'],
            onClick: (e: MouseEvent) => {
              e.stopPropagation()
              if (hasKids.value) open.value = !open.value
            },
          },
          hasKids.value ? (open.value ? '▾' : '▸') : '·',
        ),
        h('span', { class: 'glyph' }, isProject.value ? '▣' : '▸'),
        node.id ? h('span', { class: 'tree-id' }, node.id) : null,
        h('span', { class: 'tree-name' }, node.label),
        node.priority != null && !hasKids.value
          ? h('span', { class: 'tree-meta' }, `p${node.priority}`)
          : null,
        hasKids.value
          ? h(
              'span',
              { class: 'tree-meta' },
              `${node.children.length} ${node.children.length === 1 ? 'child' : 'children'}`,
            )
          : null,
        info
          ? h('span', { class: ['tree-chip', info.tone] }, [
              h('span', { class: 'dot' }),
              h('span', info.label),
            ])
          : null,
      ]

      const row = h(
        'div',
        {
          class: ['tree-row', isProject.value ? 'is-project' : 'is-task'],
          tabindex: 0,
          onClick: () => {
            if (hasKids.value) open.value = !open.value
          },
        },
        rowChildren,
      )

      const kids =
        hasKids.value && open.value
          ? h(
              'div',
              { class: 'tree-children' },
              node.children.map((child, i) =>
                h(TreeNode, {
                  key: i,
                  node: child,
                  depth: nodeProps.depth + 1,
                  expandDepth: nodeProps.expandDepth,
                }),
              ),
            )
          : null

      return [row, kids]
    }
  },
})
</script>
