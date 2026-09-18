<template>
  <div class="ble-flow" aria-label="BLE connection sequence diagram">
    <!-- <div class="ble-flow__actors">
      <div class="ble-flow__actor ble-flow__actor--train">
        <strong>TRAIN BASE</strong>
        <span>Peripheral · GATT server</span>
      </div>
      <div class="ble-flow__actor ble-flow__actor--central">
        <strong>PHONE / SCRIPT</strong>
        <span>Central · GATT client</span>
      </div>
    </div> -->

    <div class="ble-flow__sequence">
      <div v-click="1" class="ble-flow__step">
        <div class="ble-flow__step-no">01</div>
        <div class="ble-flow__packet ble-flow__packet--train">ADVERTISEMENT</div>
        <div class="ble-flow__direction">Train to everyone</div>
        <div class="ble-flow__detail">Periodic beacon with name and manufacturer data</div>
        <code>channels 37 · 38 · 39</code>
      </div>

      <div v-click="2" class="ble-flow__join" aria-hidden="true"><span /></div>

      <div v-click="2" class="ble-flow__step">
        <div class="ble-flow__step-no">02</div>
        <div class="ble-flow__packet">CONNECT_IND</div>
        <div class="ble-flow__direction">Central to train</div>
        <div class="ble-flow__detail">One-time connection request</div>
        <code>AA · ChM · hop</code>
      </div>

      <div v-click="3" class="ble-flow__join" aria-hidden="true"><span /></div>

      <div v-click="3" class="ble-flow__step">
        <div class="ble-flow__step-no">03</div>
        <div class="ble-flow__packet ble-flow__packet--both">CONNECTED LINK</div>
        <div class="ble-flow__direction">Both devices</div>
        <div class="ble-flow__detail">Packets hop across channels 0–36 using a shared sequence</div>
        <code>0–36 · frequency hopping</code>
      </div>

      <div v-click="4" class="ble-flow__join" aria-hidden="true"><span /></div>

      <div v-click="4" class="ble-flow__step ble-flow__step--last">
        <div class="ble-flow__step-no">04</div>
        <div class="ble-flow__packet ble-flow__packet--gatt">GATT</div>
        <div class="ble-flow__direction">Commands and data</div>
        <div class="ble-flow__detail">Writes control the train, notifications carry sensor values</div>
        <div class="ble-flow__spacer" aria-hidden="true" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ble-flow {
  margin-top: 0.2em;
  color: var(--atm-ink);
}

  /* .ble-flow__actors {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin: 0 0 0.75em;
    padding: 0 0.2em;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: var(--atm-fs-caption);
  } */

.ble-flow__actor {
  display: flex;
  flex-direction: column;
  gap: 0.15em;
}

.ble-flow__actor strong {
  color: var(--atm-orange);
  font-size: 1.05em;
}

.ble-flow__actor span {
  opacity: 0.58;
  font-size: 0.9em;
}

/* .ble-flow__actor--central { text-align: right; } */

.ble-flow__sequence {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px minmax(0, 1fr) 28px minmax(0, 1fr) 28px minmax(0, 1fr);
  align-items: center;
}

.ble-flow__step {
  min-height: 190px;
  padding: 0.85em 0.8em 0.9em;
  border: 1px solid rgba(0, 0, 0, 0.16);
  background: rgba(0, 0, 0, 0.025);
}

.ble-flow__step--hot {
  border-color: var(--atm-orange);
  background: color-mix(in srgb, var(--atm-orange) 9%, transparent);
}

/* v-click keeps the grid in place while the sequence builds. The current
   tile gets the orange treatment; previously shown tiles settle to grey. */
.ble-flow__step.slidev-vclick-current {
  border-color: var(--atm-orange);
  background: color-mix(in srgb, var(--atm-orange) 9%, transparent);
}

.ble-flow__step.slidev-vclick-prior {
  border-color: rgba(0, 0, 0, 0.16);
  background: rgba(0, 0, 0, 0.025);
}

/* Keep the final tile highlighted when the closing note appears on the next
   click. */
.ble-flow__step--last.slidev-vclick-prior {
  border-color: var(--atm-orange);
  background: color-mix(in srgb, var(--atm-orange) 9%, transparent);
}

.ble-flow__step-no {
  color: var(--atm-orange);
  font-size: var(--atm-fs-caption);
  font-weight: 700;
  letter-spacing: 0.12em;
  margin-bottom: 0.8em;
}

.ble-flow__packet {
  display: inline-block;
  padding: 0.18em 0.3em;
  color: var(--atm-paper);
  background: var(--atm-navy);
  font-family: var(--slidev-code-font-family, ui-monospace, monospace);
  font-size: 0.88em;
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.ble-flow__direction {
  margin-top: 0.8em;
  color: var(--atm-orange);
  font-size: var(--atm-fs-caption);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.ble-flow__detail {
  min-height: 4.1em;
  margin-top: 0.45em;
  font-size: 0.78em;
  line-height: 1.35;
  opacity: 0.78;
}

/* Invisible replacement for the removed technical label in tile 04. It keeps
   the four cards aligned without adding another visible detail. */
.ble-flow__spacer {
  display: block;
  height: 1.91em;
  margin-top: 0.75em;
  font-size: 0.68em;
}

.ble-flow code {
  display: block;
  margin-top: 0.75em;
  padding: 0.28em 0.35em;
  color: #8e3300;
  background: color-mix(in srgb, var(--atm-orange) 10%, transparent);
  font-size: 0.68em;
  line-height: 1.35;
  white-space: normal;
  overflow-wrap: anywhere;
}

.ble-flow__join {
  height: 1px;
  background: var(--atm-orange);
  opacity: 0.55;
}

.ble-flow__join span {
  display: block;
  width: 6px;
  height: 6px;
  margin: -2px 0 0 auto;
  background: var(--atm-orange);
  transform: rotate(45deg);
}
</style>
