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

const categoriesLocal = computed(() => {
  if (props.categories && props.categories.length >= 1) {
    return props.categories
  }
  return [{ id: 'placeholder', label: 'Sin Categorías', color: '#6b7280' }]
})

const wheelItems = computed(() => 
  categoriesLocal.value.map((c, index) => ({
    id: index + 1,
    name: c.label,
    htmlContent: c.label,
    textColor: '#ffffff',
    background: c.color || '#94a3b8'
  }))
)

// ✅ SOLUCIÓN: Duplicar categorías hasta tener 4 espacios
const paddedWheelItems = computed(() => {
  const items = wheelItems.value
  const realCount = items.length
  
  if (realCount >= 4) return items
  
  // Duplicar las categorías existentes hasta llenar 4 espacios
  const result = [...items]
  let copyIndex = 0
  
  while (result.length < 4) {
    const original = items[copyIndex % items.length]
    result.push({
      ...original,
      id: result.length + 1  // ID único para cada espacio
    })
    copyIndex++
  }
  
  return result
})

const autoSpin = props.autoSpin ?? false

const firstItemIndex = ref({ value: 0 })
const wheelResultIndex = ref({ value: 0 })

function spinRoulette() {
  try {
    const N = paddedWheelItems.value.length
    if (N === 0) return
    const idx = Math.floor(Math.random() * N)
    wheelResultIndex.value = { value: idx }
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
    
    // Calcular el índice en la ruleta expandida
    let targetIndex = 0
    if (typeof index === 'number' && index >= 0 && index < N) {
      targetIndex = index
    } else {
      targetIndex = Math.floor(Math.random() * N)
    }
    
    // Si la ruleta está duplicada, mapear al índice correcto
    const paddedN = paddedWheelItems.value.length
    if (paddedN > N) {
      // Buscar una de las apariciones de la categoría objetivo
      const targetName = wheelItems.value[targetIndex]?.name
      const allIndices = paddedWheelItems.value
        .map((item, i) => item.name === targetName ? i : -1)
        .filter(i => i !== -1)
      
      // Elegir aleatoriamente entre las apariciones
      if (allIndices.length > 0) {
        targetIndex = allIndices[Math.floor(Math.random() * allIndices.length)]
      }
    }
    
    wheelResultIndex.value = { value: targetIndex }
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
  
  // Encontrar la categoría original (ignorar duplicados)
  const originalCategory = categoriesLocal.value.find(c => c.label === item.name)
  if (!originalCategory) {
    spinRoulette()
    return
  }
  
  const cat = { id: originalCategory.id, label: originalCategory.label }
  emit('spin-end', cat)
}

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
  padding: 2rem;
}

.spin-button {
  margin-top: 2rem;
  padding: 0.75rem 2rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.spin-button:hover {
  background-color: #2563eb;
  transform: scale(1.05);
}

.spin-button:active {
  transform: scale(0.95);
}
</style>