<template>
  <div class="treeview-widget">
    <div v-if="nodes.length === 0" class="empty">No data</div>
    <tree-node
      v-for="(node, i) in nodes"
      :key="i"
      :node="node"
      :depth="0"
      :expand-depth="expandDepth"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, ref, h } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

const labelField = computed(() => String(props.config.labelField ?? 'label'))
const childrenField = computed(() => String(props.config.childrenField ?? 'children'))
const expandDepth = computed(() => Number(props.config.expandDepth ?? 1))

interface TreeNode {
  label: string
  children: TreeNode[]
}

function toNode(r: Record<string, unknown>): TreeNode {
  const raw = r[childrenField.value]
  const children = Array.isArray(raw)
    ? (raw as Record<string, unknown>[]).map(toNode)
    : []
  return { label: String(r[labelField.value] ?? JSON.stringify(r)), children }
}

const nodes = computed(() => props.source.map(toNode))

const TreeNode = defineComponent({
  name: 'TreeNode',
  props: {
    node: { type: Object as () => TreeNode, required: true },
    depth: { type: Number, default: 0 },
    expandDepth: { type: Number, default: 1 },
  },
  setup(nodeProps) {
    const open = ref(nodeProps.depth < nodeProps.expandDepth)
    const hasChildren = computed(() => nodeProps.node.children.length > 0)

    return () => {
      const children = hasChildren.value && open.value
        ? nodeProps.node.children.map((child, i) =>
            h(TreeNode, { key: i, node: child, depth: nodeProps.depth + 1, expandDepth: nodeProps.expandDepth })
          )
        : []

      return h('div', { class: 'tree-node', style: { paddingLeft: `${nodeProps.depth * 16}px` } }, [
        h('div', {
          class: ['tree-row', hasChildren.value ? 'has-children' : ''],
          onClick: () => { if (hasChildren.value) open.value = !open.value },
        }, [
          hasChildren.value
            ? h('span', { class: ['tree-arrow', open.value ? 'open' : ''] }, '▶')
            : h('span', { class: 'tree-leaf' }, '·'),
          h('span', { class: 'tree-label' }, nodeProps.node.label),
        ]),
        ...children,
      ])
    }
  },
})
</script>

<style scoped>
.treeview-widget {
  padding: var(--spacing-md);
  height: 100%;
  overflow: auto;
  font-size: var(--font-size-sm);
}

.empty {
  color: var(--color-text-muted);
}

:deep(.tree-node) {
  user-select: none;
}

:deep(.tree-row) {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 2px 0;
  color: var(--color-text-primary);
  border-left: 1px dotted var(--color-border-muted);
  margin-left: 4px;
  padding-left: var(--spacing-xs);
}

:deep(.tree-row.has-children) {
  cursor: pointer;
}

:deep(.tree-row:hover) {
  background: var(--color-bg-hover);
}

:deep(.tree-arrow) {
  font-size: 9px;
  color: var(--color-text-muted);
  transition: transform 0.15s;
  display: inline-block;
  width: 12px;
}

:deep(.tree-arrow.open) {
  transform: rotate(90deg);
}

:deep(.tree-leaf) {
  color: var(--color-text-muted);
  width: 12px;
  display: inline-block;
  text-align: center;
}

:deep(.tree-label) {
  color: var(--color-text-primary);
}
</style>
