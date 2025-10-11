import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Inicio',
      component: () => import('../views/Inicio.vue'),
      meta: { layout: 'default' },
    },
    {
      path: '/questions',
      name: 'Questions',
      component: () => import('../views/Questions.vue'),
      meta: { layout: 'blank' },
    },
    {
      path: '/waiting',
      name: 'Waiting',
      component: () => import('../views/Waiting.vue'),
      meta: { layout: 'blank' },
    },
    {
      path: '/groups',
      name: 'Groups',
      component: () => import('../views/Groups.vue'),
      meta: { layout: 'default' },
    },
    {
      path: '/results',
      name: 'Results',
      component: () => import('../views/Results.vue'),
      meta: { layout: 'blank' },
    },
    // 🎮 Rutas del Sistema de Trivia
    {
      path: '/control',
      name: 'Control',
      component: () => import('../views/Control.vue'),
      meta: { layout: 'blank' },
    },
    {
      path: '/display',
      name: 'Display',
      component: () => import('../views/Display.vue'),
      meta: { layout: 'blank' },
    },
  ],
})

export default router