<script setup lang="ts">
import { useIsSlideActive, useSlideContext } from '@slidev/client'
import { ref, watch } from 'vue'

const props = defineProps<{ playAt: number }>()
const { $clicks, $renderContext } = useSlideContext()
const isActive = useIsSlideActive()
const video = ref<HTMLVideoElement | null>(null)

watch([video, isActive, $clicks, $renderContext], ([element, active, clicks, context]) => {
  if (!element)
    return

  if (active && clicks >= props.playAt && ['slide', 'presenter'].includes(context)) {
    void element.play().catch(() => {
      // Keep the native controls available if the browser blocks playback.
    })
  }
  else {
    element.pause()
    if (!active || clicks < props.playAt)
      element.currentTime = 0
  }
}, { immediate: true, flush: 'sync' })
</script>

<template>
  <video ref="video">
    <slot />
  </video>
</template>
