<template>
  <i v-if="mdi" class="mdi" :class="mdi" aria-hidden="true" />
  <span v-else class="icon-glyph">{{ glyph }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { mdiClass, iconGlyph } from '../../utils/icon.js'

// Renders a manifest icon string: an `mdi:<name>` token uses the bundled MDI
// webfont; a literal glyph/emoji renders as text; anything else falls back to ◆.
const props = defineProps<{ icon?: string }>()

const mdi = computed(() => mdiClass(props.icon))
const glyph = computed(() => iconGlyph(props.icon))
</script>
