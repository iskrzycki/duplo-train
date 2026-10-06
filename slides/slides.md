---
# Styled after the organiser's template: Allegro_Prezentacja atm_19_video_20_08.pptx
# Palette, type scale, geometry and artwork all come from that file — see styles/tokens.css.
theme: default
title: How I hacked my son's LEGO Duplo train
titleTemplate: '%s · ATM 19'
info: |
  ## How I hacked my son's LEGO Duplo train
  A lightning talk about talking to a BLE toy directly — no official app.

  Allegro Tech Meeting #19
author: Rafał Iskrzycki
keywords: BLE,Bluetooth,LEGO,reverse-engineering,GATT,LWP3

# The template canvas is 21.98in x 12.36in (16:9). 1280x720 keeps that ratio and
# makes the pt->px mapping in styles/tokens.css come out on whole pixels.
canvasWidth: 1280
aspectRatio: 16/9

fonts:
  # The template embeds Open Sans + Open Sans Light (weight 300).
  sans: 'Open Sans'
  serif: 'Open Sans'
  mono: 'JetBrains Mono'
  weights: '300,400,600,700'
  provider: none

highlighter: shiki
colorSchema: dark
lineNumbers: false
monaco: dev
drawings:
  persist: false
transition: fade
mdc: true
layout: atm-cover
---

<div class="atm-cover__copy">
  <h1>How I hacked my<br>son's LEGO Duplo<br>train</h1>
</div>

<div class="atm-cover__speaker">
  <p class="atm-cover__name">Rafał Iskrzycki</p>
  <p class="atm-cover__role">Senior Front-End Software Engineer</p>
</div>

<!--
You tap a button in the app, and this little train moves. But what happens in between? We'll find out.
But first, let me tell you how it ended up in my hands.
-->

---
layout: atm-photo
photo: /shots/duplo-box-transparent.png
imageScale: 0.94
imageOffsetY: '-1.5%'
---

<!--
- A Christmas present
- I had to test it
- Train will react to color tiles on the track
- Bottom-left corner, 
- “FREE OPTIONAL APP”
- The app made me curious
-->

---
layout: atm-dark
deco: hand
top: 100
---

# What the official app does

<div class="mx-auto mt-[10px]" style="width: 78%">

<Shot
  src="/shots/duplo-app.png"
  label="Screenshot — official LEGO DUPLO app"
  ratio="2556/1179"
  />

</div>

<!--
- has charming animation at start
- looks dead simple, reasonable for kids
- Control screen
- Train can go forward, backward
- You can turn on the lights, play sounds
- Every tap sends a message
- What does the app actually send?
-->

---
layout: atm-section
---

# Seeing the invisible

<div class="atm-lead">What it takes to listen to BLE packets</div>

<!--
- Messages exist
- I needed to see them
- Time for the right tools
-->

---
layout: atm-split
surface: dark
ratio: 0.82fr 1.35fr
dense: true
top: 128
deco: none
clicks: 2
---

<div class="atm-reveal-title">
  <h2 v-click.hide="1" class="atm-reveal-layer">Hardware</h2>
  <h2 v-click="1" class="atm-reveal-layer">nRF52840 dongle</h2>
</div>

<div class="atm-reveal-stack atm-reveal-stack--hardware">
  <div v-click.hide="1" class="atm-reveal-layer atm-reveal-placeholder">
    <div class="atm-reveal-placeholder__question">?</div>
  </div>
  <div v-click="1" class="atm-reveal-layer">
    <Shot src="/shots/nrf52840.png" label="nRF52840 dongle" plain />
  </div>
</div>

::right::

<div class="atm-reveal-title">
  <h2 v-click.hide="2" class="atm-reveal-layer">Software</h2>
  <h2 v-click="2" class="atm-reveal-layer">Wireshark</h2>
</div>

<div class="atm-reveal-stack atm-reveal-stack--software">
  <div v-click.hide="2" class="atm-reveal-layer atm-reveal-placeholder">
    <div class="atm-reveal-placeholder__question">?</div>
  </div>
  <div v-click="2" class="atm-reveal-layer">
    <Shot
      src="/shots/wireshark-gui.png"
      label="Screenshot — Wireshark GUI"
      plain
    />
  </div>
</div>

<!--
- Nordic Semiconductor Dongle
- I flashed it with Bluetooth LE Sniffer firmware
- It listens without connecting to the train
- It must catch the connection request to follow the link

- Wireshark shows the packets
- open source, industry standard
- I can save the capture and inspect it later
- A Wireshark plugin is needed

- But before we actually will sniff for packets
- we need to clarify one thing
-->

---
layout: atm-dark
deco: squares
top: 100
---

# Bluetooth Classic vs. Bluetooth Low Energy

<div class="atm-sub">Two protocol stacks under one brand name</div>

<div class="grid grid-cols-2 gap-5 mt-6">

<PanelCard v-click title="Bluetooth Classic">

- Continuous streams
- Higher power use
- Audio and game controllers

</PanelCard>

<PanelCard v-click accent title="Bluetooth Low Energy (BLE)">

- Short attribute messages
- Sleeps between events
- Sensors, fitness bands, item trackers and toys

</PanelCard>

</div>

<!--
- One brand, two different protocol stacks
- Classic Bluetooth: steady connection, high security
- on the other hand BLE: short messages and low power, less secure
- The train uses BLE

- Now let's look at a simplified view of the packets exchange
-->

---
layout: atm-dark
deco: none
dense: true
top: 100
clicksStart: 1
---

# BLE connection sequence

<div class="connection-diagram">
  <BleConnectionDiagram />
</div>

<div class="connection-screenshot mt-6">
  <div v-click="[1, 2]" class="connection-screenshot__state">
    <Shot
      src="/shots/wireshark/normalized/ADV_IND.png"
      label="Wireshark frame 3230 — ADV_IND"
      ratio="16/7"
      plain
      />
  </div>

  <div v-click="[2, 3]" class="connection-screenshot__state">
    <Shot
      src="/shots/wireshark/normalized/CONNECT_IND.png"
      label="Wireshark frame 3255 — CONNECT_IND"
      hint="capture frame 3255 · add screenshot here"
      ratio="16/7"
      plain
      />
  </div>

  <div v-click="3" class="connection-screenshot__state">
    <Shot
      src="/shots/wireshark/normalized/ENGINE-WRITE.png"
      label="Wireshark frame 3619 — motor command"
      ratio="16/7"
      plain
      />
  </div>
</div>

<!--
- Simplified BLE exchange, key moments only

- ADV_IND: train advertises, LEGO company ID

- CONNECT_IND: phone connects; sniffer must catch it to follow the link
- Connection, not pairing

- GATT write: LWP3 motor command from the app
- GATT notification: battery level from the train

- Next: engine command and battery notification in detail
-->

---
layout: atm-dark
bg: soft
panel: true
dense: true
deco: none
top: 100
clicks: 2
clicksStart: 1
---

# Commands and notifications

<div class="atm-code-tabs atm-gatt-tabs">

<v-switch>

<template #1>

<div class="atm-code-tabs__tabs">
  <span class="atm-code-tabs__tab atm-code-tabs__tab--active">MOTOR WRITE</span>
  <span class="atm-code-tabs__tab">BATTERY NOTIFICATION</span>
</div>

<div class="atm-code-tabs__panel">
<div class="atm-gatt-tabs__content">

<Shot
  src="/shots/wireshark/normalized/ENGINE-WRITE.png"
  label="Wireshark — motor command write"
  ratio="16/9"
  />

<div class="atm-gatt-spec">

<h3>App → train</h3>

<div class="atm-caption">ATT operation</div>
<code>Write Request (0x12)</code>

<div class="atm-caption mt-3">Characteristic handle</div>
<code>0x000b</code>

<div class="atm-caption mt-3">LWP3 message</div>
<code>0x81 · Port Output Command</code>

</div>

</div>

<div class="mt-2">

<h3 style="margin-bottom: 8px;">Decoded value</h3>

<PacketBytes
  :bytes="[['08','length'],['00','hub'],['81','message'],['00','motor'],['11','flags'],['51','write direct'],['00','power'],['45','+69']]"
  :hot="[3, 7]"
  />

</div>
</div>

</template>

<template #2>

<div class="atm-code-tabs__tabs">
  <span class="atm-code-tabs__tab">MOTOR WRITE</span>
  <span class="atm-code-tabs__tab atm-code-tabs__tab--active">BATTERY NOTIFICATION</span>
</div>

<div class="atm-code-tabs__panel">
<div class="atm-gatt-tabs__content">

<Shot
  src="/shots/wireshark/normalized/BATTERY-NOTIFY.png"
  label="Wireshark — battery notification"
  ratio="16/9"
  />

<div class="atm-gatt-spec">

<h3>Train → app</h3>

<div class="atm-caption">ATT operation</div>
<code>Handle Value Notification (0x1b)</code>

<div class="atm-caption mt-3">Characteristic handle</div>
<code>0x000b</code>

<div class="atm-caption mt-3">LWP3 message</div>
<code>0x01 · Hub Properties</code>

</div>

</div>

<div class="mt-2">

<h3 style="margin-bottom: 8px;">Decoded value</h3>

<PacketBytes
  :bytes="[['06','length'],['00','hub'],['01','hub properties'],['06','battery [%]'],['06','update'],['54','84%']]"
  :hot="[3, 5]"
  />

</div>
</div>

</template>

</v-switch>

</div>

<!--
- App to train: ATT Write Request
- LWP3 in `Value`; highlighted bytes below
- Motor port 0, power: 45 hex = 69 decimal
- The train receives the command and starts moving forward at the requested power

- Next click: train to app, ATT notification
- Battery: 54 hex = 84 decimal (84%)

- Ports, magic numbers comes from LWP3 docs
-->

---
layout: image
image: /shots/ble-iceberg.png
backgroundSize: cover
title: The BLE iceberg
hideProgress: true
---

<span class="sr-only">The BLE iceberg. LWP3, advertising, connecting and GATT writes and notifications sit above the water. Below are rotating private addresses, pairing and bonding, frequency hopping, adaptive channel maps, connection events, CSA #1 and CSA #2, clock drift and window widening, and data whitening. I just wanted the train to move.</span>

<!--
- My talk covers just the tip of this iceberg

- We've barely scratched the surface
- Underneath: channel hopping and connection timing

- Still enough to drive the train and build our own app
-->

---
layout: atm-statement
bg: bokeh
align: center
---

# Can I build my own app?

<v-click>

<div class="atm-lead"><strong>Yes.</strong> There is a JavaScript library for that.</div>
<div class="atm-sub mt-5"><code>node-poweredup</code> · scan · connect · ports · sensors · LWP3</div>

</v-click>

<!--
- My first Bluetooth project
- `node-poweredup` provides a simple API
- supports few lego sets, mainly trains
- covers low level operations (connecting, GATT comunication in both directions)
- Let's look at the code.
-->

---
layout: atm-dark
deco: chip
dense: true
top: 56
clicks: 4
clicksStart: 1
---

# Code samples

<div class="atm-code-tabs atm-code-samples">

<v-switch>

<template #1>

<div class="atm-code-tabs__tabs">
  <span class="atm-code-tabs__tab atm-code-tabs__tab--active">CONNECTION</span>
  <span class="atm-code-tabs__tab">SENSOR EVENTS</span>
  <span class="atm-code-tabs__tab">ENGINE SETUP</span>
  <span class="atm-code-tabs__tab">LIGHTS</span>
</div>

<div class="atm-code-tabs__panel">
<div class="atm-sub">Discover a hub, connect, and start scanning</div>

```js {*}{lines:true}
import { PoweredUP } from 'node-poweredup'

const poweredUP = new PoweredUP()

poweredUP.on('discover', async hub => {
  await hub.connect()
})

poweredUP.scan()
```

</div>

</template>

<template #2>

<div class="atm-code-tabs__tabs">
  <span class="atm-code-tabs__tab">CONNECTION</span>
  <span class="atm-code-tabs__tab atm-code-tabs__tab--active">SENSOR EVENTS</span>
  <span class="atm-code-tabs__tab">ENGINE SETUP</span>
  <span class="atm-code-tabs__tab">LIGHTS</span>
</div>

<div class="atm-code-tabs__panel">
<div class="atm-sub">Read motion and battery updates from notifications</div>

```js {*}{lines:true}
import { Consts } from 'node-poweredup'

const speedometerType = Consts.DeviceType.DUPLO_TRAIN_BASE_SPEEDOMETER
const speedometer = await hub.waitForDeviceByType(speedometerType)

speedometer.on('speed', ({ speed }) => {
  console.log(speed)
})

hub.on('batteryLevel', data => {
  console.log(data.batteryLevel)
})
```

</div>

</template>

<template #3>

<div class="atm-code-tabs__tabs">
  <span class="atm-code-tabs__tab">CONNECTION</span>
  <span class="atm-code-tabs__tab">SENSOR EVENTS</span>
  <span class="atm-code-tabs__tab atm-code-tabs__tab--active">ENGINE SETUP</span>
  <span class="atm-code-tabs__tab">LIGHTS</span>
</div>

<div class="atm-code-tabs__panel">
<div class="atm-sub">Find the motor and keep its power command alive</div>

```js {*}{lines:true}
import { Consts } from 'node-poweredup'

const motorType = Consts.DeviceType.DUPLO_TRAIN_BASE_MOTOR
const motor = await hub.waitForDeviceByType(motorType)

const driver = makeMotorDriver(motor) // keep-alive wrapper

driver.set(45)
driver.stop()
```

<div class="atm-note mt-3">
The driver re-sends non-zero power every 100 ms. The hub's motion watchdog stops one-off commands.
</div>

</div>

</template>

<template #4>

<div class="atm-code-tabs__tabs">
  <span class="atm-code-tabs__tab">CONNECTION</span>
  <span class="atm-code-tabs__tab">SENSOR EVENTS</span>
  <span class="atm-code-tabs__tab">ENGINE SETUP</span>
  <span class="atm-code-tabs__tab atm-code-tabs__tab--active">LIGHTS</span>
</div>

<div class="atm-code-tabs__panel">
<div class="atm-sub">Turn an RGB request into a color the train understands</div>

```js {*}{lines:true}
import { Consts } from 'node-poweredup'

const ledType = Consts.DeviceType.HUB_LED
const led = await hub.waitForDeviceByType(ledType)

const requestedRgb = '#ff2a00'
const paletteColor = nearestLegoColor(requestedRgb)

await led.setColor(paletteColor)
```

<div class="atm-note mt-3">
The LED accepts 10 color values. RGB maps to the nearest match.
</div>

</div>

</template>

</v-switch>

</div>

<!--
- provides a high-level API over BLE
- Event callbacks: `on('discover')`, `on('speed')`, `on('batteryLevel')`
- The motor watchdog needs repeated commands
- The LED uses a 10-color palette
- gives us some Consts with magic numbers from LWP3 under the hood

- Next: Let's se what I managed to build
-->

---
layout: atm-split
surface: dark
bg: bokeh
panel: soft
ratio: 0.95fr 1.15fr
dense: true
deco: none
---

# Mission Control

<div class="grid gap-5 mt-5 atm-result-grid" style="grid-template-columns: 1.25fr 0.75fr">

<div>

<div class="atm-kicker">App capabilities</div>

<ul class="mt-2">
  <li>20% higher top speed</li>
  <li>Adjustable speed</li>
  <li>10 light colors</li>
  <li>5 sounds</li>
  <li>7 beeps</li>
</ul>

</div>

<div>

<div class="atm-kicker">Sensors</div>

<ul class="mt-2">
  <li>Speedometer</li>
  <li>Battery level</li>
</ul>

</div>

</div>

::right::

<div class="mt-0 flex justify-center">

<div style="width: 624px; height: 600px; flex: none; transform: translate(30px, -96px)">
  <Shot src="/shots/poweredup-app.png" plain class="atm-shot--transition" />
</div>

</div>

<!--
- This is the result
- straightforward Architecture 
(react web app + Node.js server)
- WebSockets
- Live battery and speed updates
- Everything runs on one machine

And one week ao I thought that I have enough.
But... I'm a gamer, I have gamepad on my desk

would be nice to control train
-->

---
layout: atm-split
surface: dark
bg: bokeh
panel: soft
ratio: 0.95fr 1.15fr
dense: true
deco: none
---

# GAMEPAD SUPPORT

- Gamepad pairs directly with the host computer
- Works in Safari, but not in Chrome on this setup
- Uses the browser's Gamepad API

::right::

<div class="flex justify-center" style="transform: translate(30px, -96px)">

<GamepadDemo />

</div>

<!--
- Gamepad pairs with the laptop, not the train
- For the web app, another input source, like a mouse or keyboard
- Game-inspired wheels for colors and sounds
-->

---
layout: atm-dark
deco: corner
dense: true
top: 56
clicks: 2
---

# The Fast and the Curious

<div v-click="1" class="mt-4 flex justify-center" style="transform: translateY(-50px);">

<ClickToPlayVideo
  :play-at="2"
  controls
  playsinline
  preload="metadata"
  style="display: block; width: 92%; height: auto; object-fit: contain; background: #101820; border: 1px solid rgba(255, 255, 255, 0.28);"
>
  <source src="/videos/drag-race.mp4" type="video/mp4" />
  <p>
    This browser cannot play the demo. Open
    <a href="/videos/drag-race.mp4">the MP4 file</a> directly.
  </p>
</ClickToPlayVideo>

</div>

<!--
- Have you ever seen LEGO DUPLO trains drag race here at ATM? Me neither.
- Let’s watch.

- The black-roofed train is controlled by my app.
- The yellow-roofed one gets a regular push, the way kids usually play with it.

- Full power makes a difference.
- Here’s the whole setup in action.
-->

---
layout: atm-dark
deco: corner
dense: true
top: 56
clicks: 1
---

# A dashboard nobody asked for

<div class="mt-4 flex justify-center" style="transform: translateY(-50px);">

<ClickToPlayVideo
  :play-at="1"
  controls
  playsinline
  preload="metadata"
  style="display: block; width: 92%; height: auto; object-fit: contain; background: #101820; border: 1px solid rgba(255, 255, 255, 0.28);"
>
  <source src="/videos/demo.mp4" type="video/mp4" />
  <p>
    This browser cannot play the demo. Open
    <a href="/videos/demo.mp4">the MP4 file</a> directly.
  </p>
</ClickToPlayVideo>

</div>

<!--
- Here’s the whole setup in action.
- I'm pairing a gamepad first
- Turning the train ON
-->

---
layout: atm-end
---

# Thank you!

<div class="atm-lead">Don’t hesitate to explore.</div>

<div class="atm-links" style="margin-top: 4rem;">
  <div>
    <span>Project</span>
    <a href="https://github.com/iskrzycki/duplo-train" target="_blank" rel="noreferrer">
      github.com/iskrzycki/duplo-train
    </a>
  </div>
  <div>
    <span>Library</span>
    <a href="https://github.com/nathankellenicki/node-poweredup" target="_blank" rel="noreferrer">
      github.com/nathankellenicki/node-poweredup
    </a>
  </div>
  <div>
    <span>Protocol</span>
    <a href="https://lego.github.io/lego-ble-wireless-protocol-docs/" target="_blank" rel="noreferrer">
      LEGO BLE Wireless Protocol Docs
    </a>
  </div>
  <div>
    <span>This deck</span>
    <a href="https://duplo-train.pages.dev/" target="_blank" rel="noreferrer">
      duplo-train.pages.dev · live
    </a>
  </div>
</div>

<a class="atm-survey" href="https://forms.gle/mf5XBh5PYa8j8hf28" target="_blank" rel="noreferrer" aria-label="Open the 1 minute survey">
  <span class="atm-survey__label">1 minute survey</span>
  <img src="/qr-survey.svg" alt="QR code for the 1 minute survey" />
</a>

<!--
- And that's it.
- Curiosity and a few tools are enough to get started
- The links to the project, the library, and the protocol are here
- Please scan the QR code and fill in the one-minute survey
- Thank you
-->
