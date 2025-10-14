<template>
  <div class="roulette-container">
    <Roulette
      ref="rouletteRef"
      :items="categories"
      :duration="5"
      :wheel-result-index="wheelResult"
      @wheel-end="onSpinEnd"
    />
    <button @click="spinRoulette" class="spin-button">Girar Ruleta</button>
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits } from 'vue';
import { Roulette } from 'vue3-roulette';

const rouletteRef = ref<any>(null);
const emit = defineEmits(['spin-end']); // Define the event to emit

const categories = [
  { id: 'history', label: 'Historia' },
  { id: 'science', label: 'Ciencia' },
  { id: 'sports', label: 'Deportes' },
  { id: 'art', label: 'Arte' },
  { id: 'geography', label: 'Geografía' },
  { id: 'entertainment', label: 'Entretenimiento' },
];

const selectedIndex = ref(-1);
const wheelResult = ref<{ value: number | null }>({ value: null });
const selectedCategory = ref<{ id: string; label: string } | null>(null);

function spinRoulette() {
  // decide índice y asignarlo al objeto esperado por la librería
  selectedIndex.value = Math.floor(Math.random() * categories.length);
  wheelResult.value.value = selectedIndex.value;
  // lanzar la ruleta mediante la instancia
  try {
    rouletteRef.value?.launchWheel();
  } catch (err) {
    console.warn('No se pudo lanzar la ruleta:', err);
  }
}

function onSpinEnd(item: { id: string; label: string } | null) {
  // el componente emite el item seleccionado
  selectedCategory.value = item || null;
  console.log('Categoría seleccionada:', selectedCategory.value);
  // Emitir la categoría seleccionada al componente padre
  if (selectedCategory.value) {
    emit('spin-end', selectedCategory.value);
  }
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