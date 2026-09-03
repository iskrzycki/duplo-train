<!--
  Two-column slide: default slot is the left column, `::right::` the right one.
  Mirrors template slides 5 / 15 / 16 — title spans the left column, the media
  or secondary column sits in the right two-fifths.

  Frontmatter knobs:
    surface: dark | light      (default: dark)
    bg: soft | bokeh | orb     (dark surface only, default: soft)
    panel: true | 'soft'       (dark surface only)
    ratio: '1fr 1fr' | '3fr 2fr' | ...   (default: '1.05fr 1fr')
    deco: as per the dark/light layouts
-->
<script setup lang="ts">
withDefaults(defineProps<{
  surface?: 'dark' | 'light'
  bg?: 'soft' | 'bokeh' | 'orb' | 'orb-hand' | 'void'
  panel?: boolean | 'soft'
  ratio?: string
  dense?: boolean
  deco?: 'none' | 'connector' | 'corner' | 'chip' | 'ring' | 'squares' | 'hand'
}>(), {
  surface: 'dark', bg: 'soft', panel: false, ratio: '1.05fr 1fr',
  dense: false, deco: 'connector',
})
</script>

<template>
  <div class="slidev-layout atm-slide" :class="surface === 'dark' ? 'atm--dark' : 'atm--light'">
    <div
      v-if="surface === 'dark'"
      class="atm-slide__bg"
      :style="bg === 'void' ? { background: 'var(--atm-void)' } : { backgroundImage: `url(/atm/bg-${bg}.jpg)` }"
    />
    <div v-else class="atm-slide__bg" />
    <div
      v-if="surface === 'dark' && panel"
      class="atm-slide__panel"
      :class="{ 'atm-slide__panel--soft': panel === 'soft' }"
    />

    <div class="atm-slide__deco">
      <Deco v-if="deco === 'connector'" src="deco-connector" :x="76.9" :y="74.5" :w="16.3" />
      <Deco v-if="deco === 'corner'" src="deco-corner" :x="1.7" :y="3.7" :w="16.9" />
      <Deco v-if="deco === 'chip'" src="deco-chip" :x="76" :y="74.3" :w="21.7" />
      <Deco v-if="deco === 'squares'" src="deco-squares" :x="79" :y="74.7" :w="19.6" />
      <Deco v-if="deco === 'ring'" src="deco-ring" :x="56.4" :y="19.9" :w="46" :opacity="0.7" />
      <!-- slideLayout7: the halftone hand bleeding off the top-right corner -->
      <!-- Lifted higher and narrower than in atm-light: on a two-column slide the
           right column needs the lower two-thirds of that band. -->
      <template v-if="deco === 'hand'">
        <Deco src="art-hand" :x="70" :y="-17" :w="30" />
        <Deco src="deco-connector" :x="-4.5" :y="17.6" :w="15.1" />
      </template>
    </div>

    <div class="atm-slide__body">
      <div
        class="atm-content atm-split"
        :class="{ 'atm-content--hi': dense }"
        :style="{ gridTemplateColumns: ratio }"
      >
        <div class="atm-split__col"><slot /></div>
        <div class="atm-split__col"><slot name="right" /></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.atm-split {
  display: grid;
  column-gap: 6%;
  align-content: start;
}
.atm-split__col { min-width: 0; }
</style>
