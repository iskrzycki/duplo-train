<!--
  Full-bleed statement, the "one idea, no furniture" slide. Dark bokeh ground,
  the sentence set at cover size, vertically centred in the gutter grid.
-->
<script setup lang="ts">
withDefaults(defineProps<{
  bg?: 'soft' | 'bokeh' | 'orb' | 'orb-hand' | 'void'
  align?: 'left' | 'center'
}>(), { bg: 'bokeh', align: 'left' })
</script>

<template>
  <div class="slidev-layout atm-slide atm--dark atm-statement" :class="`atm-statement--${align}`">
    <div
      class="atm-slide__bg"
      :style="bg === 'void' ? { background: 'var(--atm-void)' } : { backgroundImage: `url(/atm/bg-${bg}.jpg)` }"
    />
    <div class="atm-slide__scrim" />
    <div class="atm-slide__deco">
      <Deco src="deco-dots" :x="9.7" :y="80" :w="10" :opacity="0.8" />
    </div>
    <div class="atm-slide__body">
      <div class="atm-content atm-content--center atm-statement__content">
        <slot />
      </div>
    </div>
    <AtmLogo />
  </div>
</template>

<style scoped>
.atm-statement__content :deep(h1) {
  font-size: 50px;
  text-shadow: 0 2px 22px rgba(0, 0, 0, 0.55);
}
.atm-statement__content :deep(h1 + *) { margin-top: 1.1em; }
.atm-statement--left .atm-statement__content { right: 26%; }
.atm-statement--center .atm-statement__content {
  left: 8%;
  right: 8%;
  text-align: center;
  align-items: center;
}
.atm-statement--center .atm-statement__content :deep(h1) { max-width: 20em; }
</style>
