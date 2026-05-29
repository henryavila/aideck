import { ref } from 'vue'

// Mobile off-canvas sidebar state. Shared singleton so the chrome toggle,
// the backdrop, and route changes all drive the same drawer.
const isOpen = ref(false)

export function useDrawer() {
  return {
    isOpen,
    open: () => { isOpen.value = true },
    close: () => { isOpen.value = false },
    toggle: () => { isOpen.value = !isOpen.value },
  }
}
