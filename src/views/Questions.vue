<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import type { Category, Question, QuestionsData, GameData } from '@/types/game'

/* -----------------------------
   STORE & ESTADO LOCAL (editable)
------------------------------ */
const game = useGameStore()

// Copias editables (no modifican el store hasta publicar)
const categories = ref<Category[]>([])
const questions = ref<Question[]>([])

// UI state
const viewTab = ref<'questions' | 'categories'>('questions')
const search = ref('')
const selectedCategory = ref<string>('all')
const pointsFilter = ref<'all' | 100 | 150 | 200>('all')
const sortBy = ref<'default' | 'category' | 'points' | 'text'>('default')
const showEditor = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editorType = ref<'question' | 'category'>('question')
const confirmDialog = ref<{ open: boolean; message: string; onConfirm: () => void }>({
  open: false,
  message: '',
  onConfirm: () => {},
})

// Formularios
const qForm = reactive<Partial<Question>>({
  id: '',
  categoryId: '',
  text: '',
  answer: '',
  points: 100,
})
const cForm = reactive<Partial<Category>>({
  id: '',
  name: '',
  icon: 'Sparkles',
})

// Sugerencias
const iconOptions = [
  'Sparkles',
  'Atom',
  'Building',
  'Trophy',
  'Cpu',
  'Palette',
  'Book',
  'Globe',
  'Mic',
  'Film',
]

/* -----------------------------
   CARGA INICIAL
------------------------------ */
onMounted(async () => {
  // Si el store aún no tiene datos, cárgalos del /public/data
  if (game.questions.length === 0 || game.categories.length === 0) {
    try {
      await game.loadFromPublicData()
    } catch {}
  }
  // Copias locales
  categories.value = game.categories.map((c) => ({ ...c }))
  questions.value = game.questions.map((q) => ({ ...q }))
  // Persist to localStorage after loading initial data
  game.saveQuestionsToLocalStorage({ categories: categories.value, questions: questions.value })
})

/* -----------------------------
   DERIVADOS & FITROS/ORDEN
------------------------------ */
const categoryMap = computed<Record<string, Category>>(() => {
  const map: Record<string, Category> = {}
  for (const c of categories.value) map[c.id] = c
  return map
})

const stats = computed(() => {
  const perCat: Record<string, number> = {}
  for (const c of categories.value) perCat[c.id] = 0
  for (const q of questions.value) {
    if (perCat[q.categoryId] != null) perCat[q.categoryId]++
  }
  return {
    totalQuestions: questions.value.length,
    totalCategories: categories.value.length,
    perCat,
  }
})

// “dirty” = hay cambios locales sin publicar
const isDirty = computed(() => {
  try {
    const A = JSON.stringify({
      categories: categories.value.map((c) => ({ id: c.id, name: c.name, icon: c.icon })),
      questions: questions.value.map((q) => ({
        id: q.id,
        categoryId: q.categoryId,
        text: q.text,
        answer: q.answer,
        points: q.points,
      })),
    })
    const B = JSON.stringify({
      categories: game.categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon })),
      questions: game.questions.map((q) => ({
        id: q.id,
        categoryId: q.categoryId,
        text: q.text,
        answer: q.answer,
        points: q.points,
      })),
    })
    return A !== B
  } catch {
    return true
  }
})

const filteredQuestions = computed(() => {
  let arr = [...questions.value]
  const s = search.value.trim().toLowerCase()

  if (s) {
    arr = arr.filter(
      (q) =>
        q.text.toLowerCase().includes(s) ||
        q.answer.toLowerCase().includes(s) ||
        categoryMap.value[q.categoryId]?.name.toLowerCase().includes(s),
    )
  }
  if (selectedCategory.value !== 'all') {
    arr = arr.filter((q) => q.categoryId === selectedCategory.value)
  }
  if (pointsFilter.value !== 'all') {
    arr = arr.filter((q) => q.points === pointsFilter.value)
  }

  switch (sortBy.value) {
    case 'category':
      arr.sort((a, b) => {
        const an = categoryMap.value[a.categoryId]?.name ?? ''
        const bn = categoryMap.value[b.categoryId]?.name ?? ''
        if (an !== bn) return an.localeCompare(bn)
        if (a.points !== b.points) return a.points - b.points
        return a.text.localeCompare(b.text)
      })
      break
    case 'points':
      arr.sort((a, b) => a.points - b.points || a.text.localeCompare(b.text))
      break
    case 'text':
      arr.sort((a, b) => a.text.localeCompare(b.text))
      break
    default:
      // orden original (por id numérico si aplica)
      arr.sort((a, b) => numericSuffix(a.id) - numericSuffix(b.id))
  }

  return arr
})

/* -----------------------------
   HELPERS
------------------------------ */
function uid(prefix: string, digits = 3) {
  // genera q-001, q-002, ... o cat-001
  const used = new Set(
    prefix.startsWith('q-') ? questions.value.map((q) => q.id) : categories.value.map((c) => c.id),
  )
  for (let i = 1; i < 10000; i++) {
    const id = `${prefix}${String(i).padStart(digits, '0')}`
    if (!used.has(id)) return id
  }
  // fallback
  return `${prefix}${Date.now()}`
}
function numericSuffix(id: string) {
  const m = id.match(/(\d+)$/)
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER
}
function resetQForm() {
  qForm.id = uid('q-')
  qForm.categoryId = categories.value[0]?.id ?? ''
  qForm.text = ''
  qForm.answer = ''
  qForm.points = 100
}
function resetCForm() {
  cForm.id = categories.value.length ? uid('cat-') : 'general'
  cForm.name = ''
  cForm.icon = 'Sparkles'
}
function openQuestionCreate() {
  editorType.value = 'question'
  editorMode.value = 'create'
  resetQForm()
  showEditor.value = true
}
function openQuestionEdit(q: Question) {
  editorType.value = 'question'
  editorMode.value = 'edit'
  qForm.id = q.id
  qForm.categoryId = q.categoryId
  qForm.text = q.text
  qForm.answer = q.answer
  qForm.points = q.points
  showEditor.value = true
}
function openCategoryCreate() {
  editorType.value = 'category'
  editorMode.value = 'create'
  resetCForm()
  showEditor.value = true
}
function openCategoryEdit(c: Category) {
  editorType.value = 'category'
  editorMode.value = 'edit'
  cForm.id = c.id
  cForm.name = c.name
  cForm.icon = c.icon ?? 'Sparkles'
  showEditor.value = true
}

/* -----------------------------
   VALIDACIONES
------------------------------ */
function validateQuestion(form: Partial<Question>): string[] {
  const errors: string[] = []
  if (!form.id?.trim()) errors.push('La pregunta necesita un ID.')
  if (!form.text?.trim()) errors.push('El enunciado es obligatorio.')
  if (!form.answer?.trim()) errors.push('La respuesta es obligatoria.')
  if (!form.categoryId?.trim()) errors.push('Debe seleccionar una categoría.')
  if (typeof form.points !== 'number' || form.points <= 0) errors.push('Puntos inválidos.')
  // Unicidad de ID
  const dup = questions.value.some(
    (q) => q.id === form.id && (editorMode.value === 'create' || q.id !== (form as Question).id),
  )
  if (dup) errors.push(`Ya existe una pregunta con ID ${form.id}.`)
  // Referencia de categoría
  if (form.categoryId && !categories.value.find((c) => c.id === form.categoryId)) {
    errors.push(`La categoría "${form.categoryId}" no existe.`)
  }
  return errors
}
function validateCategory(form: Partial<Category>): string[] {
  const errors: string[] = []
  if (!form.id?.trim()) errors.push('La categoría necesita un ID.')
  if (!form.name?.trim()) errors.push('El nombre es obligatorio.')
  const dup = categories.value.some(
    (c) => c.id === form.id && (editorMode.value === 'create' || c.id !== (form as Category).id),
  )
  if (dup) errors.push(`Ya existe una categoría con ID ${form.id}.`)
  return errors
}

/* -----------------------------
   GUARDAR (CREATE/EDIT)
------------------------------ */
const formErrors = ref<string[]>([])

function saveEditor() {
  formErrors.value = []
  if (editorType.value === 'question') {
    const errs = validateQuestion(qForm)
    if (errs.length) {
      formErrors.value = errs
      return
    }
    const payload: Question = {
      id: String(qForm.id),
      categoryId: String(qForm.categoryId),
      text: String(qForm.text),
      answer: String(qForm.answer),
      points: Number(qForm.points),
    }
    if (editorMode.value === 'create') {
      questions.value.push(payload)
    } else {
      const idx = questions.value.findIndex((q) => q.id === payload.id)
      if (idx >= 0) questions.value[idx] = payload
    }
    // persist to localStorage after edit
    game.saveQuestionsToLocalStorage({ categories: categories.value, questions: questions.value })
  } else {
    const errs = validateCategory(cForm)
    if (errs.length) {
      formErrors.value = errs
      return
    }
    const payload: Category = {
      id: String(cForm.id),
      name: String(cForm.name),
      icon: String(cForm.icon || 'Sparkles'),
    }
    if (editorMode.value === 'create') {
      categories.value.push(payload)
    } else {
      const idx = categories.value.findIndex((c) => c.id === payload.id)
      if (idx >= 0) categories.value[idx] = payload
      // Nota: no renombrar categoryId de preguntas si cambia id (se requiere manual)
    }
  }
  showEditor.value = false
}

/* -----------------------------
   ELIMINAR
------------------------------ */
function askConfirm(message: string, onConfirm: () => void) {
  confirmDialog.value.open = true
  confirmDialog.value.message = message
  confirmDialog.value.onConfirm = () => {
    confirmDialog.value.open = false
    onConfirm()
  }
}
function removeQuestion(q: Question) {
  askConfirm(`¿Eliminar la pregunta "${q.text}"?`, () => {
    questions.value = questions.value.filter((x) => x.id !== q.id)
    game.saveQuestionsToLocalStorage({ categories: categories.value, questions: questions.value })
  })
}
function removeCategory(c: Category) {
  // Verificar si la usan preguntas
  const used = questions.value.some((q) => q.categoryId === c.id)
  if (used) {
    askConfirm(
      `La categoría "${c.name}" tiene preguntas asociadas. ¿Eliminar y reasignar esas preguntas a "uncategorized"?`,
      () => {
        // crear/asegurar categoría 'uncategorized'
        let uncat = categories.value.find((x) => x.id === 'uncategorized')
        if (!uncat) {
          uncat = { id: 'uncategorized', name: 'Sin categoría', icon: 'Book' }
          categories.value.push(uncat)
        }
        questions.value = questions.value.map((q) =>
          q.categoryId === c.id ? { ...q, categoryId: 'uncategorized' } : q,
        )
        categories.value = categories.value.filter((x) => x.id !== c.id)
        game.saveQuestionsToLocalStorage({
          categories: categories.value,
          questions: questions.value,
        })
      },
    )
  } else {
    askConfirm(`¿Eliminar la categoría "${c.name}"?`, () => {
      categories.value = categories.value.filter((x) => x.id !== c.id)
    })
  }
}

/* -----------------------------
   IMPORT / EXPORT
------------------------------ */
function exportJson() {
  const data: QuestionsData = {
    categories: categories.value.map((c) => ({ id: c.id, name: c.name, icon: c.icon })),
    questions: questions.value.map((q) => ({
      id: q.id,
      categoryId: q.categoryId,
      text: q.text,
      answer: q.answer,
      points: q.points,
    })),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'questions.json'
  a.click()
  URL.revokeObjectURL(url)
  // save also to localStorage after export (keep latest)
  game.saveQuestionsToLocalStorage(data)
}

const importInput = ref<HTMLInputElement | null>(null)
function importJsonClick() {
  importInput.value?.click()
}
function importJsonChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result)) as QuestionsData
      // Validación mínima
      if (!Array.isArray(data.categories) || !Array.isArray(data.questions)) {
        alert('Formato inválido: se esperan "categories" y "questions".')
        return
      }
      categories.value = data.categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))
      questions.value = data.questions.map((q) => ({
        id: q.id,
        categoryId: q.categoryId,
        text: q.text,
        answer: q.answer,
        points: q.points,
      }))
      // save imported to localStorage
      game.saveQuestionsToLocalStorage({ categories: categories.value, questions: questions.value })
    } catch {
      alert('No se pudo leer el JSON.')
    } finally {
      input.value = ''
    }
  }
  reader.readAsText(file)
}

/* -----------------------------
   PUBLICAR AL JUEGO (Broadcast)
------------------------------ */
function publishToGame() {
  const gameData: GameData = {
    teams: game.teams.map((t) => ({ ...t })),
    settings: {
      defaultTimeLimit: game.defaultTimeLimit,
      buzzerTimeLimit: game.buzzerTimeLimit,
    },
  }
  const qd: QuestionsData = {
    categories: categories.value.map((c) => ({ ...c })),
    questions: questions.value.map((q) => ({ ...q })),
  }
  game.sendMessage({ type: 'LOAD_DATA', game: gameData, questions: qd })
  alert('Banco de preguntas y categorías publicado al juego.')
  // also persist locally so control retains changes
  game.saveQuestionsToLocalStorage(qd)
}

/* -----------------------------
   LIMPIEZA DE DATOS / UTILIDADES
------------------------------ */
function normalizeText() {
  questions.value = questions.value.map((q) => ({
    ...q,
    text: q.text.trim().replace(/\s+/g, ' '),
    answer: q.answer.trim().replace(/\s+/g, ' '),
  }))
  game.saveQuestionsToLocalStorage({ categories: categories.value, questions: questions.value })
}
function fixMissingCategoryRefs() {
  const validIds = new Set(categories.value.map((c) => c.id))
  let uncat = categories.value.find((c) => c.id === 'uncategorized')
  if (!uncat) {
    uncat = { id: 'uncategorized', name: 'Sin categoría', icon: 'Book' }
    categories.value.push(uncat)
  }
  questions.value = questions.value.map((q) =>
    validIds.has(q.categoryId) ? q : { ...q, categoryId: 'uncategorized' },
  )
  game.saveQuestionsToLocalStorage({ categories: categories.value, questions: questions.value })
}
function reindexQuestionIds() {
  const sorted = [...questions.value].sort((a, b) => a.text.localeCompare(b.text))
  const next: Question[] = []
  let i = 1
  for (const q of sorted) {
    next.push({ ...q, id: `q-${String(i).padStart(3, '0')}` })
    i++
  }
  questions.value = next
  game.saveQuestionsToLocalStorage({ categories: categories.value, questions: questions.value })
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-6">
    <!-- HEADER sticky -->
    <div
      class="sticky top-0 z-30 -mx-4 px-4 py-3 mb-4 bg-slate-900/95 backdrop-blur border-b border-slate-800"
    >
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Gestor de Preguntas & Categorías</h1>
          <p class="text-sm text-slate-400">
            Importa, edita y publica cambios al runtime con un clic.
            <span v-if="isDirty" class="ml-2 inline-flex items-center gap-1 text-amber-300">
              ● Cambios sin publicar
            </span>
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="exportJson"
            class="btn btn-sm bg-slate-800 hover:bg-slate-700 text-white rounded-xl px-4 py-2"
          >
            Exportar JSON
          </button>
          <button
            @click="importJsonClick"
            class="btn btn-sm bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl px-4 py-2"
          >
            Importar JSON
          </button>
          <input
            ref="importInput"
            type="file"
            accept="application/json"
            class="hidden"
            @change="importJsonChange"
          />
          <button
            @click="publishToGame"
            :disabled="categories.length === 0 || questions.length === 0"
            class="btn btn-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl px-4 py-2"
          >
            Publicar al juego
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mt-3 flex items-center gap-2">
        <button
          class="rounded-xl px-4 py-2 text-sm border"
          :class="
            viewTab === 'questions'
              ? 'bg-blue-600 text-white border-blue-500'
              : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
          "
          @click="viewTab = 'questions'"
        >
          Preguntas
        </button>
        <button
          class="rounded-xl px-4 py-2 text-sm border"
          :class="
            viewTab === 'categories'
              ? 'bg-blue-600 text-white border-blue-500'
              : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
          "
          @click="viewTab = 'categories'"
        >
          Categorías
        </button>

        <!-- Filtros preguntas -->
        <div class="ml-auto flex flex-wrap items-center gap-2" v-if="viewTab === 'questions'">
          <div class="relative">
            <input
              v-model="search"
              type="text"
              placeholder="Buscar texto, respuesta o categoría…"
              class="w-64 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span class="absolute right-2 top-2 text-xs text-slate-400">{{
              filteredQuestions.length
            }}</span>
          </div>
          <select
            v-model="selectedCategory"
            class="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="all">Todas las categorías</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
          <select
            v-model="pointsFilter"
            class="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="all">Todos los puntajes</option>
            <option :value="100">100 pts</option>
            <option :value="150">150 pts</option>
            <option :value="200">200 pts</option>
          </select>
          <select
            v-model="sortBy"
            class="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="default">Orden por ID</option>
            <option value="category">Categoría</option>
            <option value="points">Puntos</option>
            <option value="text">Texto</option>
          </select>
          <button
            @click="openQuestionCreate"
            class="btn bg-green-600 hover:bg-green-500 text-white rounded-xl px-4 py-2 text-sm"
          >
            Nueva pregunta
          </button>
        </div>

        <!-- Acciones categorías -->
        <div class="ml-auto flex items-center gap-2" v-else>
          <button
            @click="openCategoryCreate"
            class="btn bg-green-600 hover:bg-green-500 text-white rounded-xl px-4 py-2 text-sm"
          >
            Nueva categoría
          </button>
          <button
            @click="normalizeText"
            class="btn bg-slate-800 hover:bg-slate-700 text-white rounded-xl px-4 py-2 text-sm"
          >
            Normalizar textos
          </button>
          <button
            @click="fixMissingCategoryRefs"
            class="btn bg-slate-800 hover:bg-slate-700 text-white rounded-xl px-4 py-2 text-sm"
          >
            Arreglar referencias
          </button>
          <button
            @click="reindexQuestionIds"
            class="btn bg-slate-800 hover:bg-slate-700 text-white rounded-xl px-4 py-2 text-sm"
          >
            Reindexar IDs
          </button>
        </div>
      </div>
    </div>

    <!-- Stats (tarjetas sólidas) -->
    <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div class="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div class="text-xs uppercase text-slate-400">Preguntas</div>
        <div class="text-2xl font-semibold">{{ stats.totalQuestions }}</div>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div class="text-xs uppercase text-slate-400">Categorías</div>
        <div class="text-2xl font-semibold">{{ stats.totalCategories }}</div>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div class="text-xs uppercase text-slate-400">Tiempo buzzer</div>
        <div class="text-2xl font-semibold">{{ game.buzzerTimeLimit }}s</div>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div class="text-xs uppercase text-slate-400">Muestra</div>
        <div class="text-2xl font-semibold">{{ game.sampleSize }}</div>
      </div>
    </div>

    <!-- Tabla de preguntas -->
    <div
      v-if="viewTab === 'questions'"
      class="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
    >
      <table class="min-w-full border-collapse">
        <thead class="bg-slate-800/80 text-left text-sm">
          <tr>
            <th class="px-4 py-3 w-24">ID</th>
            <th class="px-4 py-3">Texto</th>
            <th class="px-4 py-3">Respuesta</th>
            <th class="px-4 py-3">Categoría</th>
            <th class="px-4 py-3 w-24">Puntos</th>
            <th class="px-4 py-3 w-40"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800">
          <tr v-for="q in filteredQuestions" :key="q.id" class="hover:bg-slate-800/50">
            <td class="px-4 py-3 text-xs font-mono text-slate-300">{{ q.id }}</td>
            <td class="px-4 py-3">{{ q.text }}</td>
            <td class="px-4 py-3 text-slate-300">{{ q.answer }}</td>
            <td class="px-4 py-3">
              <span
                class="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs"
                :style="{
                  borderColor: (categoryMap[q.categoryId]?.color ?? '#94a3b8') + '55',
                  backgroundColor: (categoryMap[q.categoryId]?.color ?? '#94a3b8') + '14',
                }"
              >
                <span
                  class="inline-block h-2 w-2 rounded-full"
                  :style="{ backgroundColor: categoryMap[q.categoryId]?.color ?? '#94a3b8' }"
                />
                {{ categoryMap[q.categoryId]?.name ?? q.categoryId }}
              </span>
            </td>
            <td class="px-4 py-3 font-semibold tabular-nums">{{ q.points }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <button
                  class="rounded-lg bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700"
                  @click="openQuestionEdit(q)"
                  title="Editar"
                >
                  Editar
                </button>
                <button
                  class="rounded-lg bg-rose-600 px-3 py-1 text-sm text-white hover:bg-rose-500"
                  @click="removeQuestion(q)"
                  title="Eliminar"
                >
                  Eliminar
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="filteredQuestions.length === 0">
            <td colspan="6" class="px-4 py-10 text-center text-sm text-slate-400">
              Sin resultados. Ajusta filtros o crea una nueva pregunta.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Tarjetas de categorías -->
    <div v-else class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="c in categories"
        :key="c.id"
        class="rounded-2xl border border-slate-800 bg-slate-900 p-4 hover:border-slate-700"
        :style="{ boxShadow: `0 0 0 3px ${c.color ?? '#94a3b8'}18 inset` }"
      >
        <div class="flex items-start justify-between">
          <div>
            <div class="text-xs uppercase tracking-wide text-slate-400">{{ c.id }}</div>
            <div class="mt-1 text-lg font-semibold">{{ c.name }}</div>
            <div class="text-xs text-slate-400">Icono: {{ c.icon || '—' }}</div>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold tabular-nums">{{ stats.perCat[c.id] ?? 0 }}</div>
            <div class="text-xs text-slate-400">preguntas</div>
          </div>
        </div>
        <div class="mt-3 flex gap-2">
          <button
            class="rounded-lg bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700"
            @click="openCategoryEdit(c)"
          >
            Editar
          </button>
          <button
            class="rounded-lg bg-rose-600 px-3 py-1 text-sm text-white hover:bg-rose-500"
            @click="removeCategory(c)"
          >
            Eliminar
          </button>
        </div>
      </div>

      <div
        v-if="categories.length === 0"
        class="col-span-full rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center"
      >
        <div class="text-sm text-slate-400">No hay categorías. Crea la primera.</div>
      </div>
    </div>

    <!-- Drawer / Modal Editor -->
    <div
      v-if="showEditor"
      class="fixed inset-0 z-50 flex items-end md:items-center md:justify-center bg-black/60 backdrop-blur-sm"
      @click.self="showEditor = false"
    >
      <div
        class="w-full md:max-w-2xl rounded-t-2xl md:rounded-2xl bg-slate-900 border border-slate-800 shadow-xl"
      >
        <div class="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div class="text-lg font-semibold">
            {{ editorMode === 'create' ? 'Crear' : 'Editar' }}
            {{ editorType === 'question' ? 'pregunta' : 'categoría' }}
          </div>
          <button
            class="rounded-lg px-3 py-1 text-sm hover:bg-slate-800"
            @click="showEditor = false"
          >
            Cerrar
          </button>
        </div>

        <div class="px-4 py-4">
          <!-- Errores -->
          <div
            v-if="formErrors.length"
            class="mb-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"
          >
            <ul class="list-disc pl-5">
              <li v-for="e in formErrors" :key="e">{{ e }}</li>
            </ul>
          </div>

          <!-- Form Pregunta -->
          <div v-if="editorType === 'question'" class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div class="md:col-span-1">
              <label class="mb-1 block text-sm text-slate-300">ID</label>
              <input
                v-model="qForm.id"
                type="text"
                class="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div class="md:col-span-1">
              <label class="mb-1 block text-sm text-slate-300">Puntos</label>
              <input
                v-model.number="qForm.points"
                type="number"
                min="50"
                step="50"
                class="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div class="md:col-span-2">
              <label class="mb-1 block text-sm text-slate-300">Texto</label>
              <textarea
                v-model="qForm.text"
                rows="2"
                class="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>
            <div class="md:col-span-2">
              <label class="mb-1 block text-sm text-slate-300">Respuesta</label>
              <textarea
                v-model="qForm.answer"
                rows="2"
                class="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>
            <div class="md:col-span-2">
              <label class="mb-1 block text-sm text-slate-300">Categoría</label>
              <select
                v-model="qForm.categoryId"
                class="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option disabled value="">Selecciona una categoría</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">
                  {{ c.name }} ({{ c.id }})
                </option>
              </select>
            </div>
          </div>

          <!-- Form Categoría -->
          <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div class="md:col-span-1">
              <label class="mb-1 block text-sm text-slate-300">ID</label>
              <input
                v-model="cForm.id"
                type="text"
                class="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div class="md:col-span-1">
              <label class="mb-1 block text-sm text-slate-300">Icono</label>
              <select
                v-model="cForm.icon"
                class="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option v-for="i in iconOptions" :key="i" :value="i">{{ i }}</option>
              </select>
            </div>
            <div class="md:col-span-2">
              <label class="mb-1 block text-sm text-slate-300">Nombre</label>
              <input
                v-model="cForm.name"
                type="text"
                class="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-3">
          <button
            class="rounded-xl px-4 py-2 text-sm hover:bg-slate-800"
            @click="showEditor = false"
          >
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

    <!-- Confirm Dialog -->
    <div
      v-if="confirmDialog.open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div class="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div class="text-lg font-semibold">Confirmar acción</div>
        <p class="mt-2 text-sm text-slate-300">{{ confirmDialog.message }}</p>
        <div class="mt-4 flex items-center justify-end gap-2">
          <button
            class="rounded-xl px-4 py-2 text-sm hover:bg-slate-800"
            @click="confirmDialog.open = false"
          >
            Cancelar
          </button>
          <button
            class="rounded-xl bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-500"
            @click="confirmDialog.onConfirm"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "@/assets/main.css";
.btn {
  @apply rounded-xl px-3 py-2 text-sm transition;
}
</style>
