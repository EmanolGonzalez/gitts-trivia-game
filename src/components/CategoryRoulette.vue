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
    <button v-if="!autoSpin" @click="spinRoulette" class="spin-button">
      <span class="button-icon">🎯</span>
      <span class="button-text">¡Girar Ruleta!</span>
      <span class="button-shine"></span>
    </button>
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

// Paleta de colores vibrantes si no vienen definidos
const vibrantColors = [
  '#FF3B8F', '#00D9FF', '#FFD43B', '#9D4EDD', 
  '#06FFA5', '#FF6B35', '#4ECDC4', '#FFE66D',
  '#F72585', '#7209B7', '#3A86FF', '#FB5607'
]

const wheelItems = computed(() => 
  categoriesLocal.value.map((c, index) => ({
    id: index + 1,
    name: c.label,
    htmlContent: `<div class="wheel-item-content">${c.label}</div>`,
    textColor: '#ffffff',
    background: c.color || vibrantColors[index % vibrantColors.length]
  }))
)

const paddedWheelItems = computed(() => {
  const items = wheelItems.value
  const realCount = items.length
  
  if (realCount >= 4) return items
  
  const result = [...items]
  let copyIndex = 0
  
  while (result.length < 4) {
    const original = items[copyIndex % items.length]
    result.push({
      ...original,
      id: result.length + 1
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
    
    let targetIndex = 0
    if (typeof index === 'number' && index >= 0 && index < N) {
      targetIndex = index
    } else {
      targetIndex = Math.floor(Math.random() * N)
    }
    
    const paddedN = paddedWheelItems.value.length
    if (paddedN > N) {
      const targetName = wheelItems.value[targetIndex]?.name
      const allIndices = paddedWheelItems.value
        .map((item, i) => item.name === targetName ? i : -1)
        .filter(i => i !== -1)
      
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
  padding: 3rem 2rem;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

/* Efecto de fondo animado */
.roulette-container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: moveBackground 20s linear infinite;
  pointer-events: none;
}

@keyframes moveBackground {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}

/* Mejorar el aspecto de la ruleta */
:deep(.vue-roulette-wheel-container) {
  filter: drop-shadow(0 25px 50px rgba(0, 0, 0, 0.5))
          drop-shadow(0 0 80px rgba(139, 92, 246, 0.6));
  transform: scale(1.05);
  transition: transform 0.3s ease;
}

:deep(.vue-roulette-wheel-container:hover) {
  transform: scale(1.08);
}

/* Estilo de los items en la ruleta */
:deep(.wheel-item-content) {
  font-weight: 700;
  font-size: 1.1rem;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  letter-spacing: 0.5px;
}

/* Botón super mejorado */
.spin-button {
  position: relative;
  margin-top: 3rem;
  padding: 1.25rem 3rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 60px;
  font-size: 1.5rem;
  font-weight: 800;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(102, 126, 234, 0.5),
              0 0 0 4px rgba(255, 255, 255, 0.2),
              inset 0 -2px 10px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  text-transform: uppercase;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  z-index: 10;
}

.spin-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(255, 255, 255, 0.3), 
    transparent
  );
  transition: left 0.5s;
}

.spin-button:hover {
  transform: scale(1.1) translateY(-5px);
  box-shadow: 0 15px 60px rgba(102, 126, 234, 0.7),
              0 0 0 6px rgba(255, 255, 255, 0.3),
              inset 0 -2px 10px rgba(0, 0, 0, 0.2),
              0 0 100px rgba(139, 92, 246, 0.8);
}

.spin-button:hover::before {
  left: 100%;
}

.spin-button:active {
  transform: scale(1.05) translateY(-2px);
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.6),
              0 0 0 4px rgba(255, 255, 255, 0.25);
}

.button-icon {
  font-size: 2rem;
  animation: spin 2s ease-in-out infinite;
  display: inline-block;
}

@keyframes spin {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(180deg); }
}

.button-text {
  position: relative;
  z-index: 2;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.button-shine {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  transform: rotate(45deg);
  animation: shine 3s ease-in-out infinite;
}

@keyframes shine {
  0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
  100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
}

/* Animación de pulso para crear ambiente */
@keyframes pulse {
  0%, 100% { 
    opacity: 0.6;
    transform: scale(1);
  }
  50% { 
    opacity: 1;
    transform: scale(1.05);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .roulette-container {
    padding: 2rem 1rem;
  }
  
  .spin-button {
    font-size: 1.2rem;
    padding: 1rem 2rem;
  }
  
  .button-icon {
    font-size: 1.5rem;
  }
}
</style>