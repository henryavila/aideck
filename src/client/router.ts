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
  ],
})
