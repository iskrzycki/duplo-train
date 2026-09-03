<!--
  Standard dark content slide, after slideLayout5/6 (+ slides 5, 10, 14):
  photographic background, optional inset panel, title at 26.4%, body at 42.9%.

  Frontmatter knobs:
    bg: soft | bokeh | orb | orb-hand | void   (default: soft)
    panel: true | 'soft' | false               (default: false)
    dense: true                                 lifts the title to 21.7%
    deco: none | corner | connector | chip | ring   (default: connector)
-->
<script setup lang="ts">
withDefaults(defineProps<{
  bg?: 'soft' | 'bokeh' | 'orb' | 'orb-hand' | 'void'
  panel?: boolean | 'soft'
  dense?: boolean
  deco?: 'none' | 'corner' | 'connector' | 'chip' | 'ring'
}>(), { bg: 'soft', panel: false, dense: false, deco: 'connector' })
</script>

<template>
  <div class="slidev-layout atm-slide atm--dark">
    <div
      class="atm-slide__bg"
      :style="bg === 'void' ? { background: 'var(--atm-void)' } : { backgroundImage: `url(/atm/bg-${bg}.jpg)` }"
    />
    <div
      v-if="panel"
      class="atm-slide__panel"
      :class="{ 'atm-slide__panel--soft': panel === 'soft' }"
    />

    <div class="atm-slide__deco">
      <!-- Decoration positions copied from the matching template layouts. -->
      <Deco v-if="deco === 'connector'" src="deco-connector" :x="76.9" :y="74.5" :w="16.3" />
      <Deco v-if="deco === 'corner'" src="deco-corner" :x="1.7" :y="3.7" :w="16.9" />
      <Deco v-if="deco === 'chip'" src="deco-chip" :x="76" :y="74.3" :w="21.7" />
      <Deco v-if="deco === 'ring'" src="deco-ring" :x="56.4" :y="19.9" :w="46" :opacity="0.75" />
    </div>

    <div class="atm-slide__body">
      <div class="atm-content" :class="{ 'atm-content--hi': dense }">
        <slot />
      </div>
    </div>
  </div>
</template>
