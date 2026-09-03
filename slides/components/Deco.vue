<!--
  Positions one of the template's decoration PNGs by percentage of the canvas,
  the same way the .pptx anchors them. Percentages are passed as plain numbers.

    <Deco src="deco-corner" :x="1.7" :y="3.7" :w="16.9" />
-->
<script setup lang="ts">
const props = withDefaults(defineProps<{
  src: string
  x?: number
  y?: number
  w?: number
  h?: number
  opacity?: number
  flipX?: boolean
  flipY?: boolean
}>(), { opacity: 1, flipX: false, flipY: false })

const style = () => {
  const s: Record<string, string> = { opacity: String(props.opacity) }
  if (props.x != null) s.left = `${props.x}%`
  if (props.y != null) s.top = `${props.y}%`
  if (props.w != null) s.width = `${props.w}%`
  if (props.h != null) s.height = `${props.h}%`
  const t = [props.flipX ? 'scaleX(-1)' : '', props.flipY ? 'scaleY(-1)' : ''].filter(Boolean)
  if (t.length) s.transform = t.join(' ')
  return s
}
</script>

<template>
  <img class="atm-deco" :src="`/atm/${props.src}.png`" :style="style()" alt="" aria-hidden="true" />
</template>
