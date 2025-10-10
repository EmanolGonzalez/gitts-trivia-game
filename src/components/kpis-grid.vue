<!-- src/components/KPIGrid.vue -->
<template>
  <section class="w-full flex justify-center">
    <div class="w-full max-w-[1200px]">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="(k, i) in items"
          :key="i"
          class="group rounded-2xl backdrop-blur-xl bg-white/8 border border-white/15 p-4 sm:p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.45)] transition hover:bg-white/10"
        >
          <div class="flex items-start gap-3">
            <div
              class="rounded-xl border border-white/20 bg-white/10 w-10 h-10 grid place-items-center"
            >
              <!-- icon slot opcional -->
              <slot name="icon" :index="i">
                <!-- fallback: simple dot -->
                <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              </slot>
            </div>
            <div class="ml-1">
              <div class="text-[12px] uppercase tracking-wider text-white/70">{{ k.label }}</div>
              <div class="mt-1 text-2xl sm:text-3xl font-bold text-white tabular-nums">
                {{ k.value }}
              </div>
              <div class="text-[13px] text-white/70 mt-0.5">{{ k.subLabel }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
type KPIItem = { label: string; value: string | number; subLabel?: string }
const props = defineProps<{ items: KPIItem[] }>()
</script>
