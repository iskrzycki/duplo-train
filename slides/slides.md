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
  provider: google

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

# How I hacked my son's<br>LEGO Duplo train

<div class="atm-lead">Talking to a Bluetooth Low Energy toy</div>

::foot::

Rafał Iskrzycki · Allegro Tech Meeting #19

<!--
Most gadgets feel like magic because we only see the result.
You press a button and something happens, while the interesting part stays invisible.

This train made me curious. What happens between pressing the button and seeing it move?
So I decided to find out.

I'm Rafał, a software engineer at Allegro.
-->

---
layout: atm-photo
photo: /shots/Duplo-Steam-Train-by-Lego-transparent.png
---

<!--
Everything started with a Christmas present: a LEGO DUPLO steam train for my son.

He was still a little too young to play with it on his own, so naturally, I had to test it for him.

Out of the box, it was very simple. Turn it on, give it a gentle push, and the colored tiles on the track trigger different actions.

A few days later, I noticed the words “FREE OPTIONAL APP” in the bottom-left corner.
That made me curious, so I installed the app to see what else the train could do.
-->

---
layout: atm-split
surface: light
deco: hand
ratio: 0.92fr 1.35fr
dense: true
---

# What the official app does

::right::

<div class="mt-[24px]">

<Shot
  src="/shots/duplo-app.png"
  label="Screenshot — official LEGO DUPLO app"
  caption="The official app exposes a deliberately small control surface."
  ratio="2556/1179"
  />

</div>

<!--
The official app keeps things simple.

You can move the train forward or backward, stop it, play a few sounds, and change the light.

That makes perfect sense for a children's toy.
The app looked simple, but every tap had to send a message to the train.
I wanted to find out what the app was actually sending.
-->

---
layout: atm-light
deco: squares
dense: true
---

# Bluetooth Classic vs. Bluetooth Low Energy

<div class="atm-sub">Two protocol stacks under one brand name</div>

<div class="grid grid-cols-2 gap-5 mt-6">

<PanelCard v-click title="Bluetooth Classic">

- Continuous streams
- Higher power use
- Audio and serial links

</PanelCard>

<PanelCard v-click accent title="Bluetooth Low Energy">

- Short attribute messages
- Sleeps between events
- Sensors, trackers and toys

</PanelCard>

</div>

<!--
Before looking for that message, one distinction matters.

Bluetooth is one brand name covering two quite different protocol stacks.

Bluetooth Classic works well when a device needs a steady connection, for example with headphones or game controllers.
Bluetooth Low Energy is designed for short exchanges and can sleep between them, which makes it a good fit for sensors, trackers, and toys.

The train uses Bluetooth Low Energy — BLE for short.
-->

---
layout: atm-section
---

# Seeing the invisible

<div class="atm-lead">What it takes to listen to BLE packets</div>

<!--
Knowing that messages exist is one thing.
Seeing them is another.

To see what was happening between the app and the train, I needed the right tools.
-->


---
layout: atm-split
surface: light
ratio: 0.82fr 1.35fr
dense: true
deco: none
clicks: 2
---

<div class="atm-reveal-stack">
  <div v-click.hide="1" class="atm-reveal-card atm-reveal-placeholder">
    <div class="atm-reveal-placeholder__question">?</div>
    <h2>Hardware</h2>
  </div>

  <div v-click="1" class="atm-reveal-card atm-reveal-content">
    <h2>nRF52840 dongle</h2>
    <div class="mt-5 flex items-start justify-center">
      <div style="width: 140px">
        <Shot src="/shots/nrf52840.png" plain />
      </div>
    </div>
  </div>
</div>

::right::

<div class="atm-reveal-stack">
  <div v-click.hide="2" class="atm-reveal-card atm-reveal-placeholder">
    <div class="atm-reveal-placeholder__question">?</div>
    <h2>Software</h2>
  </div>

  <div v-click="2" class="atm-reveal-card atm-reveal-content">
    <h2>Wireshark</h2>
    <div class="mt-5 flex justify-center">
      <div style="width: 580px">
        <Shot
          src="/shots/wireshark-gui.png"
          label="Screenshot — Wireshark GUI"
          ratio="16/9"
          plain
          />
      </div>
    </div>
  </div>
</div>

<!--
The setup was really small.

First, the hardware: this small USB dongle. Its full name is at the top.
I flashed it with Nordic's BLE sniffer firmware, which lets it capture packets over the air.

The dongle does not connect to the train. It only listens.
During a BLE connection, the train and the phone switch between radio channels. In simple terms, they keep changing frequency to reduce interference from Wi-Fi and other devices.
The sniffer needs to catch the first connection request so it can follow the conversation.

Then, the software: Wireshark.
It lets me record the traffic and inspect each packet layer by layer.

So, the dongle listens, and Wireshark helps me make sense of what it hears.
-->

---
layout: atm-section
---

# Sniffing the official app

<div class="atm-lead">From a button press to the packets behind it</div>

<!--
Now I could press a button in the official app and watch what happened over the air.

Let's follow one interaction from discovering the train to the command that moves it.
-->

---
layout: atm-light
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
      src="/shots/wireshark/ADV_IND.png"
      label="Wireshark frame 3230 — ADV_IND"
      ratio="16/7"
      plain
      />
  </div>

  <div v-click="[2, 3]" class="connection-screenshot__state">
    <Shot
      src="/shots/wireshark/CONNECT_IND.png"
      label="Wireshark frame 3255 — CONNECT_IND"
      hint="capture frame 3255 · add screenshot here"
      ratio="16/7"
      plain
      />
  </div>

  <div v-click="3" class="connection-screenshot__state">
    <Shot
      src="/shots/wireshark/GATT_ENGINE.png"
      label="Wireshark frame 3619 — motor command"
      ratio="16/7"
      />
  </div>
</div>

<!--
This is a simplified view of the exchange.

First, the train sends advertisements.
They tell the app that a LEGO DUPLO Train Base is nearby, even before it connects.
The scan response adds the readable name "Train Base".

When the phone decides to connect, it sends CONNECT_IND.
This starts the radio link and sets the connection parameters.

Once the link is ready, the app can send commands to the train.
One tap in the app becomes a motor command.

The command uses LEGO Wireless Protocol 3, or LWP3.
On the next slide, we'll look at it more closely.

The traffic also goes the other way.
The train can send notifications back, for example with its battery level.

There are many setup packets in between, but these four moments are enough to understand the exchange.
-->

---
layout: atm-dark
bg: soft
panel: true
dense: true
deco: none
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
  src="/shots/wireshark/GATT_ENGINE.png"
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
  src="/shots/wireshark/GATT_BATTERY.png"
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
The fields on the right make the packet easier to read.

Most of them are self-explanatory.
The only new one is the characteristic handle.

Think of it as a short local address from the train's GATT table.
The train assigns it before the connection.
Here it is 000B, but another device can use a different address.

The first tab is a command from the app to the train.
We do not need to read every byte.
The highlighted 00 selects port zero, the built-in motor.
The highlighted 45 sets forward power to 69.

The second tab is a battery update from the train.
Again, we only need the highlighted bytes.
06 means battery level, and 54 is the value: 84 percent.

Both tabs use handle 000B, but the data goes in different directions.
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
At this point I asked: can I build my own app?

I had never written Bluetooth code before, so I looked for a library.

I found node-poweredup.
It handles Bluetooth and the LEGO protocol and gives me a simple JavaScript API.

Let's look at the code.
-->


---
layout: atm-light
deco: chip
dense: true
clicks: 4
clicksStart: 1
---

# Code samples

<div class="atm-code-tabs">

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

```js
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

```js
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

```js
const motor = await hub
  .waitForDeviceByType(MOTOR)

const driver = makeMotorDriver(motor)

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

```js
const led = await hub
  .waitForDeviceByType(HUB_LED)

const requestedRgb = '#ff2a00'
const paletteColor = nearestLegoColor(requestedRgb)

await led.setColor(paletteColor)
```

<div class="atm-note mt-3">
The DUPLO LED accepts 10 color values plus off, not arbitrary RGB. The app maps the requested color to the closest of the 10 colors.
</div>

<div class="atm-caption mt-2">
  Palette reference:
  <a href="https://lego.github.io/lego-ble-wireless-protocol-docs/#output-sub-command-setrgbcolorno-colorno-n-a" target="_blank" rel="noreferrer">
    LEGO BLE protocol docs · SetRgbColorNo
  </a>
</div>

</div>

</template>

</v-switch>

</div>

<!--
This code uses a high-level API over Bluetooth Low Energy.
The syntax feels familiar to JavaScript developers, so it is easy to get started.

The library hides low-level BLE details such as device discovery, connection handling, and characteristic access.
Instead of working directly with the Bluetooth protocol, we use simple methods, objects, and events.
This lets us focus on the application logic.

There are still a few train-specific details.
The motor stops after about 200 milliseconds unless we send the power command again. The official app does the same.

The front LED accepts a small palette of ten colors. RGB not supported.
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

# The result

<div class="atm-sub">A custom web app, with the train still using BLE</div>

<div class="grid grid-cols-2 gap-5 mt-5 atm-result-grid">

<div>

<div class="atm-kicker">Features</div>

<ul class="mt-2">
  <li>Battery level</li>
  <li>More sounds: tones and melodies</li>
  <li>More lights: palette and effects</li>
</ul>

</div>

<div>

<div class="atm-kicker">Sensors</div>

<ul class="mt-2">
  <li>Speedometer</li>
  <li>Battery level</li>
</ul>

<div class="atm-note mt-5">Measured top speed: 2× the original train.</div>

</div>

</div>

::right::

<div class="mt-0 flex justify-center">

<div style="width: 520px">
  <Shot src="/shots/poweredup-app.png" caption="Screenshot — final web app" plain />
</div>

</div>

<!--
This is the result: a small React web app with train controls and live data.

The React app talks to a Node.js server over WebSocket.
The server handles the Bluetooth connection. It sends commands to the train and forwards live updates, such as battery level and speed, back to the web app.

For this demo, the browser, server, and Bluetooth adapter all run on the same machine.
-->

---
layout: atm-split
surface: light
deco: hand
ratio: 0.9fr 1.2fr
---

# BONUS: GAMEPAD.

<div class="atm-sub">A different controller for the same BLE commands</div>

<v-clicks>

- Browser Gamepad API
- WebSocket to the Node server
- The train still receives LWP3 writes

</v-clicks>

::right::

<div class="mt-[130px]">

<Shot label="Clip — gamepad steering" hint="public/shots/gamepad.mp4" ratio="16/9" />

</div>

<!--
The controller does not change the BLE protocol. The browser reads the 8BitDo
gamepad, sends a small WebSocket command to the Node server, and the server
writes the same GATT characteristic. That is the practical payoff: once the
protocol is understood, the phone is no longer special.
-->


---
layout: atm-light
deco: corner
dense: true
---

# DEMO

<div class="atm-sub">Train in motion — first capture</div>

<div class="mt-4 flex justify-center">

<SlidevVideo
  controls
  autoreset="slide"
  playsinline
  preload="metadata"
  style="display: block; width: 78%; height: 335px; object-fit: contain; background: #101820; border: 1px solid rgba(0, 0, 0, 0.18);"
>
  <source src="/videos/IMG_6800.mp4" type="video/mp4" />
  <source src="/videos/IMG_6800.MOV" type="video/quicktime" />
  <p>
    This browser cannot play the demo. Open
    <a href="/videos/IMG_6800.mp4">the MP4 file</a> directly.
  </p>
</SlidevVideo>

</div>

<div class="atm-caption mt-2 text-center">iPhone test recording · 4.7 s</div>

<!--
This is the short test recording from the iPhone. Start it manually with the
built-in controls. The slide uses the H.264 MP4 copy first, with the original
MOV as a fallback. The video resets when leaving the slide so the demo starts
from the beginning each time.

Implementation references: https://sli.dev/builtin/components.html and
https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs
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
</div>

<!--
Thank the audience, then leave the project and protocol links on screen for
photos. The final line is the invitation: once the protocol is visible, it is
worth exploring what else the device can do.
-->
