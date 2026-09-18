<!--
  Standard light content slide, after slideLayout8/9/13 (+ slides 7, 8, 9):
  white ground, orange title, circuit-trace decorations.

  Frontmatter knobs:
    deco: chip | squares | hand | ring | corner | none   (default: chip)
    dense: true    lifts the title to 21.7%
    top: 100       custom content offset in pixels
-->
<script setup lang="ts">
withDefaults(defineProps<{
  deco?: 'chip' | 'squares' | 'hand' | 'ring' | 'corner' | 'none'
  dense?: boolean
  top?: number
}>(), { deco: 'chip', dense: false })
</script>

<template>
  <div class="slidev-layout atm-slide atm--light">
    <div class="atm-slide__bg" />

    <div class="atm-slide__deco">
      <!-- slideLayout9: trace in the top-left corner, chip cluster bottom-right -->
      <template v-if="deco === 'chip'">
        <Deco src="deco-corner" :x="1.7" :y="3.7" :w="16.9" />
        <Deco src="deco-chip" :x="76" :y="74.3" :w="21.7" />
      </template>
      <!-- slideLayout8: chevron stack on the left edge, squares bottom-right -->
      <template v-else-if="deco === 'squares'">
        <Deco src="deco-corner" :x="1.7" :y="3.7" :w="16.9" />
        <Deco src="deco-chevrons" :x="0" :y="17.2" :w="8.1" />
        <Deco src="deco-squares" :x="79" :y="74.7" :w="19.6" />
      </template>
      <!-- slideLayout7: halftone hand bleeding off the top-right -->
      <template v-else-if="deco === 'hand'">
        <Deco src="art-hand" :x="64.7" :y="-2" :w="35.3" />
        <Deco src="deco-connector" :x="-4.5" :y="17.6" :w="15.1" />
      </template>
      <template v-else-if="deco === 'ring'">
        <Deco src="deco-corner" :x="1.7" :y="3.7" :w="16.9" />
        <Deco src="deco-ring" :x="56.4" :y="19.9" :w="46" />
      </template>
      <template v-else-if="deco === 'corner'">
        <Deco src="deco-corner" :x="1.7" :y="3.7" :w="16.9" />
      </template>
    </div>

    <div class="atm-slide__body">
      <div
        class="atm-content"
        :class="{ 'atm-content--hi': dense }"
        :style="top ? { top: `${top}px` } : undefined"
      >
        <slot />
      </div>
    </div>
  </div>
</template>
