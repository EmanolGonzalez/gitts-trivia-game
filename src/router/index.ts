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
      meta: { layout: 'default' },
    },

    {
      path: '/groups',
      name: 'Groups',
      component: () => import('../views/Groups.vue'),
      meta: { layout: 'default' },
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
