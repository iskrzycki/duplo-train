<!--
  Section divider, after slideLayout4 + slide 12: dark orb background, a large
  light-weight orange section number, connector, then the section title.
  Pass the number through frontmatter: `number: "02"`.
-->
<script setup lang="ts">
withDefaults(defineProps<{ number?: string }>(), { number: '' })
</script>

<template>
  <div class="slidev-layout atm-slide atm--dark atm-section">
    <div class="atm-slide__bg" style="background-image: url(/atm/bg-orb.jpg)" />
    <div class="atm-slide__scrim" />
    <div class="atm-slide__body">
      <div class="atm-section__content">
        <div v-if="number" class="atm-section__head">
          <div class="atm-section__num">{{ number }}</div>
          <Connector width="150px" />
        </div>
        <slot />
      </div>
    </div>
    <AtmLogo />
  </div>
</template>

<style scoped>
.atm-section__content {
  position: absolute;
  left: var(--atm-gutter);
  right: 42%;
  top: 29%;
}
.atm-section__head {
  display: flex;
  align-items: flex-end;
  gap: 1.1em;
  margin-bottom: 1em;
}
.atm-section__num {
  font-size: 70px;
  font-weight: 300;
  line-height: 0.9;
  color: var(--atm-orange);
  font-variant-numeric: tabular-nums;
}
.atm-section__content :deep(h1) {
  font-size: var(--atm-fs-hero);
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
}
.atm-section__content :deep(h1 + *) { margin-top: 0.9em; max-width: 92%; }
</style>
