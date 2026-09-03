<!--
  Cover, after the template's slideLayout2 + slide 2:
  full-bleed orb/hand artwork, 72pt title at 39.8% down, standfirst under it,
  ATM 19 lockup bottom-right.
-->
<template>
  <div class="slidev-layout atm-slide atm--dark atm-cover">
    <div class="atm-slide__bg" style="background-image: url(/atm/bg-orb-hand.jpg)" />
    <div class="atm-slide__body">
      <div class="atm-cover__content">
        <slot />
      </div>
      <div class="atm-foot atm-cover__foot">
        <slot name="foot" />
      </div>
    </div>
    <AtmLogo />
  </div>
</template>

<style scoped>
/* Template slide 2 sets the hero at 39.8% down with the standfirst in the
   footnote band at 83.7%; the title box here is widened to 26% from the right
   so a five-word English title still breaks where the <br> asks it to. */
.atm-cover__content {
  position: absolute;
  left: var(--atm-gutter);
  right: 26%;
  top: 268px;                 /* 37.2% of 720 */
}
/* .atm-foot anchors to its parent's bottom-left; on the cover that parent is
   the whole slide, so restore the gutter and the 58px baseline by hand. */
.atm-cover__foot {
  left: var(--atm-gutter);
  right: 30%;
  bottom: 58px;
}
.atm-cover__content :deep(h1) {
  font-size: var(--atm-fs-hero);
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.55);
}
.atm-cover__content :deep(h1 + *) { margin-top: 1.15em; }
</style>
