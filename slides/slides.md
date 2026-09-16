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
Opening, ~1min






Bluetooth surrounds us, so let's get familiar with it, with the help of this little thing (Lego train).

Why on Earth am I telling you about this? Because it's everywhere. (BT stats live ?) - show some numbers?




[or maybe this one]: 

Today we will try to see the thing that is invisible. The thing that everyone uses on a daily basis, but most of our time we don't think how and why it works.



I'm Rafał and I've been working as a software engineer in Allegro for the past five years, mainly on MBox related stuff. 

_____




You may recognise the situation when you get a new device and are just thinking, „How the hell does this work?"

I went back to the box to see if I missed something and noticed there’s an app so, I downloaded it.
-->

---
layout: atm-photo
photo: /shots/Duplo-Steam-Train-by-Lego-transparent.png
---

<!--
The box, 35 seconds.

Everything started last christmas, when my son got a very nice gift - a steam train Duplo set. He was a way too young to play with it so as a good father, I had to support him.

The train works "out of the box" - you just need to turn the train ON, and push it gently - it will run with fixed speed and will react to colorful tiles that you can place on the tracks


But after a few days I realized, that the train has a second mode which requires an official app (as you may noticed at the bottom of the box). I decided to install the app and check what else the train can do.
-->

---
layout: atm-split
surface: light
deco: hand
ratio: 0.92fr 1.35fr
dense: true
---

# What the official app does

<div class="atm-sub">A small UI over a BLE connection</div>

<v-clicks>

- Forward, backward and stop at fixed speed presets
- Toggle through five light colours
- Toggle through five built-in sounds

</v-clicks>

::right::

<div class="mt-[128px]">

<Shot
  src="/shots/duplo-app.png"
  label="Screenshot — official LEGO DUPLO app"
  caption="The official app exposes a deliberately small control surface."
  ratio="2556/1179"
  />

</div>

<!--
The app, 50 seconds.

The app has a lovely animation upon startup, but then, it offers just a few videos and the control pane for our train. The control UI looks like this and it's very limited:
if offers going forward and backward, stopping the engine,
plays 5 sounds and has 5 light colors in a toggle mode. So you cannot even choose the one that you want.

It's reasonable - the app was made for kids, so it has to be as simple as possible.

But, this screen has proved something important for me - there are some commands going over the air between app and the train.

This leads us to the Bluetooth technology.
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
Bluetooth versus BLE, 55 seconds.


Regards Bluetooth, we need to clarify one thing. Bluetooth technology splits into two, very different protocols.

Classic Bluetooth is built for an open stream such as audio. It's like a virtual wire. Examples: headphones, keyboards, game pads etc. 

on the other hand, BLE is built for small, occasional messages and exposes data through GATT which means...... generit attributes. Examples: smartbands, toys, sensors.

Both use 2.4 GHz frequency, but they are using it differently [?] ....
-->

---
layout: atm-section
---

# Seeing the invisible

<div class="atm-lead">What it takes to listen to BLE packets</div>

<!--
The transition, 25 seconds.

The connection is invisible in the app, but it is happening over the air.
To understand what the train and the phone exchange, we need a way to listen
before we can interpret the packets. First comes the sniffer, then the tool
that turns the radio traffic into something readable.
-->


---
layout: atm-split
surface: dark
bg: soft
panel: soft
ratio: 0.9fr 1.2fr
deco: none
---

# The nRF52840 dongle

<div class="atm-sub">A practical over-the-air BLE sniffer</div>

<v-clicks>

- Clear documentation and open tooling
- Firmware, Wireshark plugins and community tooling
- Affordable: around $20, depending on the seller
- For this demo: BLE only. The nRF52840 also supports 802.15.4-based protocols

</v-clicks>

::right::

<div class="mt-[18px] flex justify-center">

<div style="width: 120px">
  <Shot src="/shots/nrf52840.png" plain />
</div>

</div>

<!--
The dongle, 50 seconds.

to be done
-->

---
layout: atm-split
surface: dark
bg: bokeh
panel: true
ratio: 0.82fr 1.35fr
dense: true
deco: none
---

# Wireshark

<div class="atm-sub">An open-source microscope for network traffic</div>

<div class="mt-5">

<v-clicks>

- Free to use and open source under the GPL
- Industry-standard, cross-platform analyzer
- Capture live traffic or open saved captures
- Decode and filter protocols down to individual fields

</v-clicks>

</div>

::right::

<div class="mt-[-20px] -mx-8">

<Shot
  src="/shots/wireshark-gui.png"
  label="Screenshot — Wireshark GUI"
  caption="Wireshark shows the packet list, decoded fields and raw bytes together."
  ratio="16/9"
  />

</div>

<!--
Wireshark, 50 seconds.

Wireshark is free, open-source software released under the GNU GPL. It is a
widely used, cross-platform network protocol analyzer: it can capture live
traffic, open saved captures, decode hundreds of protocols, and filter packets
down to individual fields. The official documentation describes it as useful
for troubleshooting, security analysis, QA, protocol development, and learning.

In our case, start the capture, select the train, then open the official app.
Filter on btatt and look for ATT Write Commands to the LEGO hub characteristic.
The next slide decodes one of those writes.

Sources:
https://www.wireshark.org/about
https://www.wireshark.org/docs/wsug_html_chunked/ChapterIntroduction.html
-->

---
layout: atm-section
---

# Sniffing the official app

<div class="atm-lead">From a button press to the packets behind it</div>

<!--
Transition, 15 seconds.

Now that we have the tool, we can watch the official app talk to the train.
We will press one control, find the resulting BLE packet, and then open it
byte by byte.
-->

---
layout: atm-dark
bg: soft
panel: true
dense: true
deco: none
---

# ADV_IND frame

<div class="atm-sub">The train announces itself before the connection starts</div>

<div class="mt-5">
  <AnnotatedScreenshot
    src="/shots/wireshark/ADV_IND.png"
    alt="Wireshark ADV_IND frame with three highlighted fields"
    mode="accumulate"
    :annotations="[
      {
        label: '1 · ADV_IND',
        rect: [2.5, 25.3, 95, 8.1],
        title: '1. Packet header',
        value: 'ADV_IND',
        description: 'oznacza reklamę BLE: pociąg nadaje ją i może przyjąć połączenie.',
      },
      {
        label: '2 · Address',
        rect: [2.5, 31.8, 95, 8.1],
        title: '2. Advertising address',
        value: 'ec:9a:34:ac:d1:84',
        description: 'to adres nadajnika, który wysłał tę reklamę.',
      },
      {
        label: '3 · LEGO data',
        rect: [6, 58.7, 90.5, 27.8],
        title: '3. Manufacturer data',
        value: '0x0397',
        description: 'to identyfikator firmy LEGO. Następne bajty należą do danych producenta.',
      },
    ]"
  />
</div>

<!--
ADV_IND, 45 seconds.

This is an advertising packet on one of BLE's primary advertising channels.
Click 1: the PDU type tells us that the train is advertising and can accept a
connection. Click 2: the advertising address identifies the sender. Click 3:
the manufacturer data contains LEGO's company ID (0x0397) and vendor-specific
bytes that help recognise the train before CONNECT_IND appears.
-->


---
layout: atm-light
deco: corner
dense: true
---

# BLE connection sequence

<BleConnectionDiagram />

<div v-click="5" class="atm-note mt-5">
Miss <code>CONNECT_IND</code> and the sniffer cannot follow the connection that comes after it.
</div>

<!--
How a BLE connection starts, 60 seconds.

01. Advertisement. The train is the peripheral. It periodically broadcasts an
advertisement on the three primary advertising channels. A phone or script
scans and recognises the train from its name and manufacturer data.

02. CONNECT_IND. When the central decides to connect, it sends CONNECT_IND
exactly once. This packet carries the Access Address plus the timing and
channel-hopping parameters.

03. Data channels. After the handshake, both controllers leave the advertising
channels and meet on the data channels according to the shared hopping
sequence.

04. GATT / ATT. Only now does the application-level traffic begin: service
discovery, writes to the LEGO characteristic, and notifications back from the
sensors. The service UUID ending in 1623 is LEGO's logical GATT service. The
characteristic UUID ending in 1624 is the actual data pipe inside that service,
with Write and Notify properties. It carries LWP3 commands and sensor data. The
UUIDs identify GATT objects, not RF channels.

This is why the sniffer must be running before the app starts, and why forcing a
reconnect helps when CONNECT_IND was missed.
-->


---
layout: atm-light
deco: squares
dense: true
---

# Pairing and security

<div class="grid grid-cols-2 gap-8 mt-7">

<div>

<h3>Pairing is optional</h3>

<v-clicks>

- Pairing agrees on keys
- Bonding stores the keys
- Encryption protects traffic

</v-clicks>

</div>

<div>

<h3>What BLE can choose</h3>

<v-clicks>

- Just Works: encrypted, no MITM protection
- No pairing: plaintext and no access control

</v-clicks>

</div>

</div>

<div v-click class="atm-note mt-7">
For this train, a central can connect and write without a pairing step.
</div>

<!--
Pairing and security, 60 seconds.

BLE does not require pairing. Pairing creates keys, bonding remembers them, and
encryption uses them on the link. Just Works encrypts but does not authenticate
the other side. With no pairing, ATT traffic is plaintext and the device has no
owner check. The train accepts a connection without a pairing exchange, which
explains why a custom client can control it immediately.
-->


---
layout: atm-dark
bg: soft
panel: true
dense: true
deco: none
---

# One click, one GATT write

<div class="grid grid-cols-2 gap-5 mt-4">

<Shot label="Screenshot — ATT Write expanded" hint="public/shots/wireshark-detail.png" ratio="16/9" />

<div class="atm-gatt-spec">

<h3>GATT specification</h3>

<div class="atm-caption">Service</div>
<code>00001623-1212-EFDE-1623-785FEABCD123</code>

<div class="atm-caption mt-3">Characteristic</div>
<code>00001624-1212-EFDE-1623-785FEABCD123</code>

<div class="atm-caption mt-3">Properties</div>
<strong>Write</strong> commands · <strong>Notify</strong> sensor data

</div>

</div>

<div v-click class="mt-5">

<PacketBytes
  :bytes="[['08','length'],['00','hub'],['81','message'],['00','motor'],['11','flags'],['51','write direct'],['00','power'],['64','+100']]"
  :hot="[7]"
  />

<div class="atm-caption mt-2">Only the last byte changes when the requested motor power changes.</div>

</div>

<!--
The first decoded write, 75 seconds.

This is the LEGO Wireless Protocol 3 frame inside the GATT write. The service
and characteristic are vendor-specific UUIDs. The characteristic is a single
pipe for commands and notifications. In this example 0x81 is Port Output
Command, 0x00 is the motor port, 0x51 writes direct mode data, and 0x64 is
signed power +100. Zero stops; a negative signed byte reverses the train.
-->


---
layout: atm-split
surface: light
deco: chip
ratio: 1fr 1.15fr
dense: true
---

# Sniffing the official app

<div class="atm-sub">The app uses the same GATT pipe</div>

<div class="grid grid-cols-2 gap-4 mt-5">

<Shot label="Screenshot — official app GATT capture" hint="public/shots/official-app-gatt.png" ratio="16/9" />
<Shot label="Screenshot — GATT detail" hint="public/shots/official-app-gatt-detail.png" ratio="16/9" />

</div>

<div class="atm-note mt-5">
<strong>Sample:</strong> App speed button / ATT Write / LWP3 <code>0x81</code> / motor port
</div>

::right::

<div class="mt-[156px]">

<h3>What the capture tells us</h3>

<ul class="mt-4">
  <li>The official app writes to characteristic <code>1624</code></li>
  <li>The payload carries the port and command mode</li>
  <li>Sensor values return as notifications</li>
</ul>

</div>

<!--
The official app capture, 65 seconds.

These screenshots are placeholders for the official-app GATT capture. The
thing to point out is the same characteristic and the same LWP3 payload shape.
The app is a thin client. It chooses a few safe commands, while the hub
already understands more ports, sensor modes, tones and LED values.
-->


---
layout: atm-statement
bg: bokeh
align: center
---

# Can I build my own app?

<v-click>

<div class="atm-lead"><strong>Yes.</strong> A BLE GATT client is enough.</div>

</v-click>

<!--
The question, 25 seconds.

The train does not require the LEGO app. Any central that can discover the
service, write the hub characteristic, and subscribe to notifications can be
the controller. The protocol work is now reduced to a normal BLE client.
-->


---
layout: atm-statement
bg: orb
align: center
---

# There is a JS library for that

<v-click>

<div class="atm-lead"><code>node-poweredup</code></div>

<div class="atm-sub mt-5">Scan · connect · ports · sensors · LWP3</div>

</v-click>

<!--
The library, 40 seconds.

node-poweredup wraps the BLE scan, hub connection, port discovery, device
objects and LWP3 frames. It gives us a clean API while Wireshark remains the
tool for understanding what the API sends. The library is by Nathan Kellenicki.
-->


---
layout: atm-light
deco: chip
dense: true
---

# Code samples

<div class="atm-code-intro">
  <div class="atm-lead">Three small pieces make the integration work</div>
  <div class="atm-sub mt-4">Connection, sensor events, and a motor driver</div>
</div>

<!--
Code samples, 10 seconds.

The next three slides show the small pieces that matter. The connection is
ordinary BLE discovery and GATT connection. The library emits sensor events from
notifications. The one non-obvious part is the motor driver:
the DUPLO base cuts a one-off power command after roughly 200 ms when it does
not detect wheel movement, so the code keeps refreshing non-zero power. That
is also what the official app does.
-->

---
layout: atm-light
deco: chip
dense: true
---

# Connection

<div class="atm-code-slide">

<div class="atm-sub">Discover a hub, connect, and start scanning</div>

```js
const poweredUP = new PoweredUP()

poweredUP.on('discover', async hub => {
  await hub.connect()
})

poweredUP.scan()
```

</div>

<!--
The library wraps the BLE scan and GATT connection. Once a hub is discovered,
the application connects and can start working with its ports and sensors.
-->

---
layout: atm-light
deco: chip
dense: true
---

# Sensor events

<div class="atm-code-slide">

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

<!--
The library turns BLE notifications into ordinary JavaScript events. The app
can listen for speedometer and battery changes without decoding packets itself.
-->

---
layout: atm-light
deco: chip
dense: true
---

# Engine setup

<div class="atm-code-slide">

<div class="atm-sub">Find the motor and keep its power command alive</div>

```js
const motor = await hub
  .waitForDeviceByType(MOTOR)

const driver = makeMotorDriver(motor)

driver.set(45)
driver.stop()
```

<div class="atm-note mt-6">
The driver re-sends non-zero power every 100 ms. The hub's motion watchdog stops one-off commands.
</div>

</div>

<!--
The DUPLO base cuts a one-off power command after roughly 200 ms when it does
not detect wheel movement. The driver keeps refreshing non-zero power, which is
also what the official app does.
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

<div class="mt-[104px] grid grid-cols-2 gap-4">

<Shot label="Screenshot — final web app" hint="public/shots/panel.png" ratio="16/9" />
<Shot label="Video — train in motion" hint="public/shots/demo.mp4" ratio="16/9" />

</div>

<!--
The result, 75 seconds.

The final app exposes live battery and speedometer data, more sound controls,
more light controls and a browser UI. The recorded demo is the reliable backup
for the room. The custom driver reached twice the original top speed on my
track. Keep the claim tied to that test setup if someone asks for a benchmark.
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
