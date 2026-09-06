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
Opening (~1 min):

- One line about me, no CV. Then the hook: "this set ships with an official app.
  I skipped the app and talked to the train directly."
- Set expectations out loud: this is a lightning talk and a work in progress.
  There is a working proof of concept (motor, lights, sounds, sensors) and a
  pile of things I still haven't cracked.
- Say why the room should care: it is not really a talk about LEGO. A toy is
  just the friendliest possible target for learning how BLE works, how to sniff
  it, and how little protects the devices around us.
- Timing cue: if I am past 2 minutes here, cut the intro and move on.
-->


---
layout: atm-light
deco: squares
---

# Bluetooth vs BLE

<div class="atm-sub">Two different stacks, one brand name</div>

<div class="grid grid-cols-2 gap-5 mt-5">

<PanelCard v-click title="Classic (BR/EDR)">

- Streams
- Always talking
- Power hungry
- Headphones · car audio

</PanelCard>

<PanelCard v-click accent title="Low Energy (BLE)">

- Small packets
- Mostly asleep
- Coin cell for months
- Sensors · trackers · **toys**

</PanelCard>

</div>

<!--
BT vs BLE (~2 min). The single most important sentence: BLE is not "newer
Bluetooth", it is a second, incompatible stack that shares a brand and a radio
band.

Details worth saying:
- Classic (BR/EDR) arrived in 1999 and is built for continuous streams — audio,
  serial-cable emulation (RFCOMM/SPP). It keeps a link up and burns power doing it.
- BLE arrived with Bluetooth 4.0 in 2010, designed by Nokia as Wibree. It is
  built for tiny, sporadic messages: advertise, connect, exchange a few bytes,
  sleep. That is why a fitness tag runs a year on a coin cell.
- Both live in 2.4 GHz ISM. Classic hops across 79 × 1 MHz channels; BLE uses
  40 × 2 MHz — 3 advertising channels (37, 38, 39, deliberately spaced around
  Wi-Fi) and 37 data channels.
- They do not interoperate. A Classic-only stack cannot talk to a BLE peripheral,
  which is why old "Bluetooth" dongles see nothing. "Dual mode" chips implement both.
- Version numbers (4.2, 5.0, 5.3) are spec versions, not protocol names. 4.2
  brought LE Secure Connections; 5.x brought 2M PHY, long range, LE Audio.
- Examples to name if the room looks blank: headphones = Classic; Mi Band, Tile,
  heart-rate straps, smart bulbs, and every Powered UP LEGO hub = BLE.
- Landing point: the Duplo train is BLE. So everything from here on is BLE tooling
  — noble/bleak on the software side, an nRF dongle on the hardware side.
-->

---
layout: atm-light
deco: chip
dense: true
---

# GATT

<div class="atm-sub">A tree of values you read, write and subscribe to</div>

```txt
train  (peripheral = GATT server)
 └── service            LEGO Hub Service
      └── characteristic  Hub Characteristic
           ├── value        the bytes
           └── props        read · write · notify
```

<div class="grid grid-cols-3 gap-6 mt-5 text-[17px]">

<div v-click><strong>Write</strong><div class="atm-caption mt-1">we send commands</div></div>
 <!-- TODO WHAT ABOUT READ MODE? --> -->
<div v-click><strong>Notify</strong><div class="atm-caption mt-1">the train pushes data</div></div>


</div>

<!--
GATT (~2 min). This slide carries the rest of the talk: every single thing I do
to the train is a read, a write, or a notification on this tree.

Vocabulary:
- GATT is the "who holds the data" layer: the Server hosts characteristics, the
  Client reads and writes them.
- The counterintuitive bit, worth a pause: the tiny battery toy is the SERVER and
  the powerful laptop is the CLIENT. GAP role and GATT role are independent axes;
  people conflate them constantly. It makes sense once you see it as "the
  peripheral hosts data about itself, the central comes to fetch it."
- Service = a logical group of features. Characteristic = one "variable" with a
  value plus properties (read / write / write-without-response / notify / indicate).
  Descriptors hang off characteristics (e.g. the CCCD, which is literally the
  on/off switch you write to enable notifications).
- UUIDs: 16-bit shorts for SIG-standard stuff (0x180F battery service, 0x2A19
  battery level), 128-bit for vendor-specific. LEGO's Powered UP hubs expose
  service 00001623-1212-EFDE-1623-785FEABCD123 with a single characteristic
  ...1624... — one pipe, both directions.
- Advertising is unencrypted and public: before any connection, the train is
  already broadcasting its name and manufacturer-specific data (hub type, button
  state). Anyone in the room with a phone can see there is a LEGO train here.
  That is the bridge into the security slide.
-->

---
layout: atm-light
deco: squares
dense: true
---

# Security

<div class="atm-sub">Pairing, and what a toy actually uses</div>

<div class="grid grid-cols-2 gap-8 mt-7">

<div>

<h3>Pairing methods</h3>

<v-clicks>

- Just Works
- Passkey Entry
- Numeric Comparison
- Out Of Band

</v-clicks>

</div>


</div>


<!--
Security (~3 min). Open with the rhetorical question: "what level of security do
you think a children's toy uses?" — let them answer before the punchline.

The handshake, in order:
1. Advertising (public, plaintext) → CONNECT_IND → connection established.
2. Feature exchange: each side says what it can do — display? keyboard?
   out-of-band channel? That IO capability table is what picks the pairing method.
3. Key generation → optional bonding (keys stored on both sides so the next
   connection is instant and encrypted).
- Pairing = agree on keys for this session. Bonding = persist them. Encryption =
  actually using them on the link.

The four methods:
- Just Works: no user verification at all. Encrypted against a passive
  eavesdropper who arrives late, but NO man-in-the-middle protection.
- Passkey Entry: 6-digit PIN shown on one device, typed on the other.
- Numeric Comparison (4.2+): both screens show a number, the human confirms
  they match. This is what gives real MITM protection.
- Out Of Band: keys travel over another channel, e.g. NFC on a speaker or a
  car kit.


Why the toy is on the weak end:
- It has no display and no keyboard, so by spec it cannot do Passkey or Numeric
  Comparison. Just Works is the only option left.
- In practice the Powered UP hubs skip pairing and encryption altogether: the
  characteristic is open to whoever connects first. That saves battery, and it
  saves LEGO the support cost of a child failing to pair.
- Consequence: anyone in range can connect and drive the train. My PoC "just
  worked" because there was no handshake to defeat.
- The takeaway to plant here, and repeat at the end: security is a risk-based
  business decision. A keyboard encrypts because keystrokes are worth stealing.
  A train doesn't, because the worst case is a stranger honking at your kid.
-->

---
layout: atm-split
surface: dark
bg: soft
panel: soft
ratio: 1fr 1.05fr
deco: none
---

# How to listen

<div class="atm-sub">Hardware and software</div>

<v-clicks>

- **nRF52840 dongle** + nRF Sniffer firmware
- **Wireshark** + plugin

</v-clicks>

::right::

<div class="mt-[130px]">

<Shot label="Photo — nRF52840 dongle" hint="public/shots/dongle.jpg" ratio="16/10" />

</div>

<!--

notes: there are few possibilities of sniffing the bt device. We'll go with nRF52840 sniffer and wireshark
but there are better sniffers or possibilities to partial sniff even without real sniffing device.

// consider a story that mac has no classic usb and an additional dongle needed





Sniffing, hardware + software (~2.5 min).

The cheap path (no hardware):
- Android has Developer options → "Enable Bluetooth HCI snoop log". It records
  every HCI packet the phone's own controller sees into btsnoop_hci.log, which
  Wireshark opens directly. On newer Android you pull it with
  `adb bugreport` and dig it out of the zip.
- Linux: `btmon -w capture.btsnoop`, same idea. macOS has PacketLogger in
  Apple's Additional Tools for Xcode.
- Hard limit: HCI logging only sees traffic through THAT device's controller.
  Official app on a tablet → you must capture on the tablet. And you never see
  the pairing handshake as it happens on the air, only the host-side view.

The real thing (~10 EUR):
- nRF52840 Dongle flashed with Nordic's "nRF Sniffer for Bluetooth LE" firmware.
  It is a passive radio receiver, not a Bluetooth adapter.
- It plugs into Wireshark as an extcap plugin (a Python script Nordic ships),
  so the dongle shows up as a capture interface next to eth0.
- It follows one connection: it listens on the advertising channels, and when it
  sees the CONNECT_IND it copies the hop sequence and follows the connection
  across the 37 data channels. Miss the CONNECT_IND and you see nothing useful —
  so start the capture BEFORE the app connects.
- Because it captures the air, it sees the pairing handshake, which is what you
  feed to `crackle` for a Legacy-paired device. This is also how you prove
  "there is no pairing here at all".
- Strategy that matters more than the tooling: sniff the OFFICIAL app first.
  The app knows the undocumented commands; my own code only knows what I already
  understand.
-->

---
layout: atm-split
surface: light
deco: hand
ratio: 1fr 1.1fr
---

# Where it started


<div class="atm-sub">One box, one question</div>

<v-clicks>

- A gift for my son
- "App optional" on the box
- So what is the app *for*?
- What else does the chip do?

</v-clicks>

::right::

<div class="mt-[150px]">

<Shot label="Photo — the LEGO DUPLO box" hint="public/shots/lego-box.jpg" ratio="3/2" />

</div>

<!--
The story (~1.5 min). Personal, low-tech, gives the room a breather after the
crypto slide. Beats to hit — fill in the real details:

- The set: LEGO DUPLO Cargo/Steam Train (10874 / 10875). Bought as a present,
  not as a hacking target.
- It works completely standalone: push it, and it drives, honks and reacts to
  the coloured action tiles on the track. No phone needed, which is the right
  design for a two-year-old.
- The box also mentions an app. That is the itch: if the toy is complete without
  the app, what does the app add — and what is in the hardware that neither the
  toy nor the app exposes?
- Say the honest motivation: I wanted an excuse to learn BLE properly, and this
  was a target that could not sue me, could not be bricked remotely, and lived
  in my living room.
- Optional laugh line: my son is the actual product owner, and his acceptance
  criteria are "loud" and "fast".
-->

---
layout: atm-split
surface: dark
bg: soft
panel: soft
ratio: 1.05fr 1fr
deco: none
---

# Two modes

<div class="atm-sub">The same train, two very different toys</div>

<div class="grid grid-cols-1 gap-4 mt-4">

<PanelCard v-click title="Standalone">

Push it · colour tiles · built-in sounds

</PanelCard>

<PanelCard v-click accent title="Connected">

App holds the BLE link · commands + sensor data

</PanelCard>

</div>

<div v-click class="atm-caption mt-4">
One central at a time — whoever connects first owns the train.
</div>

::right::

<div class="mt-[150px]">

<Shot label="Screenshot — official Powered UP app" hint="public/shots/lego-app.png" ratio="4/3" />

</div>

<!--
Two modes (~2 min). Walk the chart left to right.

Standalone play:
- Press the button, the hub powers up and the train is autonomous. Push it and
  the wheels turn; the built-in colour sensor under the base reads the action
  tiles you clip onto the rails (fill up water, refuel, whistle, stop, lights).
- All of that logic lives in the hub firmware. No radio needed.

Connected play:
- The hub advertises the whole time it is on. The official Powered UP app scans,
  connects, and from then on drives the same hardware over BLE: motor power,
  the five built-in sounds, the hub LED colour, and it subscribes to the colour
  sensor and speedometer.
- Important mechanic: BLE peripherals accept ONE central connection at a time.
  While the app holds the link, my script cannot connect — and vice versa. During
  the demo I have to make sure the app on my phone is closed, or the train
  will simply not show up.
- Also worth saying: connecting does not disable standalone behaviour. The tiles
  still fire; you just now get to see the events and override them.
- This is the hinge of the talk: the app is a thin, safe wrapper over a
  characteristic that accepts far more than the app's UI offers.
-->

---
layout: atm-statement
bg: bokeh
---

# So where are we?

<v-clicks>

<div class="atm-lead">We know how <strong>BLE</strong> works</div>

<div class="atm-lead">We know how to <strong>sniff</strong> it</div>

<div class="atm-lead">We can guess what the <strong>app</strong> says to the toy</div>

</v-clicks>

<!--
Wrap-up checkpoint (~30 s). Deliberate pause: three claims, one click each,
then move straight into the captures.

- Say it as "everything so far was the setup; now we look at actual bytes."
- If I am running late, this is the slide to skip entirely — the next one
  carries the same message with evidence.
-->

---
layout: atm-dark
bg: soft
panel: true
dense: true
deco: none
---

# What the app sends

<div class="grid grid-cols-2 gap-5 mt-4">

<Shot label="Screenshot — Wireshark packet list" hint="public/shots/wireshark-list.png" ratio="16/9" />

<Shot label="Screenshot — ATT Write, expanded" hint="public/shots/wireshark-detail.png" ratio="16/9" />

</div>

<div class="mt-5">
  <PacketBytes
    :bytes="[['08','len'],['00','hub'],['81','cmd'],['00','port'],['11','flags'],['51','sub'],['00','mode'],['64','value']]"
    :hot="[7]"
  />
</div>

<!--
The captures (~2.5 min). Point at the list first, then the expanded frame, then
the byte row.

Reading the capture:
- Filter `btatt` and everything irrelevant disappears. What is left is mostly
  "Sent Write Command, Handle: 0x000e" — that handle IS the LEGO hub
  characteristic. Notifications come back on the same characteristic.
- The value field is a LEGO Wireless Protocol 3 message. The format is public
  (LEGO published LWP3 docs) and the gaps were filled in by the community.

The byte row, left to right — this is the slow, satisfying part:
- 08 — total length of the message, 8 bytes.
- 00 — hub id, always 0.
- 81 — message type 0x81 = Port Output Command.
- 00 — port id 0 = the motor. On the Duplo base: 0 motor, 17 LED, 18 speaker,
  18/19 the sensors.
- 11 — startup + completion flags: "execute immediately" + "tell me when done".
- 51 — sub-command WriteDirectModeData.
- 00 — mode 0 = power.
- 64 — the payload: 0x64 = 100 = full power. It is a SIGNED int8, so 0x9C = -100
  is full power backwards, and 0x00 is stop. One byte is the entire difference
  between a stopped train and a fast one.

Setup problems worth admitting (the room always has someone who hit these):
- Nordic's extcap plugin is a Python script: Wireshark has to find it in the
  right extcap directory, and it needs its own Python with pyserial. Wireshark 4.x
  moved that directory.
- The firmware version on the dongle and the plugin version must match; a
  mismatch shows up as an interface that appears but captures nothing.
- Permissions on the serial device (dialout group on Linux).
- On the Android side, the snoop log location differs per vendor and per
  Android version, and some builds silently record nothing.
- And the sequencing gotcha: start the sniffer, THEN open the app. Miss the
  connection request and the capture is a wall of unfollowable noise.
-->


---
layout: atm-statement
bg: bokeh
---

# There is js library for that

TODO: links ?




---
layout: atm-split
surface: light
deco: chip
ratio: 1fr 1.15fr
dense: true
---

# Talking back

<div class="atm-sub"><code>node-poweredup</code> · Node.js</div>

<v-clicks>

- Scan → connect → get devices
- No hand-rolled frames
- Every write hex-dumped

</v-clicks>

::right::

<div class="mt-[176px]">

```js
const hub = await poweredUP.scan('duplo')
const motor = await hub.waitForDeviceAtPort('A')

motor.setPower(50)   // 08 00 81 00 11 51 00 32
await hub.sleep(2000)
motor.brake()
```

</div>

<!--
The library (~2 min). Message: once you know the protocol, you do not have to
implement it — someone already did.

- `node-poweredup` (Nathan Kellenicki) wraps LWP3 for every Powered UP hub,
  including the Duplo Train Base. It sits on `noble` for BLE on the Node side;
  the Python equivalents are `bleak` + `pylgbst`, and Pybricks is the big
  community project in this space.
- What it gives you: hub discovery by type, device objects per port (motor,
  speaker, LED, colour sensor, speedometer), hub properties (firmware version,
  battery, MAC), and typed events instead of raw notifications.
- Show the correspondence explicitly: `setPower(50)` on the slide is exactly the
  frame we just decoded in Wireshark, with 0x32 in the value byte. That is the
  whole talk in one line — Wireshark on the left, one method call on the right.
- My repo adds a TX tap that hex-dumps every outgoing frame (log.js), so the
  console reads like the Wireshark capture while the train drives. Good thing to
  have on screen during the demo.
- One real-world detail worth telling, because it cost me an evening: the Duplo
  base has a motion watchdog. Send power once from standstill and it cuts the
  motor after ~200 ms if it doesn't sense the wheels turning. The official app
  works around it by re-sending the command continuously, so my driver re-sends
  power every 100 ms with the "execute immediately" flag (driver.js). Nothing in
  the docs says this; you find it by sniffing the app and noticing the repeats.
-->

---
layout: atm-light
deco: squares
---

# Why bother?

<div class="atm-sub">Direct BLE vs the official app</div>

<div class="grid grid-cols-2 gap-5 mt-5">

<PanelCard v-click title="The app">

- 5 preset sounds
- Fixed LED colours
- Phone in your hand
- Tiles do what LEGO decided

</PanelCard>

<PanelCard v-click accent title="Direct">

- Every tone id the firmware has
- Custom light effects
- Gamepad, web panel, scripts
- Sensor data → your own logic

</PanelCard>

</div>

<!--
Comparison (~2 min). This is the "so what" slide — the payoff for all the
protocol work.

Concrete things the app cannot do:
- Sounds: the app exposes five buttons. The speaker accepts a tone id, and the
  ids beyond the documented handful still make noise — some pitched, some
  glitchy, and I can sequence them into crude melodies with timed gaps. The
  pitches are a firmware lottery, which is half the fun.
- Light: the app offers the palette. Writing colour ids on a timer gives
  animated effects — police flash, level-crossing blink, rainbow, disco,
  firebox flicker. There is also an RGB mode that is not in the palette at all.
- Control surface: nothing about BLE says "phone". A laptop, a web panel over
  WebSocket, a gamepad, a cron job, a CI pipeline — anything that can write a
  characteristic can drive the train.
- Sensor data: the colour sensor and speedometer notify continuously. The app
  turns those into its own scripted reactions; subscribed directly, I can react
  however I like — a colour tile that triggers a melody, a speed threshold that
  cuts power, closed-loop speed control.
- Honest caveat: the ceiling is the firmware. I cannot add features the hub
  does not implement, and pushing the link too hard (LED spam while the motor
  keep-alive runs at 10 Hz) makes the base sluggish. Writes stay ≥180 ms apart.
-->

---
layout: atm-split
surface: dark
bg: bokeh
ratio: 1fr 1.15fr
deco: none
---

# Demo 🚂

<div class="atm-sub">Web panel · motor · lights · sounds</div>

<Note class="mt-6" quiet>
📼 Recorded — a conference room is very crowded 2.4 GHz.
</Note>

::right::

<div class="mt-[110px]">

<Shot label="Video / screenshot — the demo panel" hint="public/shots/demo.mp4 · panel.png" ratio="16/10" />

<!-- When the file is in place, swap the Shot above for:
<video controls src="/shots/demo.mp4" class="w-full" />
-->

</div>

<!--
Demo (~2 min). Play the recording; narrate over it.

- What is on screen: the browser panel talks WebSocket to a small Node server,
  the server holds the single BLE connection to the train and forwards commands.
  Left side of the screen is the panel, right side is the hex log of every frame
  going out.
- Narrate the mapping while it plays: slider → Port Output Command; effect
  button → a stream of LED writes on a timer; melody → a sequence of tone ids
  with gaps; the speed readout is a notification coming back from the hub's
  speedometer.
- Say why it is a recording: a full room of phones is the worst 2.4 GHz
  environment there is, and BLE will pick exactly this moment to sulk. If the
  live train is on the table and it connects, do it live and keep the video as
  the fallback.
- If the video is short, this is a good place to hold for the first question.
-->

---
layout: atm-light
deco: chip
dense: true
---

# Next 🔧

<div class="grid grid-cols-2 gap-8 mt-4">

<div v-click>
<h3>Gamepad steering</h3>
<div class="atm-caption mt-1 mb-3">browser Gamepad API → BLE</div>
<Shot label="Clip — gamepad" hint="public/shots/gamepad.mp4" ratio="16/9" />
</div>

<div v-click>
<h3>Sniffing a Mi Band</h3>
<div class="atm-caption mt-1 mb-3">same tooling, real security</div>
<Shot label="Screenshot — Mi Band capture" hint="public/shots/miband.png" ratio="16/9" />
</div>

</div>

<div v-click class="atm-foot">
Same dongle, same Wireshark, different toy.
</div>

<!--
Extras / next (~1 min). Both of these are ideas-in-progress; be upfront about
which one has a demo by the time I present.

Gamepad:
- The browser Gamepad API in the existing panel: left stick → motor power,
  triggers → brake, buttons → sounds and light effects. It is a small patch on
  the panel, and it makes the toy feel like a product instead of a script.
- If it is working, show the 20-second clip. If not, say it out loud as the
  next thing on the list.

Mi Band:
- The interesting contrast: the same nRF dongle and the same Wireshark, but a
  device that actually authenticates. Mi Bands use an auth handshake with a
  key you get when you first pair with the vendor app, so you see traffic but
  cannot just replay it.
- Point being made: the toolchain from this talk generalises. What changes from
  device to device is how much the vendor decided to care — which is exactly the
  closing thought.
- Legal/ethical note if anyone asks: my own devices, in my own flat, passive
  listening. Sniffing other people's links is not a hobby, it is a crime.
-->

---
layout: atm-end
---

# Thank you! 🚂

<div class="atm-lead">Questions?</div>

<div class="mt-7 text-[15px]" style="max-width: 52%">

<div class="atm-links mt-2">
  <div><span>Repo</span> github.com/iskrzycki/duplo-train — slides + code</div>
  <div><span>Sniffer</span> nRF Sniffer for Bluetooth LE · nordicsemi.com</div>
  <div><span>Library</span> github.com/nathankellenicki/node-poweredup</div>
  <div><span>Protocol</span> lego.github.io/lego-ble-wireless-protocol-docs</div>
</div>

</div>

<!--
Close (~30 s + questions).

- Leave this slide up for the whole Q&A; the links are the answer to half the
  questions people ask afterwards.
- Credit the community out loud: Nathan Kellenicki (node-poweredup), Pybricks,
  the BOOSTreveng reverse-engineering notes, and LEGO for publishing LWP3 at all.
- Restate the one takeaway: the BLE stack around you is more open than the apps
  pretend, and how much protection a device has is a business decision, not a
  technical limit.
- Questions I should be ready for: does it work with newer hubs (yes, same
  protocol, node-poweredup covers Boost/Technic/Duplo); can you brick it (not
  over this characteristic — firmware update is a separate, guarded flow);
  what about range and interference; is any of this legal (own devices, passive
  capture).
-->





Notes:


before # Talking back slide, we need a additional slide about "there is a js library for that".