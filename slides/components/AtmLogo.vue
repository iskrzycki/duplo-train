<!--
  ATM 19 lockup, bottom-right, at the size and position the template uses
  (x=87.2% y=81.5% w=9.5%). Two artworks ship with the template: a white/orange
  one for dark surfaces and an all-orange one for light surfaces.
-->
<script setup lang="ts">
const props = withDefaults(defineProps<{ variant?: 'light' | 'orange' }>(), {
  variant: 'light',
})
</script>

<template>
  <img
    class="atm-logo"
    :src="`/atm/logo-atm19-${props.variant}.png`"
    alt="Allegro Tech Meeting 19"
  />
</template>
