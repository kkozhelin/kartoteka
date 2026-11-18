<script setup lang="ts">
import { copy } from './content/copy'
</script>

<template>
  <a class="skip-link" href="#main">{{ copy.skip }}</a>
  <header class="masthead">
    <div class="shell masthead__inner">
      <NuxtLink to="/" class="wordmark">
        <span class="wordmark__icon"><AppIcon name="archive" /></span>
        {{ copy.brand }}
      </NuxtLink>
      <span class="local-status"><span aria-hidden="true" />{{ copy.local }}</span>
    </div>
  </header>
  <NuxtPage />
</template>
