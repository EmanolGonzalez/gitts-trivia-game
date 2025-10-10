<script setup lang="ts"></script>

<template>
  <div class="drawer lg:drawer-open">
    <input id="my-drawer-3" type="checkbox" class="drawer-toggle" />
    <div class="drawer-content flex flex-col">
      <!-- Navbar -->
      <div class="navbar bg-[#162332] w-full">
        <!-- Button for small screens -->
        <div class="flex-none lg:hidden">
          <label for="my-drawer-3" aria-label="open sidebar" class="btn btn-square btn-ghost">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              class="inline-block h-6 w-6 stroke-current"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </label>
        </div>

        <!-- Navbar title section -->
        <div class="mx-2 flex-1 px-2 flex items-center gap-3">
          <!-- Título visible en md pero oculto en lg -->
          <div class="flex lg:hidden items-center gap-3">
            <div
              class="logo rounded-md flex h-12 w-12 items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M12 8v8M8 12h8"
                />
              </svg>
            </div>
            <div class="leading-tight">
              <div class="text-lg font-semibold">Trivia Manager</div>
              <div class="text-sm text-muted"></div>
            </div>
          </div>

          <!-- Navbar items (right side) -->
          <div class="hidden flex-none lg:block ml-auto">
            <ul class="menu menu-horizontal">
              <li><a>Navbar Item 1</a></li>
              <li><a>Navbar Item 2</a></li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Page content -->
      <div class="p-4">
        <slot></slot>
      </div>
    </div>

    <!-- Sidebar -->
    <div class="drawer-side">
      <label for="my-drawer-3" aria-label="close sidebar" class="drawer-overlay"></label>
      <div class="w-80 bg-[#162332] min-h-full p-4">
        <!-- Sidebar header (visible solo en lg+) -->
        <div class="sidebar-header mb-4 flex items-center gap-3 hidden lg:flex">
          <div
            class="logo rounded-md flex h-12 w-12 items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M12 8v8M8 12h8"
              />
            </svg>
          </div>
          <div class="leading-tight">
            <div class="text-lg font-semibold">Trivia Manager</div>
            <div class="text-sm text-muted"></div>
          </div>
        </div>

        <!-- Sidebar menu -->
        <ul class="menu p-0">
          <li><router-link to="/" class="flex items-center">Inicio</router-link></li>
          <li><router-link to="/questions" class="flex items-center">Preguntas</router-link></li>
          <li><router-link to="/groups" class="flex items-center">Grupos</router-link></li>
          <li><router-link to="/results" class="flex items-center">Resultados</router-link></li>
        </ul>
      </div>
    </div>
  </div>
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
