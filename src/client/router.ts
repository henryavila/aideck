import { createRouter, createWebHistory } from 'vue-router'
import HomePage from './pages/HomePage.vue'
import ConsumerPage from './pages/ConsumerPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/:consumerId', component: ConsumerPage },
    { path: '/:consumerId/:pageSlug', component: ConsumerPage },
    { path: '/:consumerId/:pageSlug/:routeParam', component: ConsumerPage },
    // §2c drill-down: projectId-scoped detail page (/plan/:projectId/:slug etc.).
    // The named params projectId + slug are matched by a composite source.param.
    { path: '/:consumerId/:pageSlug/:projectId/:slug', component: ConsumerPage },
  ],
})
