<template>
  <div class="roulette-container">
    <Roulette
      ref="rouletteRef"
      :items="wheelItems"
      :duration="5"
      :stop-index="stopIndex"
  :wheel-result-index="stopIndex"
      @wheel-end="onSpinEnd"
    />
    <button v-if="!autoSpin" @click="spinRoulette" class="spin-button">Girar Ruleta</button>
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits, defineProps, watch, computed } from 'vue'
import Roulette from 'vue3-roulette'

const props = defineProps<{
  categories?: { id: string; label: string; color?: string }[]
  autoSpin?: boolean
  // optional: parent can set a specific start index
  startIndex?: number | null
}>()

const emit = defineEmits<{ (e: 'spin-end', category: { id: string; label: string }): void }>()

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

// Map categories into the minimal shape expected by the wheel (id, label)
const wheelItems = computed(() => categoriesLocal.value.map((c) => ({ id: c.id, label: c.label })))

const autoSpin = props.autoSpin ?? false

// stopIndex required by the component API/types: set to -1 initially
const stopIndex = ref<number>(-1)

function spinRoulette() {
  // random spin
  try {
    const N = wheelItems.value.length
    if (N === 0) return
    const idx = Math.floor(Math.random() * N)
    stopIndex.value = idx
    rouletteRef.value?.launchWheel?.()
  } catch (err) {
    console.warn('No se pudo lanzar la ruleta:', err)
  }
}

function spinTo(index?: number | null) {
  try {
    const N = wheelItems.value.length
    if (N === 0) return
    const idx = typeof index === 'number' && index >= 0 && index < N ? index : Math.floor(Math.random() * N)
    stopIndex.value = idx
    rouletteRef.value?.launchWheel?.()
  } catch (err) {
    console.warn('spinTo failed', err)
  }
}

// expose programmatic control to parent
defineExpose({ spinTo })

type WheelItem = { id: string; label: string }

function onSpinEnd(item: WheelItem | null) {
  // library emits the selected item (the original object from wheelItems)
  if (!item) return
  const cat = { id: String(item.id), label: item.label }
  emit('spin-end', cat)
}

watch(
  () => props.autoSpin,
  (v) => {
    if (v) setTimeout(() => spinRoulette(), 120)
  },
  { immediate: true },
)

// if parent provided a startIndex prop, spin to it once
if (props.startIndex != null) {
  setTimeout(() => {
    spinTo(props.startIndex ?? null)
  }, 120)
}
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