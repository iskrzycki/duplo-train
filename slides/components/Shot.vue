<!--
  A picture on a slide, with a stand-in until the real file exists.

    <Shot label="Photo — nRF52840 dongle" hint="public/shots/dongle.jpg" />
    <Shot src="/shots/dongle.jpg" caption="nRF52840 dongle + nRF Sniffer" />

  Drop the file into `public/shots/`, add `src`, and the dashed box is replaced
  by the image. `ratio` is any CSS aspect-ratio and keeps the layout from
  jumping when the picture lands.
-->
<script setup lang="ts">
withDefaults(defineProps<{
  src?: string
  label?: string
  hint?: string
  caption?: string
  ratio?: string
  plain?: boolean
}>(), { ratio: '16/10', plain: false })
</script>

<template>
  <figure class="atm-shot" :class="{ 'atm-shot--plain': plain }">
    <img v-if="src" :src="src" :alt="caption ?? label ?? ''" />
    <div v-else class="atm-shot__ph" :style="{ aspectRatio: ratio }">
      <div class="atm-shot__icon">🖼</div>
      <div class="atm-shot__label">{{ label ?? 'Picture goes here' }}</div>
      <code v-if="hint" class="atm-shot__hint">{{ hint }}</code>
    </div>
    <figcaption v-if="caption" class="atm-caption">{{ caption }}</figcaption>
  </figure>
</template>

<style scoped>
.atm-shot { margin: 0; }
.atm-shot img {
  display: block;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.28);
}
.atm-shot--plain img { border: 0; }
.atm--light .atm-shot img { border-color: rgba(0, 0, 0, 0.18); }

.atm-shot__ph {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  width: 100%;
  border: 2px dashed color-mix(in srgb, var(--atm-orange) 55%, transparent);
  background: rgba(255, 255, 255, 0.04);
  text-align: center;
  padding: 0 1.2em;
}
.atm--light .atm-shot__ph { background: rgba(0, 0, 0, 0.03); }

.atm-shot__icon { font-size: 26px; opacity: 0.55; line-height: 1; }
.atm-shot__label {
  font-size: var(--atm-fs-small);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--atm-orange);
}
.atm-shot__hint { font-size: var(--atm-fs-caption); opacity: 0.6; }
.atm-shot figcaption { margin-top: 0.5em; }
</style>
