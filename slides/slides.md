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
Opening, ~45 seconds

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
The train, 35 seconds.

Everything started with a Christmas present: a LEGO DUPLO steam train for my son.

He was still a little too young to play with it on his own, so naturally, I had to test it for him.

Out of the box, it was very simple. Turn it on, give it a gentle push, and the colored tiles on the track trigger different actions.

Then I noticed that it also worked with an app.
So I installed it to see what else the train could do.
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
The app, 40 seconds.

The official app keeps things simple.

You can move the train forward or backward, stop it, play a few sounds, and change the light.

That makes perfect sense for a children's toy.
But every tap on this screen must become some kind of message sent to the train.

So my next question was simple: what does the app actually send?
-->

---
layout: atm-light
deco: squares
dense: true
---

# Bluetooth vs BLE

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
Bluetooth versus BLE, 45 seconds.

Before looking for that message, one distinction matters.

Bluetooth is one brand name covering two quite different protocol stacks.

Bluetooth Classic works well when data needs to flow continuously, like audio.
Bluetooth Low Energy is designed for short exchanges and can sleep between them, which makes it a good fit for sensors, trackers, and toys.

The train uses Bluetooth Low Energy, or BLE.
-->

---
layout: atm-section
---

# Seeing the invisible

<div class="atm-lead">What it takes to listen to BLE packets</div>

<!--
The transition, 15 seconds.

Knowing that messages exist is one thing.
Seeing them is another.

I needed one tool to capture the packets and another to inspect them.
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
The tools, 55 seconds.

The setup was surprisingly small.

First, the hardware: an nRF52840 USB dongle.
I flashed it with Nordic's BLE sniffer firmware, which lets it capture packets over the air.

The dongle does not connect to the train. It only listens.
But once the connection starts, BLE hops between radio channels.
The sniffer must catch the initial connection request to know what to follow.

Then, the software: Wireshark.
It lets me record the traffic and inspect each packet layer by layer.

The dongle listens.
Wireshark helps me make sense of what it hears.
-->

---
layout: atm-section
---

# Sniffing the official app

<div class="atm-lead">From a button press to the packets behind it</div>

<!--
Transition, 10 seconds.

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

<BleConnectionDiagram />

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

  <div v-click="[3, 4]" class="connection-screenshot__state">
    <Shot
      src="/shots/wireshark/GATT_ENGINE.png"
      label="Wireshark frame 3619 — motor command"
      ratio="16/7"
      />
  </div>

  <div v-click="4" class="connection-screenshot__state">
    <Shot
      src="/shots/wireshark/GATT_BATTERY.png"
      label="Wireshark frame 3821 — notification"
      ratio="16/7"
      />
  </div>
</div>

<!--
BLE connection sequence, ~2 minutes.

This is a simplified view of the exchange.

First, the train sends advertisements.
In effect, it is announcing: "I'm here, and I'm available."

The advertisement already contains useful clues: the name "Train Base", LEGO's manufacturer ID, and the LEGO service UUID.
The app can recognize the train before it connects.

When the phone decides to connect, it sends CONNECT_IND.
This packet establishes the radio link and provides the parameters the two devices will use for the connection.
It is not the same as pairing, and this particular capture was not encrypted.

Once the link is ready, the app writes to the train's GATT characteristic.
Here, one tap in the app becomes a short command telling the motor what to do.

The GATT value contains LEGO's own protocol, called LWP3.
On the next slide, we'll open this write and see that the motor command is only eight bytes long.

The traffic also goes the other way.
The train can send notifications back, for example with its battery level.

In this capture, the battery notification contained the value 0x54, which represents 84 percent.

There are many setup packets in between, but these four moments are enough to understand the exchange.
-->

---
layout: atm-dark
bg: soft
panel: true
dense: true
deco: none
---

# One click, one GATT write

<div class="grid grid-cols-2 gap-5 mt-0">

<Shot
  src="/shots/wireshark/GATT_ENGINE.png"
  label="Wireshark frame 3619 — ATT Write expanded"
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

<div v-click class="mt-2">

<h3 style="margin-bottom: 8px;">Decoded value</h3>

<PacketBytes
  :bytes="[['08','length'],['00','hub'],['81','message'],['00','motor'],['11','flags'],['51','write direct'],['00','power'],['45','+69']]"
  :hot="[7]"
  />

</div>

<!--
The motor write, about 2 minutes.

Before we read the bytes, a small GATT glossary.

A service is a group of related data.
Think of it as a folder.

A characteristic is one named data point inside that service.
It has a value and rules that say whether we can read it, write to it, or receive notifications.

The long UUIDs are stable IDs for the service and characteristic.

Once the connection is set up, ATT uses a short local number instead of sending the full UUID in every packet.
That number is called a handle.
Here, handle 000B points to the LEGO characteristic.

For this train, one characteristic works as a data pipe.
The app writes commands to it, and the train sends notifications through it.

GATT gives us the pipe.
LWP3 defines the messages sent through it.

LWP3 means LEGO Wireless Protocol 3.
LEGO provides a full official document for it.

It explains message types, ports, flags, commands, and hub properties.
That means we can decode these bytes without guessing.

This is frame 3619, the write that made the train move.

The right side gives us the full path.
ATT says this is a Write Request.
Handle 000B selects the LEGO characteristic.
Inside it, LWP3 message 81 means Port Output Command.

The value is an eight-byte LWP3 message.

08 is the message length.
00 is the hub ID.
81 means Port Output Command.
The next 00 selects port zero, the built-in motor.
11 means: run the command now and send feedback.
51 means Write Direct Mode Data.
The next 00 selects motor power mode.

The final byte is 45 in hex, or 69 in decimal.
That means forward power 69.

A reverse command has the same structure.
Only the last byte changes to BB.

Read as a signed byte, BB means minus 69.
-->


---
layout: atm-dark
bg: soft
panel: true
dense: true
deco: none
---

# One notification, battery state

<div class="grid grid-cols-2 gap-5 mt-0">

<Shot
  src="/shots/wireshark/GATT_BATTERY.png"
  label="Wireshark frame 3821 — ATT notification"
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

<div v-click class="mt-2">

<h3 style="margin-bottom: 8px;">Decoded value</h3>

<PacketBytes
  :bytes="[['06','length'],['00','hub'],['01','hub properties'],['06','battery [%]'],['06','update'],['54','84%']]"
  :hot="[5]"
  />

</div>

<!--
The return path, about 80 seconds.

The same GATT characteristic also carries data from the train back to the app.

The right side follows the same structure as the previous slide.
ATT says this is a Handle Value Notification, with code 1B.
The handle is again 000B, so this is the same LEGO characteristic.
Inside it, LWP3 message 01 means Hub Properties.

Inside the notification is a six-byte LWP3 message.

06 is the message length.
00 is the hub ID.
01 means Hub Properties.
The next 06 selects battery level.
The following 06 means update.
The final byte is 54 in hex, or 84 in decimal.

Earlier, the app wrote 01 00 to a small setting called the CCCD.
That turns notifications on.

Commands and state use the same GATT characteristic, but travel in opposite directions.
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
The question, about 20 seconds.

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
Code samples, 35 seconds total.


Lets take a look at some code samples.
Quite straightforward, right?

There are some limitations, eg 

ngine, this code sample will run engine for just about 200ms, because of safeguard implemented in the train base. If we want continous run, we need to resend these commands in a loop. That is also what the official app does.

Regarding lights, The lED diode on the front of the train
accepts a small palette, not arbitrary RGB.
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
The result, 75 seconds.

The final app exposes live battery and speedometer data, more sound controls,
more light controls and a browser UI. The recorded demo is the reliable backup
for the room. The custom driver reached twice the original top speed on my
track. Keep the claim tied to that test setup if someone asks for a benchmark.


I didn't manage to read color sensor data, not sure why.


TODO ogarnac
-->

---
layout: atm-split
surface: light
deco: hand
ratio: 0.9fr 1.2fr
---

# Bonus: 8BitDo gamepad

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
Bonus, 35 seconds.

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
Demo, 30 seconds.

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

<div class="mt-8 flex flex-col gap-3" style="font-size: 24px;">
  <a href="https://github.com/iskrzycki/duplo-train" target="_blank" rel="noreferrer">
    github.com/iskrzycki/duplo-train
  </a>
  <a href="https://github.com/nathankellenicki/node-poweredup" target="_blank" rel="noreferrer">
    github.com/nathankellenicki/node-poweredup
  </a>
  <a href="https://lego.github.io/lego-ble-wireless-protocol-docs/" target="_blank" rel="noreferrer">
    LEGO BLE Wireless Protocol Docs
  </a>
</div>

<!--
Closing, 20 seconds.

Thank the audience, then leave the project and protocol links on screen for
photos. The final line is the invitation: once the protocol is visible, it is
worth exploring what else the device can do.
-->
