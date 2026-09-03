<!--
  One LWP3 frame rendered as labelled byte boxes. `hot` marks the byte the
  slide is talking about.

    <PacketBytes :bytes="[['08','len'], ['00','hub'], ...]" :hot="[7]" />
-->
<script setup lang="ts">
withDefaults(defineProps<{
  bytes: [string, string][]
  hot?: number[]
}>(), { hot: () => [] })
</script>

<template>
  <div class="atm-bytes">
    <div
      v-for="([hex, label], i) in bytes"
      :key="i"
      class="atm-byte"
      :class="{ 'atm-byte--hot': hot.includes(i) }"
    >
      <div class="atm-byte__hex">{{ hex }}</div>
      <div class="atm-byte__label">{{ label }}</div>
    </div>
  </div>
</template>
