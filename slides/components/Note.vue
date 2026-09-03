<script setup lang="ts">
withDefaults(defineProps<{ quiet?: boolean }>(), { quiet: false })
</script>

<template>
  <div class="atm-note" :class="{ 'atm-note--quiet': quiet }"><slot /></div>
</template>
