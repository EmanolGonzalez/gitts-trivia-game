<script setup lang="ts">
import { useLayout } from './utils/useLayouts'

const { currentLayout } = useLayout()
</script>

<template>
  <component :is="currentLayout">
    <router-view />
  </component>
</template>

<style scoped>
.sidebar-header .text-muted {
  color: rgba(100, 116, 139, 1);
}

.logo svg {
  stroke: white;
}

.drawer-side .w-80 {
  min-height: 100vh;
}
</style>
