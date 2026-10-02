<!--
  The artwork is taken from the organiser's speaker-board PDF, with only its
  typeset copy removed. Keeping the photo, colour treatment, blur, event mark
  and circuit details in one lossless image preserves their exact composition;
  the heading and speaker details below remain editable Slidev text.
-->
<template>
  <div class="slidev-layout atm-slide atm--dark atm-cover">
    <div class="atm-cover__background" aria-hidden="true" />
    <div class="atm-slide__body">
      <div class="atm-cover__slot">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.atm-cover {
  background: #000;
}

.atm-cover__background {
  position: absolute;
  inset: 0;
  background: url('/atm/cover-background.png') center / 100% 100% no-repeat;
}

.atm-cover__slot {
  position: absolute;
  inset: 0;
}

/* The fractional offsets account for the PDF's glyph placement in Chromium. */
.atm-cover__slot :deep(.atm-cover__copy) {
  position: absolute;
  left: calc(55.25% - 0.5px);
  right: 6%;
  top: 40.05%;
}

.atm-cover__slot :deep(.atm-cover__copy h1) {
  max-width: 510px;
  font-family: 'Inter', 'Open Sans', sans-serif;
  color: #eeece1;
  font-size: 48.5px;
  font-weight: 100;
  line-height: 1.08;
  letter-spacing: 0;
  text-transform: none;
  text-rendering: geometricPrecision;
}

.atm-cover__slot :deep(.atm-cover__speaker) {
  position: absolute;
  top: 77.2%;
  left: calc(55.25% - 0.5px);
  right: 5%;
}

.atm-cover__slot :deep(.atm-cover__speaker p) {
  margin: 0;
  color: #eeece1;
  line-height: 1.4;
  text-rendering: geometricPrecision;
}

.atm-cover__slot :deep(.atm-cover__speaker .atm-cover__name) {
  margin-bottom: 0.28em;
  font-family: 'Inter', 'Open Sans', sans-serif;
  font-size: 28.315px; /* 35pt on the PDF's 890pt-high page */
  font-weight: 300;
}

.atm-cover__slot :deep(.atm-cover__speaker .atm-cover__role) {
  position: relative;
  left: -1px;
  top: -1px;
  font-family: 'Inter', 'Open Sans', sans-serif;
  font-size: 20.225px; /* 25pt on the PDF's 890pt-high page */
  font-weight: 200;
}
</style>
