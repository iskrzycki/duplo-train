<script setup lang="ts">
withDefaults(defineProps<{
  photo: string
  backdrop?: string
  position?: string
  imageScale?: number
  imageOffsetY?: string
}>(), {
  backdrop: '',
  position: 'center',
  imageScale: 1,
  imageOffsetY: '0px',
})
</script>

<template>
  <div class="slidev-layout atm-slide atm--dark atm-photo">
    <img v-if="backdrop" class="atm-photo__backdrop" :src="backdrop" alt="" aria-hidden="true" />
    <img
      class="atm-photo__image"
      :src="photo"
      alt=""
      :style="{
        objectPosition: position,
        transform: `translateY(${imageOffsetY}) scale(${imageScale})`,
      }"
    />
    <div class="atm-photo__body">
      <div class="atm-photo__content">
        <slot />
      </div>
    </div>
    <AtmLogo variant="orange" />
  </div>
</template>

<style scoped>
.atm-photo__backdrop,
.atm-photo__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.atm-photo {
  background: var(--atm-void);
}

.atm-photo__backdrop {
  z-index: 0;
  object-fit: cover;
  filter: blur(20px);
  transform: scale(1.08);
  opacity: 0.38;
}

.atm-photo__image {
  z-index: 1;
  object-fit: contain;
  padding: 2.5% 7%;
}

.atm-photo__body {
  position: absolute;
  inset: 0;
  z-index: 3;
}

.atm-photo__content {
  position: absolute;
  left: var(--atm-gutter);
  right: 27%;
  bottom: 7.5%;
}

.atm-photo__content :deep(h1) {
  font-size: var(--atm-fs-hero);
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.9);
}

.atm-photo__content :deep(h1 + *) { margin-top: 0.6em; }
</style>
