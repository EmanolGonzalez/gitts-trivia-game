<template>
  <div class="roulette-container">
    <Roulette
      ref="rouletteRef"
      :items="paddedWheelItems"
      :duration="5"
      :first-item-index="firstItemIndex"
      :wheel-result-index="wheelResultIndex"
      @wheel-start="onWheelStart"
      @wheel-end="onSpinEnd"
    />
    <button v-if="!autoSpin" @click="spinRoulette" class="spin-button">Girar Ruleta</button>
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits, defineProps, computed, onMounted } from 'vue'

const props = defineProps<{
  categories?: { id: string; label: string; color?: string }[]
  autoSpin?: boolean
  startIndex?: number | null
}>()

const emit = defineEmits<{
  (e: 'spin-end', category: { id: string; label: string }): void
  (e: 'wheel-start'): void
}>()

const rouletteRef = ref<{ launchWheel?: () => void } | null>(null)

const defaultCategories = [
  { id: 'history', label: 'Historia', color: '#ef4444' },
  { id: 'science', label: 'Ciencia', color: '#3b82f6' },
  { id: 'sports', label: 'Deportes', color: '#f59e0b' },
  { id: 'art', label: 'Arte', color: '#22c55e' },
]

const categoriesLocal = computed(() =>
  props.categories && props.categories.length >= 1 ? props.categories : defaultCategories,
)

// ✅ ESTRUCTURA CORRECTA: vue3-roulette requiere estos campos específicos
const wheelItems = computed(() => 
  categoriesLocal.value.map((c, index) => ({
    id: index + 1,
    name: c.label,
    htmlContent: c.label,
    textColor: '#ffffff',
    background: c.color || '#94a3b8'
  }))
)

// ✅ PADDING: Si hay menos de 4 items, rellenar con items dummy para cumplir el validador
const paddedWheelItems = computed(() => {
  const items = wheelItems.value
  if (items.length >= 4) return items
  
  const padding = []
  const colors = ['#ef4444', '#3b82f6', '#f59e0b', '#22c55e', '#8b5cf6', '#ec4899']
  
  for (let i = items.length; i < 4; i++) {
    padding.push({
      id: i + 1,
      name: '—',
      htmlContent: '—',
      textColor: '#ffffff',
      background: colors[i % colors.length]
    })
  }
  
  return [...items, ...padding]
})

const autoSpin = props.autoSpin ?? false

// ✅ IMPORTANTE: vue3-roulette NO acepta null, debe ser siempre un número
const firstItemIndex = ref({ value: 0 })
const wheelResultIndex = ref({ value: 0 })

function spinRoulette() {
  try {
    const N = wheelItems.value.length
    if (N === 0) return
    const idx = Math.floor(Math.random() * N)
    wheelResultIndex.value = { value: idx }
    // Esperar un tick antes de lanzar para que Vue actualice la prop
    setTimeout(() => {
      rouletteRef.value?.launchWheel?.()
    }, 50)
  } catch (err) {
    console.warn('No se pudo lanzar la ruleta:', err)
  }
}

function spinTo(index?: number | null) {
  try {
    const N = wheelItems.value.length
    if (N === 0) return
    const idx = typeof index === 'number' && index >= 0 && index < N 
      ? index 
      : Math.floor(Math.random() * N)
    
    wheelResultIndex.value = { value: idx }
    // Esperar un tick antes de lanzar para que Vue actualice la prop
    setTimeout(() => {
      rouletteRef.value?.launchWheel?.()
    }, 50)
  } catch (err) {
    console.warn('spinTo failed', err)
  }
}

defineExpose({ spinTo })

function onWheelStart() {
  emit('wheel-start')
}

function onSpinEnd(item: any) {
  if (!item) return
  
  // Encontrar la categoría original usando el name (ignorar items de padding)
  const originalCategory = categoriesLocal.value.find(c => c.label === item.name)
  if (!originalCategory) {
    // Si cayó en un item de padding, girar de nuevo
    spinRoulette()
    return
  }
  
  const cat = { id: originalCategory.id, label: originalCategory.label }
  emit('spin-end', cat)
}

// ✅ Lógica de auto-spin mejorada
onMounted(() => {
  if (autoSpin) {
    setTimeout(() => {
      if (props.startIndex != null) {
        spinTo(props.startIndex)
      } else {
        spinRoulette()
      }
    }, 200)
  }
})
</script>

<style scoped>
.roulette-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.spin-button {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

.spin-button:hover {
  background-color: #45a049;
}
</style>