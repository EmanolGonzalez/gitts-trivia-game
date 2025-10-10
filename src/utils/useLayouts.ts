import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { LayoutType } from '@/types/layout'

// Importar layouts
import DefaultLayout from '@/layouts/dashboard/dashboard-layout.vue'
import BlankLayout from '@/layouts/BlankLayout.vue'

const layouts = {
  default: DefaultLayout,
  blank: BlankLayout,
}

export const useLayout = () => {
  const route = useRoute()

  // Obtener el layout de la ruta actual
  const currentLayout = computed(() => {
    const layoutName = (route.meta?.layout as LayoutType) || 'default'
    return layouts[layoutName] || layouts.default
  })

  // Verificar si el layout requiere autenticación
  const requiresAuth = computed(() => {
    return route.meta?.requiresAuth || false
  })

  return {
    currentLayout,
    requiresAuth,
  }
}
