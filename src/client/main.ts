import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router.js'

// Self-hosted fonts (Iron Law #4: no CDN / external resources)
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import '@fontsource/jetbrains-mono/700.css'

// Design system — order matters (responsive overrides load last)
import './styles/tokens.css'
import './styles/base.css'
import './styles/shell.css'
import './styles/sections.css'
import './styles/board.css'
import './styles/home.css'
import './styles/widgets.css'
import './styles/states.css'
import './styles/palette.css'
import './styles/live.css'
import './styles/responsive.css'

createApp(App).use(router).mount('#app')
