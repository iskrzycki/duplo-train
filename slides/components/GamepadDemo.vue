<script setup lang="ts">
import { onSlideEnter, useIsSlideActive } from '@slidev/client'
import { ref } from 'vue'

const isActive = useIsSlideActive()
const visit = ref(0)

onSlideEnter((_, from) => {
  if (from !== undefined)
    visit.value += 1
})
</script>

<template>
  <img
    v-if="isActive"
    :key="visit"
    :src="`/videos/gamepad.gif?visit=${visit}`"
    alt="Train dashboard controlled with a gamepad"
    class="gamepad-demo"
  >
</template>

<style scoped>
.gamepad-demo {
  display: block;
  flex: none;
  width: 624px;
  height: 600px;
  max-width: none;
  object-fit: fill;
}
</style>
