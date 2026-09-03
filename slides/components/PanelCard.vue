<script setup lang="ts">
withDefaults(defineProps<{ title?: string; accent?: boolean }>(), { accent: false })
</script>

<template>
  <div class="atm-panel-card" :class="{ 'atm-panel-card--accent': accent }">
    <h3 v-if="title">{{ title }}</h3>
    <slot />
  </div>
</template>
