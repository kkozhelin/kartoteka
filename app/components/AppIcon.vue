<script setup lang="ts">
const paths = {
  archive: 'M4 9h16v11H4zM3 4h18v5H3zM9 13h6',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  back: 'M19 12H5m6-6-6 6 6 6',
  trash: 'M4 7h16M10 11v5m4-5v5M6 7l1 13h10l1-13M9 7V4h6v3',
  check: 'm5 12 4 4L19 6',
  undo: 'M8 5 4 9l4 4M4 9h10a5 5 0 0 1 0 10h-2',
  redo: 'm16 5 4 4-4 4m4-4H10a5 5 0 0 0 0 10h2',
  close: 'm6 6 12 12M18 6 6 18',
  note: 'M5 3h9l5 5v13H5zM14 3v6h5M8 13h8m-8 4h5',
  info: 'M12 11v6m0-10v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
} as const

defineProps<{ name: keyof typeof paths }>()
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="paths[name]" />
  </svg>
</template>
