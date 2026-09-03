<!--
  Closing slide, after template slide 23: dark orb ground, "THANK YOU!" at
  72pt, credits below, connector bottom-right, ATM 19 lockup.
-->
<template>
  <div class="slidev-layout atm-slide atm--dark atm-end">
    <div class="atm-slide__bg" style="background-image: url(/atm/bg-orb.jpg)" />
    <div class="atm-slide__scrim" />
    <div class="atm-slide__deco">
      <Deco src="deco-connector" :x="70" :y="74.5" :w="16.3" />
    </div>
    <div class="atm-slide__body">
      <div class="atm-end__content"><slot /></div>
    </div>
    <AtmLogo />
  </div>
</template>

<style scoped>
.atm-end__content {
  position: absolute;
  left: var(--atm-gutter);
  right: var(--atm-gutter);
  top: 34%;
}
.atm-end__content :deep(h1) {
  font-size: var(--atm-fs-hero);
  text-shadow: 0 2px 22px rgba(0, 0, 0, 0.55);
}
.atm-end__content :deep(h1 + *) { margin-top: 1.2em; }
</style>
