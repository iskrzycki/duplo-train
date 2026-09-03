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

Rafał Iskrzycki · Allegro Tech Meeting #19 · a lightning talk, ~15 min, work in progress

<!--
Notatki (PL):
- Otwarcie lekkie: "Some LEGO sets ship with an app. I skipped it and talked to the train directly."
- Zaznacz od razu: to work-in-progress, mam działający PoC (silnik + światła), reszta to eksploracja.
- Nie przedstawiaj się długo — jedno zdanie wystarczy.
-->

---
layout: atm-cards
bg: bokeh
cols: 4
---

# What we're going to do

::cards::

<NumCard num="01" title="BLE 101">
Two protocol stacks, four roles, one tree of bytes. The vocabulary for everything after.
</NumCard>

<NumCard num="02" title="Security">
Pairing methods, and why a children's toy picks the weakest one on purpose.
</NumCard>

<NumCard num="03" title="The protocol">
Sniffing the official app, then decoding one LEGO frame byte by byte.
</NumCard>

<NumCard num="04" title="Demo & next">
The train actually moving — and the parts I'm still stuck on.
</NumCard>

<!--
Notatki (PL):
- Ten slajd to kontrakt z salą: mówisz, co dostaną w 15 minut.
- Nie czytaj kart na głos — wskaż palcem 03 i 04 ("tu jest mięso, tu jest szczerość").
- Trzymaj ~20 sekund. Jeśli goni czas, przeskocz od razu do sekcji 01.
-->

<!-- ---
layout: atm-statement
bg: bokeh
---

# Why skip the app?

<v-clicks>

<div class="atm-lead">The app is a thin, <strong>safe wrapper</strong></div>

<div class="atm-lead">The chip does <strong>more</strong> than the app lets you touch</div>

<div class="atm-lead">Reverse-engineering a toy = a friendly way into <strong>BLE hacking</strong></div>

</v-clicks>

<!--
Notatki (PL):
- Apka to cienka nakładka: bezpieczna, ograniczona.
- Hardware potrafi więcej niż UI apki pozwala dotknąć — to jest hak narracyjny całego talku.
- To nie jest "o LEGO" — to pretekst, żeby pokazać jak działa BLE i jak się je podsłuchuje.
--> -->

---
layout: atm-section
number: '01'
---

# BLE 101

<div class="atm-sub">The five concepts you need for the rest of this talk</div>

<!--
Notatki (PL):
- Zapowiedz: teraz szybki fundament BLE, potem bezpieczeństwo, potem konkret LEGO + demo.
- Trzymaj tempo — to ma być ~6 minut na całe BLE 101 + security.
-->

---
layout: atm-light
deco: squares
---

# Bluetooth Classic<br>vs BLE

<div class="atm-sub">Two <strong>different</strong> protocol stacks under one brand name</div>

<div class="grid grid-cols-2 gap-5 mt-5">

<PanelCard v-click title="Bluetooth Classic (BR/EDR)">

- Audio streaming, continuous data
- High power draw
- Stream model (a virtual cable)
- Headphones, speakers

</PanelCard>

<PanelCard v-click accent title="Bluetooth Low Energy (BLE)">

- Short, sporadic data
- Very low power
- **Attribute model — GATT**
- Trackers, sensors, **toys**

</PanelCard>

</div>

<!--
Notatki (PL):
- Najważniejsze zdanie: to DWA różne protokoły, nie "nowszy Bluetooth".
- Nie da się pogadać z BLE stosem Classic i odwrotnie.
- Pociąg Duplo = BLE (biblioteki noble/bleak, model GATT, profil bateryjny).
- Ciekawostka "Bluetooth 5.0 = wersja specyfikacji" dobrze rozbraja mylące nazewnictwo.
-->

---
layout: atm-dark
bg: soft
panel: soft
---

# Central vs Peripheral

<div class="atm-sub">Roles straight from the Bluetooth SIG spec (the GAP layer)</div>

<div class="grid grid-cols-2 gap-10 mt-8">

<div v-click>
  <div class="text-5xl">💻</div>
  <h2 class="mt-3">Central</h2>
  <div class="mt-2">Scans and <strong>initiates</strong> the connection</div>
  <div class="atm-caption mt-2">your laptop / phone</div>
</div>

<div v-click>
  <div class="text-5xl">🚂</div>
  <h2 class="mt-3">Peripheral</h2>
  <div class="mt-2"><strong>Advertises</strong> itself, waits to be found</div>
  <div class="atm-caption mt-2">the train</div>
</div>

</div>

<div v-click class="atm-foot">
One device can play both roles in different contexts — here they're fixed for the whole talk.
</div>

<!--
Notatki (PL):
- To oficjalna terminologia SIG, nie żargon.
- Pociąg reklamuje się (advertising), laptop inicjuje połączenie.
- Zapowiedz slajd o pułapce: za chwilę pokażę, że "kto łączy" ≠ "kto jest serwerem".
-->

---
layout: atm-light
deco: chip
dense: true
---

# GATT: the heart of BLE

<div class="atm-sub">Everything we do to the train is <strong>reading and writing this tree</strong></div>

```txt
Device (train)
 └── Service              "LEGO Hub Service"
      └── Characteristic  "Hub Characteristic"
           ├── Value        the bytes we send
           └── Properties:  Read · Write · Notify · Indicate
```

<div class="grid grid-cols-2 gap-6 mt-4 text-[15px]">

<div v-click>

- **Service** — a logical group of features
- **Characteristic** — a "variable" you read or write

</div>

<div v-click>

- **Write** — how we send commands
- **Notify** — the train pushes data back
- **UUID** — 128-bit ID; LEGO uses custom ones

</div>

</div>

<!--
Notatki (PL):
- To jest slajd, na którym wisi cała reszta — daj mu najwięcej czasu.
- Sterowanie = Write bajtów do characteristic. Notify = dane zwrotne (czujniki, bateria).
- UUID producenta trzeba odkryć — to pierwszy krok reverse-engineeringu.
-->

---
layout: atm-statement
bg: orb-hand
align: center
---

# Peripheral = Server<br>Central = Client

<div class="atm-lead">The counterintuitive part</div>

<!--
Notatki (PL):
- Zrób pauzę. To jest "wow, odwrotnie niż myślę" moment dla technicznej sali.
- Dwie niezależne osie: GAP (kto łączy) vs GATT (kto trzyma dane).
-->

---
layout: atm-light
deco: squares
---

# GAP role ≠ GATT role

<div class="atm-sub">Two independent axes that people constantly conflate</div>

<div class="grid grid-cols-2 gap-5 mt-5">

<PanelCard v-click title="GAP — who connects">

- **Central** → initiates
- **Peripheral** → advertises

</PanelCard>

<PanelCard v-click accent title="GATT — who holds data">

- **Server** → hosts characteristics
- **Client** → requests them

</PanelCard>

</div>

<div v-click class="mt-5 text-[19px]">
The <strong>train (Peripheral)</strong> is the <strong>GATT Server</strong>.
Your <strong>laptop (Central)</strong> is the <strong>GATT Client</strong>.
<div class="atm-caption mt-1">The tiny battery toy "serves"; the powerful laptop "requests".</div>
</div>

<!--
Notatki (PL):
- Wytłumacz sensem: peripheral hostuje dane O SOBIE, central po nie przychodzi.
- To brzmi nielogicznie względem modelu web (serwer = mocna maszyna), i o to chodzi.
- Świetny dowód, że rozumiesz temat głębiej niż z tutoriala.
-->

---
layout: atm-split
surface: dark
bg: bokeh
ratio: 1.15fr 1fr
deco: none
---

# Advertising<br>& discovery

<div class="atm-sub">How it announces itself — <strong>before</strong> any connection</div>

<v-clicks>

- Small packets (≤ 31 bytes) broadcast every 20–1000 ms
- Sent on **three channels** (37, 38, 39)
- Scanning is either **passive** (listen) or **active** (ask for more)
- LEGO hubs broadcast **manufacturer data** you can recognise them by

</v-clicks>

::right::

<div class="mt-[120px]" v-click>

<Note>
🔓 Advertising data is <strong>public and unencrypted</strong> — anyone nearby already knows there's a LEGO train in the room.
</Note>

</div>

<!--
Notatki (PL):
- Podkreśl: advertising jest jawny i nieszyfrowany — pomost do sekcji o bezpieczeństwie.
- Hub wysyła manufacturer-specific data (typ huba, stan przycisku), po którym go rozpoznajesz.
-->

---
layout: atm-section
number: '02'
---

# Security<br>& pairing

<div class="atm-sub">How much actually protects a children's toy?</div>

<!--
Notatki (PL):
- Pytanie retoryczne do sali: "jak myślicie, jakiego poziomu zabezpieczeń używa zabawka dla dzieci?"
- Zbuduj napięcie zanim odpowiesz na kolejnym slajdzie.
-->

---
layout: atm-light
deco: squares
dense: true
---

# Pairing methods<br>& security levels

<div class="grid grid-cols-2 gap-8 mt-2">

<div>

<h3>Pairing methods</h3>

<v-clicks>

- **Just Works** — no identity check at all
- **Passkey Entry** — you type a PIN
- **Numeric Comparison** — you match a code
- **OOB** — out of band, e.g. over NFC

</v-clicks>

</div>

<div>

<h3>Legacy vs Secure</h3>

<v-clicks>

- **Legacy Pairing** (4.0/4.1) — weak key (`TK`)
- Crackable offline with **`crackle`**, if you catch the handshake
- **LE Secure Connections** (4.2+) — ECDH, practically unbreakable

</v-clicks>

</div>

</div>

<div v-click class="atm-foot">
<strong>Pairing</strong> = agree on keys &nbsp;·&nbsp; <strong>Bonding</strong> = save them for next time
</div>

<!--
Notatki (PL):
- Nie wchodź za głęboko w krypto — zostaw czas na LEGO i demo.
- Kluczowy kontrast: Legacy (łamalne przez crackle) vs LE Secure Connections (ECDH).
- Jeśli masz capture z parowania ze sniffera — to jest miejsce, żeby o nim wspomnieć.
-->

---
layout: atm-split
surface: dark
bg: soft
panel: soft
ratio: 1.2fr 1fr
deco: none
---

# Just Works —<br>why toys do it

<v-clicks>

- No screen, no keyboard → it **cannot** show or type a PIN
- So the train falls back to **Just Works** (no MITM protection)
- Often pairing is skipped entirely — to save **battery** and simplify **UX**
- Result: **anyone in range can connect and send commands**

</v-clicks>

::right::

<div class="mt-[150px]" v-click>

<Note>
That's usually why my PoC <strong>"just worked"</strong> — there was no pairing handshake at all.
</Note>

</div>

<!--
Notatki (PL):
- To odpowiedź na pytanie retoryczne z sekcji.
- Puenta: brak realnego uwierzytelnienia "to właściciel". PoC działa bez handshake'u.
- Bezpieczeństwo = decyzja biznesowa oparta na ryzyku (klawiatura szyfruje, zabawka nie).
-->

---
layout: atm-section
number: '03'
---

# The train's<br>own protocol

<div class="atm-sub">Sniffing the official app, then decoding what it says</div>

<!--
Notatki (PL):
- Krótki oddech przed najbardziej technicznym fragmentem.
- Powiedz jedno zdanie: "od teraz przestajemy mówić o specyfikacji i patrzymy na bajty".
-->

---
layout: atm-split
surface: light
deco: hand
ratio: 1fr 1.1fr
dense: true
---

# Sniffing the traffic

<div class="atm-sub">How I saw what the app really sends</div>

<v-clicks>

- **HCI snoop log** on an Android tablet → `btsnoop_hci.log`
- Open it in **Wireshark**, filter on `btatt`
- Or use a real **radio sniffer**: nRF52840 dongle + nRF Sniffer
- Sniff the **official app** first — it knows the secret commands

</v-clicks>

::right::

<div class="mt-[196px]">

<<< @/snippets/wireshark-capture.txt {*}{lines:false}

<div class="atm-caption mt-2">
Wireshark showing an ATT Write to the hub characteristic —
replace <code>snippets/wireshark-capture.txt</code> with your own.
</div>

</div>

<!--
Notatki (PL):
- WAŻNE ograniczenie: HCI snoop log widzi tylko urządzenie, na którym działa. Apka na tablecie → snoop na tablecie.
- Tu wrzuć PRAWDZIWY zrzut z Wiresharka z Twojego capture (podświetlony payload).
- Rada: podsłuchuj oficjalną apkę, nie własny kod — apka zna nieudokumentowane komendy.
- Jeśli masz sniffer nRF52840: wspomnij, że łapie cały handshake od zera (dowód na Just Works).
-->

---
layout: atm-dark
bg: soft
panel: true
dense: true
deco: none
---

# LWP3: decoding one packet

<div class="atm-sub">LEGO Wireless Protocol 3 · message type <code>0x81</code> = Port Output Command</div>

<div class="mt-5">
  <PacketBytes
    :bytes="[['08','length'],['00','hub id'],['81','msg type'],['00','port'],['11','startup'],['51','sub cmd'],['00','mode'],['00','value']]"
    :hot="[7]"
  />
</div>

```txt {1|2|3|4|5|6|7|8|all}
08   Length = 8 bytes (the whole message)
00   Hub ID = 0 (always)
81   Message Type = Port Output Command (129)
00   Port ID = 0
11   Startup + Completion = execute now + give me feedback
51   Sub Command = WriteDirectModeData
00   Mode = 0
00   Value = 0   ← STOP
```

<div v-click class="atm-foot" style="right: 12%">
<code>… 51 00 <span class="text-white font-bold">00</span></code> = <strong>stop</strong> &nbsp;→&nbsp;
<code>… 51 00 <span style="color: var(--atm-orange-2)" class="font-bold">64</span></code> = <strong>full power</strong>.
One byte is the whole difference — it's a signed int8, so <code>9C</code> = −100 = the other way.
</div>

<!--
Notatki (PL):
- To jest gwóźdź programu — zwolnij i przejdź bajt po bajcie (klikaj podświetlenia).
- Puenta wizualna: zmiana ostatniego bajtu 00 → 64 to różnica stop / pełna moc.
- Wartości to signed int8 (-100..100), więc 9C = -100 = jazda w drugą stronę.
- Uczciwie: format protokołu jest publiczny (LEGO) + reverse-engineering community.
-->

---
layout: atm-split
surface: dark
bg: soft
panel: soft
ratio: 1fr 1.15fr
deco: none
---

# Demo 🚂

<div class="atm-sub">Motor speed and lights, straight from the Node.js code in this repo</div>

<Note class="mt-6" quiet>
📼 A recorded video is queued as the backup — a conference room is very crowded 2.4 GHz.
</Note>

::right::

<div class="mt-14">

```js
const motor = await hub.waitForDeviceAtPort('A')

motor.setPower(50)        // go
await hub.sleep(2000)
motor.brake()             // stop
```

<div class="atm-caption mt-3">
<code>node-poweredup</code> · every frame it writes is hex-dumped by <code>log.js</code>
</div>

</div>

<!--
Notatki (PL):
- ODTWÓRZ VIDEO jeżdżącej kolejki (albo live, jeśli odważnie).
- Pokaż side-by-side: co klikam ↔ co leci po BLE (hex).
- MIEJ NAGRANIE JAKO BACKUP — sala konferencyjna to zatłoczone 2.4 GHz, BLE potrafi kaprysić.
- node-poweredup: setPower nie sprawdza typu portu — zadziała i na silniku, i na świetle.
-->

---
layout: atm-light
deco: chip
dense: true
---

# What's next 🔧

<div class="atm-sub">Honest work in progress</div>

<v-clicks>

- Obstacle detection: a **webcam over the track** + OpenCV in Node
- Tag the train (colour or **ArUco**) so its own motion isn't a false alarm
- Two tags, front and rear, to cover a 30 cm train through curves
- An IR tripwire (Arduino → USB serial) as the hardware backup
- Undocumented characteristics I still haven't cracked

</v-clicks>

<div v-click class="atm-foot">
This is where I'm still stuck — and that's the fun part.
</div>

<!--
Notatki (PL):
- Bądź szczery: to wczesny etap, nie skończony hack. Sala lubi "tu utknąłem".
- Kamera: lokalnie (bez streamingu — 2-3 s opóźnienia to za dużo), webcam nad torem.
- Problem: pociąg sam generuje ruch → tagi + strefa wykluczenia. Dwa tagi na długi pociąg.
-->

---
layout: atm-statement
bg: bokeh
---

# The BLE stack around you<br>is more open than<br>the app pretends

<div v-click class="atm-lead">
Security is a business decision, not a technical limit.
</div>

<!--
Notatki (PL):
- Główny takeaway — powiedz go wolno i wyraźnie.
- Klawiatura szyfruje (wysoka stawka), zabawka nie (niska stawka) — to wybór, nie brak możliwości.
-->

---
layout: atm-end
---

# Thank you! 🚂

<div class="atm-lead">Questions?</div>

<div class="mt-7 text-[15px]" style="max-width: 46%">

<h4>Links & credit</h4>

<div class="atm-links mt-2">
  <div><span>LWP3 spec</span> lego.github.io/lego-ble-wireless-protocol-docs</div>
  <div><span>Library</span> github.com/nathankellenicki/node-poweredup</div>
  <div><span>Community</span> Pybricks · BOOSTreveng</div>
  <div><span>Tools</span> nRF Sniffer for Bluetooth LE · Wireshark · crackle</div>
  <div><span>This deck</span> &lt;your repo link&gt;</div>
</div>

</div>

<!--
Notatki (PL):
- Podziękuj społeczności (Pybricks, JorgePe/BOOSTreveng) — uczciwość robi dobre wrażenie.
- Wrzuć link do swojego repo z kodem i slajdami.
- Zostaw ~2 min na pytania.
-->
