<script setup lang="ts">
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'

const { $clicksContext: clicks } = useSlideContext()

const activeStep = computed(() => Math.min(3, Math.max(1, clicks.current)))
</script>

<template>
  <div class="ble-flow" aria-label="BLE connection sequence diagram">
    <div class="ble-flow__sequence">
      <div class="ble-flow__step" :class="{ 'ble-flow__step--active': activeStep === 1 }">
        <div class="ble-flow__step-no">01</div>
        <div class="ble-flow__body">
          <div class="ble-flow__packet ble-flow__packet--train">ADV_IND</div>
          <div class="ble-flow__detail">Train advertises</div>
        </div>
      </div>

      <div
        class="ble-flow__join ble-flow__join--annotated"
        aria-label="Optional scan request and scan response"
      >
        <span />
        <div class="ble-flow__transition-note">
          <strong>SCAN_REQ / SCAN_RSP</strong>
          <small>Train returns name + interval range</small>
        </div>
      </div>

      <div class="ble-flow__step" :class="{ 'ble-flow__step--active': activeStep === 2 }">
        <div class="ble-flow__step-no">02</div>
        <div class="ble-flow__body">
          <div class="ble-flow__packet">CONNECT_IND</div>
          <div class="ble-flow__detail">Central connects</div>
        </div>
      </div>

      <div
        class="ble-flow__join ble-flow__join--annotated"
        aria-label="Link Layer setup"
      >
        <span />
        <div class="ble-flow__transition-note">
          <strong>Link Layer</strong>
          <small>Control exchange; data hops across channels 0–36</small>
        </div>
      </div>

      <div class="ble-flow__step ble-flow__step--last" :class="{ 'ble-flow__step--active': activeStep === 3 }">
        <div class="ble-flow__step-no">03</div>
        <div class="ble-flow__body">
          <div class="ble-flow__packet ble-flow__packet--gatt">GATT / ATT</div>
          <div class="ble-flow__detail">Commands and data</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ble-flow {
  margin-top: 0;
  margin-bottom: 0.2em;
  color: var(--atm-ink);
}

.ble-flow__sequence {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 175px minmax(0, 1fr) 175px minmax(0, 1fr);
  align-items: center;
}

.ble-flow__step {
  display: grid;
  grid-template-columns: 2.1em minmax(0, 1fr);
  column-gap: 0.45em;
  align-items: center;
  min-height: 62px;
  padding: 0.55em 0.65em 0.6em;
  border: 1px solid rgba(0, 0, 0, 0.16);
  background: rgba(0, 0, 0, 0.025);
  transition: border-color 160ms ease, background-color 160ms ease;
}

.ble-flow__step--active {
  border-color: var(--atm-orange);
  background: color-mix(in srgb, var(--atm-orange) 9%, transparent);
}

.ble-flow__step-no {
  grid-row: 1 / span 2;
  align-self: center;
  color: var(--atm-orange);
  font-size: var(--atm-fs-caption);
  font-weight: 700;
  letter-spacing: 0.12em;
}

.ble-flow__body {
  min-width: 0;
}

.ble-flow__join {
  position: relative;
  height: 1px;
  background: var(--atm-orange);
  opacity: 0.55;
}

.ble-flow__join span {
  display: block;
  width: 0;
  height: 0;
  margin: -3px 0 0 auto;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 7px solid var(--atm-orange);
}

.ble-flow__join--annotated {
  height: 68px;
  background: none;
  opacity: 1;
}

.ble-flow__join--annotated::before {
  content: '';
  position: absolute;
  top: 18px;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--atm-orange);
  opacity: 0.55;
}

.ble-flow__join--annotated span {
  position: absolute;
  top: 15px;
  right: 0;
  margin: 0;
}

.ble-flow__transition-note {
  position: absolute;
  top: 31px;
  left: 50%;
  width: 142px;
  padding: 0.32em 0.35em 0.36em;
  transform: translateX(-50%);
  border: 1px solid rgba(0, 0, 0, 0.14);
  background: rgba(0, 0, 0, 0.025);
  text-align: center;
  color: var(--atm-ink);
  transition: border-color 160ms ease, background-color 160ms ease;
}

.ble-flow__transition-note strong,
.ble-flow__transition-note small {
  display: block;
}

.ble-flow__transition-note strong {
  font-family: var(--slidev-code-font-family, ui-monospace, monospace);
  font-size: 0.57em;
  line-height: 1.1;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.ble-flow__transition-note small {
  margin-top: 0.22em;
  font-size: 0.56em;
  line-height: 1.1;
  opacity: 0.72;
}

.ble-flow__packet {
  display: inline-block;
  padding: 0.16em 0.28em;
  color: var(--atm-paper);
  background: var(--atm-navy);
  font-family: var(--slidev-code-font-family, ui-monospace, monospace);
  font-size: 0.78em;
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.ble-flow__detail {
  margin-top: 0.35em;
  font-size: 0.72em;
  line-height: 1.2;
  opacity: 0.78;
}

</style>
