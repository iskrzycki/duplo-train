<script setup lang="ts">
type Rect = [left: number, top: number, width: number, height: number]

type Annotation = {
  label: string
  rect: Rect
  title: string
  value?: string
  description: string
}

const props = withDefaults(defineProps<{
  src: string
  annotations: Annotation[]
  mode?: 'accumulate' | 'focus'
  alt?: string
}>(), {
  mode: 'accumulate',
  alt: 'Annotated screenshot',
})

function clickRange(index: number) {
  const click = index + 1
  return props.mode === 'focus' ? [click, click] : click
}

function rectStyle([left, top, width, height]: Rect) {
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
  }
}
</script>

<template>
  <div class="annotated-screenshot" :class="`annotated-screenshot--${mode}`">
    <div class="annotated-screenshot__image">
      <img :src="src" :alt="alt" />

      <div
        v-for="(annotation, index) in annotations"
        :key="annotation.label"
        v-click="clickRange(index)"
        class="annotated-screenshot__highlight"
        :style="rectStyle(annotation.rect)"
      >
        <span class="annotated-screenshot__pin">{{ annotation.label }}</span>
      </div>
    </div>

    <div class="annotated-screenshot__notes">
      <div
        v-for="(annotation, index) in annotations"
        :key="annotation.title"
        v-click="clickRange(index)"
        class="annotated-screenshot__note"
      >
        <div class="atm-caption">{{ annotation.title }}</div>
        <strong v-if="annotation.value"><code>{{ annotation.value }}</code></strong>
        <span v-if="annotation.value"> </span>{{ annotation.description }}
      </div>
    </div>

    <div class="annotated-screenshot__hint" v-click.hide="1">
      Klikaj dalej, aby odsłonić najważniejsze pola ramki.
    </div>
  </div>
</template>

<style scoped>
.annotated-screenshot {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 1.25rem;
  align-items: start;
}

.annotated-screenshot :deep(.slidev-vclick-target) {
  transition: none;
}

.annotated-screenshot__image {
  position: relative;
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: #111;
}

.annotated-screenshot__image img {
  display: block;
  width: 100%;
  height: auto;
}

.annotated-screenshot__highlight {
  position: absolute;
  border: 3px solid var(--atm-orange);
  background: rgba(255, 90, 0, 0.15);
  pointer-events: none;
}

.annotated-screenshot__pin {
  position: absolute;
  right: 0.45rem;
  top: -1.65rem;
  padding: 0.25rem 0.45rem;
  color: #fff;
  background: var(--atm-orange);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.annotated-screenshot__notes {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.annotated-screenshot--focus .annotated-screenshot__notes {
  position: relative;
  min-height: 132px;
}

.annotated-screenshot--focus .annotated-screenshot__note {
  position: absolute;
  inset: 0 0 auto;
}

.annotated-screenshot__hint {
  grid-column: 1;
  margin-top: -0.65rem;
  color: rgba(255, 255, 255, 0.62);
  font-size: var(--atm-fs-caption);
}

.annotated-screenshot__note {
  align-self: stretch;
  padding: 0.65rem 0.75rem;
  border-left: 2px solid var(--atm-orange);
  background: rgba(255, 255, 255, 0.06);
  font-size: 13px;
  line-height: 1.28;
}

.annotated-screenshot__note .atm-caption {
  margin-bottom: 0.35rem;
  color: var(--atm-orange);
  text-transform: uppercase;
}
</style>
