<script setup lang="ts">
import { computed } from 'vue'
import { useNav } from '@slidev/client'

const nav = useNav()

// Use the slide number, not the click count, so the train moves only when
// the presentation advances to another slide.
const showProgress = computed(() =>
  nav.currentPage.value > 1
  && nav.currentPage.value < nav.total.value
  && !nav.currentFrontmatter.value.hideProgress,
)

const progress = computed(() => {
  const firstVisibleSlide = 2
  const lastVisibleSlide = nav.total.value - 1
  if (nav.currentPage.value === lastVisibleSlide) return 0.97

  const slideSpan = Math.max(nav.total.value - firstVisibleSlide, 1)
  return Math.min(1, Math.max(0, (nav.currentPage.value - firstVisibleSlide) / slideSpan))
})

const progressPercent = computed(() => `${progress.value * 100}%`)
</script>

<template>
  <div v-if="showProgress" class="duplo-progress" aria-hidden="true">
    <div class="duplo-progress__track">
      <div class="duplo-progress__sleepers" />
      <div class="duplo-progress__active" :style="{ width: progressPercent }" />
      <div class="duplo-progress__rail duplo-progress__rail--top" />
      <div class="duplo-progress__rail duplo-progress__rail--bottom" />
      <img
        class="duplo-progress__train"
        src="/shots/duplo-progress-train.png"
        alt=""
        :style="{ left: progressPercent }"
      />
    </div>
  </div>
</template>

<style>
.duplo-progress {
  position: absolute;
  inset: auto 0 0;
  height: 48px;
  z-index: 20;
  pointer-events: none;
}

.duplo-progress__track {
  position: absolute;
  left: 5%;
  right: 5%;
  bottom: 26px;
  height: 14px;
}

.duplo-progress__sleepers {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent 0 10px,
    rgba(33, 54, 79, 0.34) 10px 13px,
    transparent 13px 28px
  );
}

.duplo-progress__active {
  position: absolute;
  top: 5px;
  left: 0;
  height: 4px;
  background: var(--atm-orange);
  opacity: 0.34;
  transition: width 650ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.duplo-progress__rail {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--atm-orange);
  box-shadow: 0 0 8px rgba(255, 90, 0, 0.24);
}

.duplo-progress__rail--top { top: 2px; }
.duplo-progress__rail--bottom { bottom: 1px; }

.duplo-progress__train {
  position: absolute;
  bottom: -2px;
  width: 78px;
  height: auto;
  transform: translateX(-50%);
  opacity: 0.72;
  filter: saturate(0.75) drop-shadow(0 2px 2px rgba(0, 0, 0, 0.22));
  transition: left 650ms cubic-bezier(0.22, 0.61, 0.36, 1);
}
</style>
