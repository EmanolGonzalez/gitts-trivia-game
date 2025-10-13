<template>
  <div class="mx-auto max-w-5xl px-4 py-6">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-2xl font-bold">Gestor de Equipos</h1>
        <p class="text-sm text-slate-400">
          Crea, edita y guarda los equipos que participarán en el juego.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn bg-green-600 text-white" @click="openCreate">Nuevo equipo</button>
      </div>
    </div>

    <div
      v-if="teamsLocal.length === 0"
      class="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center"
    >
      <div class="text-sm text-slate-400">No hay equipos. Crea el primero.</div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 mt-4">
      <div
        v-for="t in teamsLocal"
        :key="t.id"
        class="rounded-2xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <div
            class="h-8 w-8 rounded-full"
            :style="{ backgroundColor: t.color || '#94a3b8' }"
          ></div>
          <div>
            <div class="font-semibold">{{ t.name }}</div>
            <div class="text-xs text-slate-400">ID: {{ t.id }}</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="rounded-lg px-3 py-1 text-sm bg-slate-800 hover:bg-slate-700"
            @click="editTeam(t)"
          >
            Editar
          </button>
          <button
            class="rounded-lg px-3 py-1 text-sm bg-rose-600 text-white hover:bg-rose-500"
            @click="removeTeam(t)"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div
      v-if="showEditor"
      class="fixed inset-0 z-50 flex items-end md:items-center md:justify-center bg-black/60"
      @click.self="closeEditor"
    >
      <div
        class="w-full md:max-w-md rounded-t-2xl md:rounded-2xl bg-slate-900 border border-slate-800 p-4"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="text-lg font-semibold">
            {{ editorMode === 'create' ? 'Crear equipo' : 'Editar equipo' }}
          </div>
          <button class="rounded-lg px-3 py-1 text-sm hover:bg-slate-800" @click="closeEditor">
            Cerrar
          </button>
        </div>

        <div class="grid grid-cols-1 gap-3">
          <div>
            <label class="block text-sm text-slate-300 mb-1">Nombre</label>
            <input
              v-model="form.name"
              type="text"
              class="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2"
            />
          </div>
          <div>
            <label class="block text-sm text-slate-300 mb-1">ID</label>
            <input
              v-model="form.id"
              type="text"
              class="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2"
            />
          </div>
          <div>
            <label class="block text-sm text-slate-300 mb-1">Color</label>
            <input v-model="form.color" type="color" class="h-10 w-20 rounded-lg p-0 border-0" />
          </div>
        </div>

        <div class="mt-4 flex items-center justify-end gap-2">
          <button class="rounded-xl px-4 py-2 text-sm hover:bg-slate-800" @click="closeEditor">
            Cancelar
          </button>
          <button
            class="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
            @click="saveEditor"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import type { Team } from '@/types/game'

const game = useGameStore()

const teamsLocal = ref<Team[]>([])

const showEditor = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const form = reactive<Partial<Team>>({ id: '', name: '', color: '#3b82f6', score: 0 })

function uid(prefix = 't-', digits = 3) {
  const used = new Set(teamsLocal.value.map((t) => t.id))
  for (let i = 1; i < 10000; i++) {
    const id = `${prefix}${String(i).padStart(digits, '0')}`
    if (!used.has(id)) return id
  }
  return `${prefix}${Date.now()}`
}

onMounted(async () => {
  // ensure store loads data (prefer localStorage if present)
  try {
    await game.ensureDataLoaded()
  } catch {}
  // use teams from store (will be restored from localStorage if present)
  teamsLocal.value = game.teams.map((t) => ({ ...t }))
})

function openCreate() {
  editorMode.value = 'create'
  form.id = uid()
  form.name = ''
  form.color = '#3b82f6'
  form.score = 0
  showEditor.value = true
}

function editTeam(t: Team) {
  editorMode.value = 'edit'
  form.id = t.id
  form.name = t.name
  form.color = t.color ?? '#3b82f6'
  form.score = t.score ?? 0
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
}

function saveEditor() {
  if (!form.id || !form.name) {
    alert('ID y Nombre son obligatorios')
    return
  }
  const payload: Team = {
    id: String(form.id),
    name: String(form.name),
    score: Number(form.score ?? 0),
    color: String(form.color ?? '#3b82f6'),
  }
  if (editorMode.value === 'create') {
    teamsLocal.value.push(payload)
  } else {
    const idx = teamsLocal.value.findIndex((x) => x.id === payload.id)
    if (idx >= 0) teamsLocal.value[idx] = payload
  }
  // persist changes to store + localStorage
  syncTeamsAndPersist()
  showEditor.value = false
}

function removeTeam(t: Team) {
  if (!confirm(`Eliminar equipo "${t.name}"?`)) return
  teamsLocal.value = teamsLocal.value.filter((x) => x.id !== t.id)
  syncTeamsAndPersist()
}

function saveAll() {
  // explicit save (keeps existing behavior)
  syncTeamsAndPersist()
  alert('Equipos guardados localmente')
}

function syncTeamsAndPersist() {
  try {
    game.$patch((state: any) => {
      state.teams = teamsLocal.value.map((t: any) => ({ ...t }))
    })
  } catch {
    // fallback
    try {
      ;(game as any).teams = teamsLocal.value.map((t) => ({ ...t }))
    } catch {}
  }
  game.saveToLocalStorage({
    teams: game.teams,
    settings: {
      defaultTimeLimit: game.defaultTimeLimit,
      buzzerTimeLimit: game.buzzerTimeLimit,
      sampleSize: game.sampleSize,
      sampleRandomized: game.sampleRandomized,
    },
  })
}
</script>

<style scoped>
.btn {
  border-radius: 0.75rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}
</style>
