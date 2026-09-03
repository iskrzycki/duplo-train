<!--
  The template's signature connector: dot -> horizontal -> 45deg rise ->
  horizontal -> dot. Redrawn as SVG (geometry traced from the template's
  image10.png, 1620x582) so it can be flipped and scaled without artefacts.
-->
<script setup lang="ts">
const props = withDefaults(defineProps<{
  width?: string
  color?: string
  flipX?: boolean
  flipY?: boolean
}>(), { width: '140px', color: 'var(--atm-orange)', flipX: false, flipY: false })

const transform = () =>
  [props.flipX ? 'scaleX(-1)' : '', props.flipY ? 'scaleY(-1)' : ''].filter(Boolean).join(' ')
</script>

<template>
  <svg
    class="atm-connector"
    viewBox="0 0 1620 582"
    :style="{ width: props.width, transform: transform() }"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M27 550 H730 L1265 31 H1593"
      :stroke="props.color"
      stroke-width="11"
      stroke-linecap="square"
    />
    <circle cx="27" cy="550" r="27" :fill="props.color" />
    <circle cx="1593" cy="31" r="27" :fill="props.color" />
  </svg>
</template>

<style scoped>
.atm-connector { display: block; height: auto; overflow: visible; }
</style>
