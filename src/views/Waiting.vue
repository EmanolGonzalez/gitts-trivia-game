<template>
  <div class="min-h-screen flex items-center justify-center bg-transparent">
    <div class="text-center">
      <div class="loader mb-6 mx-auto"></div>
      <h2 class="text-2xl font-semibold text-white mb-2">Espere por favor</h2>
      <p class="text-white/80 mb-6">Estamos preparando todo para el evento. Volverá en breve.</p>
      <router-link
        to="/"
        class="inline-block px-4 py-2 rounded-lg bg-white/90 text-slate-900 font-medium"
        >Volver al inicio</router-link
      >
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.loader {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 6px solid rgba(255, 255, 255, 0.12);
  border-top-color: #fff;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
