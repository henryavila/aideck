import { ref } from 'vue'

// Command-palette open state. Shared singleton so the chrome ⌘K trigger,
// the global keybinding, and the palette component all agree.
const isOpen = ref(false)

export function usePalette() {
  return {
    isOpen,
    open: () => { isOpen.value = true },
    close: () => { isOpen.value = false },
    toggle: () => { isOpen.value = !isOpen.value },
  }
}
