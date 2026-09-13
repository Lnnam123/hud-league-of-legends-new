import { createRouter, createWebHistory } from 'vue-router'
import ControlDashboard from '@/views/ControlDashboard.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/control',
      name: 'control',
      component: ControlDashboard,
    },
  ],
})

export default router
