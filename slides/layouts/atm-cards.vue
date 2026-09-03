<!--
  The numbered-card row, after template slide 11: title in the default slot,
  then N cards across the lower two-thirds in the `cards` slot.

    ---
    layout: atm-cards
    ---
    # Title
    ::cards::
    <NumCard num="01" title="...">body</NumCard>
-->
<script setup lang="ts">
withDefaults(defineProps<{
  bg?: 'soft' | 'bokeh' | 'orb' | 'void'
  cols?: number
}>(), { bg: 'bokeh', cols: 4 })
</script>

<template>
  <div class="slidev-layout atm-slide atm--dark">
    <div
      class="atm-slide__bg"
      :style="bg === 'void' ? { background: 'var(--atm-void)' } : { backgroundImage: `url(/atm/bg-${bg}.jpg)` }"
    />
    <div class="atm-slide__body">
      <div class="atm-content atm-content--hi atm-cards">
        <slot />
        <div class="atm-cards__grid" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
          <slot name="cards" />
        </div>
      </div>
    </div>
    <AtmLogo />
  </div>
</template>

<style scoped>
/*
 * Template slide 11 anchors this row absolutely: numerals at 39.8% (286px),
 * card boxes 51.7% -> 74.5% (372px -> 536px). Pinning the grid rather than
 * letting it flow keeps that rhythm whatever the title does.
 */
.atm-cards__grid {
  position: absolute;
  left: 0;
  right: 0;
  top: 130px;                 /* 286px on the slide, minus .atm-content's 156px */
  height: 250px;
  display: grid;
  column-gap: 3.2%;
  align-items: stretch;
}
</style>
