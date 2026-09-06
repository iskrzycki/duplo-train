# Bluetooth & BLE in practice — hacking a LEGO Duplo train

> Preparation material for the talk *"How I hacked my son's LEGO Duplo train"*.
> Goal: understand Bluetooth / BLE well enough to speak confidently about talking to the train and to handle questions from the audience.

---

## Table of contents

1. [Bluetooth Classic vs BLE](#1-bluetooth-classic-vs-ble)
2. [RF channels and frequency hopping](#2-rf-channels-and-frequency-hopping)
3. [Roles in BLE: Central vs Peripheral](#3-roles-in-ble-central-vs-peripheral)
4. [GATT: Services, Characteristics, UUIDs](#4-gatt-services-characteristics-uuids)
5. [GAP role vs GATT role — the conceptual trap](#5-gap-role-vs-gatt-role)
6. [Advertising and Discovery](#6-advertising-and-discovery)
7. [Pairing, bonding and security](#7-pairing-bonding-and-security)
8. [Just Works vs no pairing at all](#8-just-works-vs-no-pairing-at-all)
9. [Sniffing BLE](#9-sniffing-ble)
10. [LEGO Powered Up and LWP3](#10-lego-powered-up-and-lwp3)
11. [node-poweredup](#11-node-poweredup)
12. [Real-world BLE vulnerabilities](#12-real-world-ble-vulnerabilities)
13. [Presentation plan (15 minutes)](#13-presentation-plan-15-minutes)
14. [Bonus: camera-based obstacle detection](#14-bonus-camera-based-obstacle-detection)
15. [Useful links](#15-useful-links)

---

## 1. Bluetooth Classic vs BLE

The most important thing to understand up front: **Bluetooth Classic (BR/EDR) and Bluetooth Low Energy (BLE) are two different protocol stacks**. Since Bluetooth 4.0 they are described in one specification and often implemented in the same chip (*dual mode*), but what they share is mostly the brand name.

| Feature | Bluetooth Classic (BR/EDR) | BLE |
|---|---|---|
| Use case | audio streaming, continuous transmission (headphones, speakers) | short, sporadic data transfers |
| Power consumption | high | very low (*Low Energy*) |
| Communication model | data stream (a virtual cable over RFCOMM/SPP) | attribute model — **GATT** (services / characteristics) |
| Topology | mostly 1:1 | 1:1, but also broadcast to many devices |
| Typical devices | headphones, speakers, older mice | fitness bands, sensors, toys, beacons |
| Channels | 79 channels, 1 MHz wide | 40 channels, 2 MHz wide |

**Key takeaway for the talk:** you cannot "talk" to a BLE device using the Classic stack, or the other way around — they differ at both the radio and logical level.

> ⚠️ **A terminology note worth mentioning on stage:** when a vendor writes "Bluetooth 5.0", they are stating the **specification version**, not which of the two modes is used. On a small, low-power IoT chip, "Bluetooth 5.0" almost always means **BLE 5.0**, not Classic.

### The Duplo train context

The LEGO Duplo train (the Powered Up system) **uses BLE**, not Bluetooth Classic. Several things confirm this:
- we connect using BLE-only libraries (`noble` / `node-poweredup` in JS, `bleak` in Python),
- we work with services and characteristics (GATT) — that is unambiguously BLE,
- the power profile (AAA batteries, long runtime) is typical for BLE.

---

## 2. RF channels and frequency hopping

This section explains **what BLE channels are and why devices hop between them** — a topic that comes up naturally when you show a sniffer capture, because the sniffer has to follow those hops.

### The 2.4 GHz ISM band is crowded

BLE operates in the **2.4 GHz ISM band** (roughly 2400–2483.5 MHz). This is unlicensed spectrum shared with Wi-Fi, Zigbee, microwave ovens, wireless mice, and everything else. There is no traffic cop — devices simply have to cope with each other's interference.

### 40 channels, 2 MHz apart

BLE divides that band into **40 RF channels, each 2 MHz wide**, numbered 0–39:

| Type | Channel numbers | Count | Purpose |
|---|---|---|---|
| **Primary advertising channels** | 37, 38, 39 | 3 | device discovery — broadcasting "I exist" |
| **Data channels** | 0–36 | 37 | actual connection traffic (also secondary advertising in BLE 5) |

The numbering looks odd (37, 38, 39 are not next to each other in frequency), and that is deliberate. The three advertising channels sit at **2402 MHz, 2426 MHz and 2480 MHz** — spread across the bottom, middle and top of the band.

### Why the advertising channels are placed where they are

The three advertising frequencies were **chosen specifically to dodge Wi-Fi**. The classic non-overlapping Wi-Fi channels are 1, 6 and 11, and BLE's advertising channels are positioned in the gaps between them.

This matters because of a brutal power asymmetry: a Wi-Fi access point typically transmits at **15–20 dBm**, while a BLE device runs at **0–4 dBm**. That is a 10× to 100× difference in radiated power. A single 20 MHz Wi-Fi channel covers roughly 20 BLE channels' worth of spectrum — so from the BLE receiver's point of view, nearby Wi-Fi is not just interference, it is a wall of noise.

Spreading the three advertising channels apart means that if one is blocked by a Wi-Fi network, the other two are likely still usable. During each advertising event, the device broadcasts **the same packet on all three channels, one after another** — three chances to be heard instead of one.

### Frequency hopping during a connection

Once a connection is established, the two devices stop using the advertising channels and start using the **37 data channels**. And they do not stay on one — they **hop**.

- Each *connection event* happens on a different channel, following a **pseudo-random sequence that both sides compute independently** (they agreed on the parameters when connecting).
- If one channel is being trashed by interference, only that one packet is lost. The next hop lands somewhere else, probably clear.
- Statistically, interference on any single frequency only affects roughly **1/37 of the packets**.

**Adaptive Frequency Hopping (AFH)** takes this further: when a device notices that certain channels consistently fail, it can update the **channel map** — a 37-bit bitmap where each bit marks a channel as good or bad — and simply stop hopping onto the bad ones. If Wi-Fi is camping on part of the band, AFH can blacklist that whole region.

### How the next channel is actually computed

There are **two channel selection algorithms**; which one is in use is signalled by the `ChSel` bit in `CONNECT_IND`.

**CSA #1** — simple, mandatory in every device. The whole thing is one modular addition plus an optional remap:

```
unmappedChannel = (lastUnmappedChannel + hopIncrement) mod 37

if unmappedChannel is marked good in the channel map:
    use it
else:
    remapIndex = unmappedChannel mod (number of used channels)
    use usedChannels[remapIndex]
```

- **`hopIncrement`** is a random value in the range **5–16**, picked by the Central and sent in `CONNECT_IND`. It stays constant for the whole connection.
- **`lastUnmappedChannel`** is the previous channel *before* remapping — both sides track the unmapped value, which is what keeps them in sync.

Worked example with `hopIncrement = 7` and all channels good: `0 → 7 → 14 → 21 → 28 → 35 → 5 → 12 → …`. Since 37 is prime and the increment is between 5 and 16, the sequence visits all 37 channels before repeating.

**CSA #2** (BLE 4.2+, used when both sides support it) drops the dependency on the previous channel entirely:

```
prn_e = PRNG(AccessAddress, connectionEventCounter)
unmappedChannel = prn_e mod 37
```

The PRNG is built from `PERM` (reversing the bit order of a 16-bit value) and `MAM` (multiply-and-add) operations. The channel therefore depends only on the **Access Address, the channel map, and the connection event counter** — no history. That means any event's channel can be computed directly, which is why sniffers targeting CSA #2 connections need to recover the PRNG counter rather than just a hop increment.

### Does Bluetooth Classic hop too?

Yes — and far more aggressively:

| | Bluetooth Classic | BLE |
|---|---|---|
| Channels | **79** (1 MHz each) | 40 (2 MHz each), 37 for data |
| Hop rate | **1600 hops/s** — a new channel every **625 µs** | once per connection event (7.5 ms – 4 s) |
| Sequence derived from | the master's clock + its BD_ADDR | hop increment / PRNG + Access Address |
| AFH | yes (since Bluetooth 1.2) | yes |

Classic divides time into **625 µs slots** and sits on a different channel in each one. The sequence comes from the master's clock and address, so it is specific to that piconet — several piconets in one room rarely collide, and when they do they lose a single slot and immediately diverge.

**This has a big consequence for sniffing:** Classic is much harder to capture. There is no single packet like `CONNECT_IND` that hands over the whole hopping recipe — you have to recover the master's clock first, and retune the radio 1600 times a second. The **nRF Sniffer cannot do Bluetooth Classic at all** (nRF52840 is a BLE chip); that job needs an **Ubertooth One**, and even then it is demanding.

> 💡 Worth saying on stage: BLE is easier to sniff not because it is badly designed, but because its hopping pattern is **announced in the clear** in one packet at the start of the connection. Classic hides its sequence in the master's clock — not for security reasons, but the side effect is that eavesdropping takes far more work.

### Why this matters for sniffing (and for your talk)

Two practical consequences worth mentioning on stage:

1. **A sniffer has to follow the hopping.** This is exactly why you cannot just "tune to a frequency" and read BLE traffic. The nRF Sniffer must catch the `CONNECT_IND` packet — the moment the connection is established, which carries the hop parameters — and then follow the sequence. Miss that packet, and you cannot follow the connection.
2. **AFH only works during connections.** The three advertising channels are fixed and cannot adapt. So in a conference room packed with hundreds of phones and laptops, the *discovery* phase is the most fragile part — which is a good, honest reason to have a recorded video as demo backup.

> 💡 **Nice framing for the audience:** BLE does not try to win the fight for the 2.4 GHz band — it is far too quiet to win. Instead it hops around, so that losing any single frequency costs it almost nothing. Resilience through movement rather than through power.

---

## 3. Roles in BLE: Central vs Peripheral

This is official Bluetooth SIG terminology (the **GAP** layer — *Generic Access Profile*), not informal jargon.

- **Peripheral** — a device with limited resources (battery, compute) that **advertises** its presence. → **This is your train.**
- **Central** — a device that scans for peripherals and **initiates the connection**. → **This is your laptop / phone.**

One device can play both roles in different contexts (a phone is Central to a smartwatch but Peripheral to a laptop). In our case the roles are fixed: **train = Peripheral, laptop = Central**.

---

## 4. GATT: Services, Characteristics, UUIDs

**GATT** (*Generic Attribute Profile*) is the heart of BLE communication and **the single most important concept in the talk** — because all of the hacking work is exploring this structure.

```
Device (train)
 └── Service  (e.g. "LEGO Hub Service")
      └── Characteristic  (e.g. "Hub Characteristic")
           ├── Value       (the data — e.g. command bytes)
           └── Properties: Read / Write / Notify / Indicate
```

- **Service** — a logical grouping of features.
- **Characteristic** — a specific "variable" you can read from or write to.
- **Properties** — what you are allowed to do with a characteristic:
  - **Read** — the Central reads a value,
  - **Write** — the Central writes a value (this is how we send commands to the train),
  - **Notify** — the Peripheral pushes updates on its own (e.g. sensor data), no polling needed,
  - **Indicate** — like Notify, but with acknowledgement.
- **UUID** — a unique identifier for every service and characteristic. Standard ones have a short 16-bit form; vendors (like LEGO) use custom **128-bit UUIDs**. Discovering those UUIDs is usually the first step of reverse engineering.

> 💡 For the train: controlling the motor and lights comes down to **writing the right bytes to the right characteristic**. Notify is what you use if you want data back (port state, battery level, sensors).

---

## 5. GAP role vs GATT role

This is a great point for showing you understand the topic more deeply than a tutorial. BLE has **two independent axes of roles**:

| Axis | Roles | What it determines |
|---|---|---|
| **GAP** (connection) | Central / Peripheral | who initiates the connection |
| **GATT** (data) | GATT Server / GATT Client | who holds the data |

**The catch:** in the typical scenario the **peripheral is the GATT Server** and the central is the GATT Client — the opposite of what intuition from the web model suggests.

- **Peripheral (train)** = **GATT Server** — it stores the data (services, characteristics) and answers requests.
- **Central (laptop)** = **GATT Client** — it sends requests ("read this", "write that") and consumes the data.

So the small, battery-powered toy is the "server", and the powerful laptop is the "client". It makes sense from this angle: **the peripheral hosts data about itself, and the central comes to fetch it**.

---

## 6. Advertising and Discovery

Before a connection can happen, the peripheral has to be found:

- **Advertising packet** — a small packet (up to 31 bytes in older BLE; more with *Extended Advertising* in BLE 5.0) broadcast periodically (e.g. every 20–1000 ms). It contains things like the device name, some service UUIDs, and *manufacturer-specific data*.
- **Scanning** — the Central listens for these packets:
  - **passive** — listens only,
  - **active** — sends a *scan request* and receives extra data (*scan response*).
- Advertising cycles through the **three advertising channels (37, 38, 39)** — see [section 2](#2-rf-channels-and-frequency-hopping) for why those three.

> 🔓 **Bridge to security:** advertising data is **public and unencrypted**. Anyone in range can "overhear" that there is a LEGO train in the room, **before** connecting to it. A LEGO Powered Up hub broadcasts 6 bytes of *manufacturer-specific advertisement data* that identifies it (the LEGO System A/S manufacturer ID assigned by the Bluetooth SIG, hub type, button state, and so on).

### CONNECT_IND — the one packet that matters

When the Central decides to connect, it sends a **`CONNECT_IND`** (also called `CONNECT_REQ`) on the advertising channel, right after hearing an advertisement. This packet is sent **exactly once per connection** — it is never repeated. After it, both sides move to the data channels and never return to the advertising channels for that connection.

It carries everything needed to reproduce the hopping sequence:

| Field | Meaning |
|---|---|
| **AA** (Access Address) | 4-byte identifier of this specific connection |
| **CRCInit** | seed for CRC calculation |
| **WinSize / WinOffset** | timing window for the first connection event |
| **Interval** | connection interval (× 1.25 ms) |
| **Latency / Timeout** | slave latency and supervision timeout |
| **ChM** (Channel Map) | 37-bit map of which data channels are in use |
| **Hop** | the **hop increment** (5–16) |
| **SCA** | clock accuracy |
| **ChSel** (header bit) | whether CSA #2 is used |

**Why this dominates sniffing:** without `AA`, `ChM` and `Hop`, a sniffer has no way to compute where the next packet will be. Miss this single packet and you cannot follow that connection at all — the fix is to force a reconnect (power-cycle the train or disconnect from your script) and catch the fresh `CONNECT_IND`. Every new connection gets a **new** Access Address and hop increment, so nothing can be cached for later.

---

## 7. Pairing, bonding and security

This is the section that usually gets hand-waved, so it is worth getting precise — especially since the punchline of the talk depends on it.

### First: pairing is optional

The single most important fact, and the one that surprises people: **in BLE, pairing is not required to communicate.**

A Central can scan, connect, discover services, read characteristics and write to them — all **without ever pairing**. Pairing is a separate, opt-in procedure that a device may *demand* before granting access to certain attributes. If the Peripheral never demands it, nothing happens; the connection just works, in the clear.

This is very different from the mental model most people carry over from Bluetooth headphones, where "pair first, then use" feels mandatory. In BLE, "pair first" is a policy the device chooses to enforce, not a law of the protocol.

### What pairing actually does

**Pairing** is the process of establishing shared encryption keys. It happens in three phases:

1. **Feature exchange** — the two devices announce their I/O capabilities (do I have a display? a keyboard? neither?) and their security requirements. This is what decides which association model gets used.
2. **Key generation** — the actual key agreement, using either Legacy Pairing or LE Secure Connections (see below).
3. **Key distribution** — optionally exchanging additional keys (e.g. the Identity Resolving Key used for private/rotating addresses).

**Bonding** is what happens after: both sides **store the keys persistently** so they can re-establish an encrypted link on the next connection without redoing the whole handshake. Pairing without bonding is possible — you get encryption for this session only, and start from scratch next time.

> **Short version for the slide:** *Pairing = agree on keys. Bonding = remember them. Encryption = actually use them.* These are three separate things, and a device can do the first without the second, or none at all.

### Association models — how identity gets confirmed

The association model is the *user-facing* part of pairing: how the two devices prove to each other that they are talking to the right party and not to an attacker sitting in the middle.

| Model | How it works | Requires | MITM protection |
|---|---|---|---|
| **Just Works** | keys are exchanged with no identity confirmation whatsoever | nothing (no UI) | ❌ **none** |
| **Passkey Entry** | one device shows a 6-digit PIN, the user types it into the other | display + keyboard | ✅ yes |
| **Numeric Comparison** | both devices show a 6-digit number, the user confirms they match | two displays | ✅ yes |
| **Out of Band (OOB)** | keys exchanged over a different channel, e.g. NFC | extra channel | ✅ yes (depends on the OOB channel) |

The model is not chosen by the user — it is **negotiated automatically** based on the I/O capabilities each side declared during the feature exchange. If either side says "I have no display and no keyboard", the negotiation collapses to Just Works, because there is no way for a human to verify anything.

### Security levels

Security Mode 1 (encryption-based) has four levels:

| Level | Meaning |
|---|---|
| **1** | No security — no encryption, no authentication. Anyone can connect, read and write. |
| **2** | Unauthenticated pairing with encryption — traffic is encrypted, but **no MITM protection** (this is Just Works). |
| **3** | Authenticated pairing with encryption — MITM protection via Legacy Pairing. |
| **4** | Authenticated **LE Secure Connections** — MITM protection with modern crypto (ECDH). |

### Legacy Pairing vs LE Secure Connections

This distinction decides whether a captured session can be decrypted afterwards:

- **Legacy Pairing** (BLE 4.0 / 4.1) — the security hinges on a *Temporary Key* (TK) with very weak entropy. With Just Works the TK is simply **all zeros**. If you capture the complete pairing handshake, tools like **`crackle`** can derive the keys **offline** and decrypt the whole session retroactively.
- **LE Secure Connections** (BLE 4.2+) — uses **ECDH** (Elliptic Curve Diffie-Hellman) key agreement. Even a passive eavesdropper who captured the entire handshake cannot derive the session key. Breaking it is **not practically feasible** with today's compute.

> ⚠️ Note the trap: **Just Works is available in both Legacy and Secure Connections.** "We use LE Secure Connections" does not mean "we are protected against MITM" — Secure Connections defeats *passive eavesdropping*, but if the association model is Just Works, an active attacker in the middle is still unauthenticated. Encryption strength and identity verification are separate problems.

---

## 8. Just Works vs no pairing at all

These two get conflated constantly, and the difference is exactly what makes the toy story interesting. They are **not** the same thing.

### Just Works — encrypted, but anonymous

- Pairing **does happen**. Keys are generated and the link **is encrypted**.
- What is missing is **authentication**: neither device verifies *who* is on the other end. There is no PIN to type, no number to compare, because the device has no screen and no keypad to do it with.
- Analogy: it is like sealing a letter in a tamper-proof envelope and handing it to a stranger whose face you never checked. The contents are protected in transit — but you have no idea whether you handed it to the right person.
- **What it protects against:** a passive eavesdropper with a sniffer sitting in the corner (with Secure Connections; with Legacy, `crackle` defeats even that).
- **What it does NOT protect against:** an active man-in-the-middle who pairs with both sides and relays traffic. Neither side can tell.

### No pairing — plaintext, wide open

- No key exchange, no encryption, **nothing**. The link operates at Security Level 1.
- Every ATT read and write travels **in the clear**. A sniffer sees the actual command bytes, not ciphertext.
- Anyone in radio range can connect and start writing to characteristics. There is no concept of "the owner" at all.
- This is the state where your PoC "just works" the moment you write to the right handle — no handshake, no authorization, no negotiation.

### Side-by-side

| | Just Works | No pairing |
|---|---|---|
| Keys exchanged | ✅ yes | ❌ no |
| Traffic encrypted | ✅ yes | ❌ no — plaintext |
| Passive sniffer sees commands | ❌ no (with LESC) | ✅ **yes, directly** |
| MITM protection | ❌ no | ❌ no |
| Anyone in range can connect and control | ✅ yes | ✅ yes |
| Security Level | 2 | 1 |

**The crucial point for the talk:** both columns end with "anyone in range can connect and control the device". Just Works buys you *confidentiality* against a passive listener; it buys you **no access control whatsoever**. Encryption answers "can someone read this?", not "should this person be allowed to drive the train?"

### Why toys land here

- **No I/O.** No screen, no keypad → Passkey Entry and Numeric Comparison are physically impossible. The negotiation can only produce Just Works.
- **Battery.** The pairing handshake and ongoing encryption cost energy and airtime on a device meant to run for months on AAA cells.
- **UX.** A toy for a four-year-old that demands a pairing ritual is a support ticket generator. "Press the button, it connects" is the product requirement.
- **Threat model.** The vendor's honest risk assessment: what is the actual damage if a neighbour drives the train? Compare that to a BLE keyboard, where the same design choice would leak passwords.

> **Punchline to land on stage:** the security level here is a **business decision based on risk assessment, not a technical limitation**. Every one of these devices *could* implement LE Secure Connections with Numeric Comparison — the silicon supports it. Keyboards do exactly that, because the stakes are passwords. The train doesn't, because the stakes are a toy going in circles. Sometimes that trade-off is right; the interesting question is who checks whether it was made deliberately.

> Good rhetorical question for the audience: *"What level of security do you think a children's toy uses?"* — then reveal that for many of them, the honest answer is "none at all", not merely "the weak one".

---

## 9. Sniffing BLE

### Method 1: HCI snoop log (simplest)

Captures traffic **between the operating system and the Bluetooth controller on the same device** — not a true over-the-air capture.

- **Android:** Developer options → `Enable Bluetooth HCI snoop log` → extract `btsnoop_hci.log` via `adb bugreport` or `adb pull`, open in Wireshark (filter `btatt`).
- **Linux:** `btmon -w capture.log` (from BlueZ).
- **macOS:** `PacketLogger` from Apple Additional Tools (part of Xcode).

> ⚠️ **Important limitation:** an HCI snoop log only sees traffic from the device it runs on. If the official app is on a tablet and Wireshark is on your laptop, the laptop **will not see** the tablet ↔ train traffic. The snoop log has to be enabled **on the same device the app runs on**.

### Method 2: Radio sniffer (true over-the-air capture)

- **nRF Sniffer for Bluetooth LE** (Nordic Semiconductor) on an **nRF52840 (PCA10059)** dongle — cheap (~$10–30), community-validated, with a Wireshark plugin. Look for the **nRF52840** chip; avoid the **nRF51** series.
- **Ubertooth One** — pricier, popular in pentesting.

**Why a radio sniffer is better** (and it matters for a security talk):
- it captures traffic **regardless of which device is connecting** (no root needed on the tablet),
- it captures the **entire connection setup from scratch** — advertising, `CONNECT_IND`, feature exchange, and the pairing handshake if there is one — so you can **show proof on a slide** that the train uses Just Works or skips pairing entirely,
- it sees every BLE device in the area at once ("this room is full of invisible Bluetooth conversations").

#### Configuring the sniffer — you don't set the hopping, you pick the target

A common misconception: you never configure the hop sequence by hand. The sniffer derives it itself, provided it caught `CONNECT_IND`. What you configure is **whose** connection to follow, via the **Device list** in the Wireshark toolbar:

| Mode | Setting | What you get |
|---|---|---|
| **Scanning** (default) | `All advertising devices` | advertising from every device in range, cycling 37/38/39 |
| **Follow** | a specific device selected | advertising + scan req/resp + **all traffic inside that device's connection** |

Procedure that works:

1. **View → Interface Toolbars → nRF Sniffer for Bluetooth LE**
2. Start the capture
3. Find the train in the `Device` dropdown (by name or address)
4. **Select it** ← the step people forget
5. **Only now** run your Node script / the LEGO app to connect

Useful options:
- **Gear icon → `Only advertising packets`** — when ticked, the sniffer ignores new connections. **Must be unticked** to capture commands.
- **Advertising channel order** — configurable, e.g. `37,38,39`. By default the sniffer waits on channel 37, moves to 38 after a packet, then to 39.
- **RSSI capture filter** — e.g. `rssi >= -70`. This is the practical fix for a crowded device list: put the dongle close to the hub and set a tight threshold (−40 to −45 dBm).
- **PHY** — 1M is correct for LEGO; only change it if a device negotiates 2M or Coded.

> ⚠️ **One connection at a time.** Once locked onto a connection the sniffer hops in sync with that link and cannot simultaneously capture another connection or other devices' advertising. Selecting a different device mid-connection drops the current one.

> ⚠️ **Practical catch:** the sniffer must capture `CONNECT_IND` to follow the connection's channel hopping (see [section 2](#2-rf-channels-and-frequency-hopping)). Select the target device in the sniffer's dropdown **before** initiating the connection from your script — otherwise you will only see advertising packets and nothing of the actual session.

#### Can you sniff someone else's connection?

Yes — this is the radio sniffer's main advantage. It is not a party to the connection, needs no pairing and no root on the other device; it simply listens to the air. So while your kid drives the train from the official app on their tablet, you can capture the whole session from a laptop next to them.

The catch is the same one: start the sniffer and select the train **before** they connect, so you catch `CONNECT_IND`. If the connection is already established, the nRF Sniffer cannot join mid-stream — tools like **Btlejack** can recover an existing connection's parameters (CRCInit, channel map, hop interval, hop increment) through prolonged observation, but that is a different tool and a harder job.

How does the sniffer know which channels to listen on? Three stages: (1) before the connection, the advertising channels are **fixed and known globally** — nothing to guess; (2) at `CONNECT_IND` it extracts `AA`, `ChM`, `Hop`; (3) afterwards it runs **the same deterministic algorithm both endpoints run**. Hopping is an interference-resilience mechanism, not a security one — there is no secret in it.

> 💡 The LEGO hub uses a **static public address** that never rotates, so it is trivial to lock onto. Nice contrast for a slide: privacy-conscious devices (phones, fitness bands) rotate their address every few minutes precisely to defeat this kind of tracking — the toy does not.

### What should you sniff — the official app or your own code?

**Start with the official app.** It knows all the "secret" commands and modes that are missing from community documentation. Sniffing it shows you real payloads for the features the official app never lets you touch. Sniffing your own code only confirms what you already implemented (useful for debugging, but you will not discover anything new).

---

## 10. LEGO Powered Up and LWP3

**LEGO Powered Up** is the control system in newer LEGO sets (City, Technic, some Duplo, BOOST). The hub is a small BLE microcontroller driving motors, lights and sensors, acting as a **BLE Peripheral**.

The protocol is **LWP3** (*LEGO Wireless Protocol v3*). Key facts:

- The protocol documentation is public: **[lego-ble-wireless-protocol-docs](https://github.com/LEGO/lego-ble-wireless-protocol-docs)** — LEGO published it themselves.
- Service and characteristic UUIDs:
  - **LWP3 Hub Service UUID:** `00001623-1212-efde-1623-785feabcd123`
  - **LWP3 Hub Characteristic UUID:** `00001624-1212-efde-1623-785feabcd123`
- All communication goes through **a single characteristic** (`1624`) — LEGO deliberately used only one. Message kinds are distinguished by the **Message Type** field in the header, not by separate characteristics as in typical GATT designs. Worth mentioning: LEGO "flattened" the GATT model into one channel.
- Motor and light commands are sent as **Write** operations to that characteristic; the format is *Port Output Command* (Message Type `0x81`).

> Good place to acknowledge on stage: **much of the protocol knowledge is community work** (JorgePe/BOOSTreveng, Pybricks, node-poweredup), not just yours. It strengthens credibility and shows open source culture.

### 10.1. Common Message Header — every LWP3 message

Every message (in both directions) starts with a common 3-byte header:

| Byte | Name | Description |
|---|---|---|
| 0 | **Length** | length of the **entire** message in bytes (2 bytes for messages >127 B) |
| 1 | **Hub ID** | unused, **always `0x00`** |
| 2 | **Message Type** | kind of message (e.g. `0x81` = Port Output Command, `0x01` = Hub Properties, `0x05` = Error) |

The payload that follows depends on the Message Type.

### 10.2. Port Output Command (0x81) — format

For Message Type `0x81` the payload looks like this:

| Position | Name | Description |
|---|---|---|
| 3 | **Port ID** | port number (0–49 = physical connectors; internal ports have higher numbers) |
| 4 | **Startup/Completion** | controls buffering and feedback (see below) |
| 5 | **Sub Command** | what to do: e.g. `0x51` = *WriteDirectModeData*, `0x07` = *StartSpeed*, `0x01` = *StartPower* |
| 6+ | **Payload** | data depending on Sub Command (e.g. mode number + value) |

**The Startup/Completion byte (position 4)** is two 4-bit nibbles `HHHH CCCC`:
- upper 4 bits = **Startup** (`0x0` = buffer it, `0x1` = execute immediately),
- lower 4 bits = **Completion** (`0x0` = no feedback, `0x1` = send Command Feedback `0x82` when done).
- `0x11` (i.e. `0001 0001`) = "execute immediately **and** send feedback" — a very common value.

**Sub Command `0x51` (WriteDirectModeData)** is the most common "raw" route: it writes a value directly to a selected **mode** of the device on that port. The payload is `[Mode][value...]`. This is used for simple motor power/speed and light colour/brightness.

### 10.3. Decoding a real packet from the log

Log line:
```
[train]  109.531s RAW TX 08 00 81 00 11 51 00 00  ← PORT_OUTPUT_COMMAND(129)
```

Byte by byte:

| Byte | Value | Meaning |
|---|---|---|
| 0 | `08` | **Length** = 8 bytes (the whole message is 8 bytes — checks out) |
| 1 | `00` | **Hub ID** = 0 (always) |
| 2 | `81` | **Message Type** = `0x81` = Port Output Command (129 decimal — hence `PORT_OUTPUT_COMMAND(129)` in the log) |
| 3 | `00` | **Port ID** = 0 (device on port 0) |
| 4 | `11` | **Startup/Completion** = `0001 0001` → execute now + request feedback |
| 5 | `51` | **Sub Command** = `0x51` = WriteDirectModeData |
| 6 | `00` | **Mode** = 0 |
| 7 | `00` | **Value** = 0 |

**Interpretation:** this is "write value `0` to mode `0` of the device on port `0`, execute immediately, confirm". For a motor on port 0, mode 0 is typically *power* — so **`00` = stop / zero power**. If the last byte were `64` (=100) or `1E` (=30), it would be a drive command at that power. Speed/power values are usually **signed int8** (range −100…100), so `FF` = −1 and `9C` = −100 (reverse).

> 💡 **Great slide material:** show the same packet twice, side by side — `...51 00 00` (stop) vs `...51 00 64` (full power) — and point out that **literally one byte changes**. It illustrates vividly how thin this communication is: driving a train is one value byte in an eight-byte frame.

### 10.4. Other useful commands (for experiments / slides)

From the specification and community discussions — examples in hex:

- **Control the hub's 6 LEDs (brightness):** `09 00 81 35 11 51 00 ff 00` — port `0x35` (53, internal), Sub Command `0x51`, trailing bytes are LED mask + brightness.
- **StartSpeed (Sub Command `0x07`):** `[len] 00 81 [port] 11 07 [speed] [maxpower] [useprofile]` — **regulated** speed (the hub maintains it), as opposed to raw *power*.
- **Reset motor encoder to 0°:** `0b 00 81 [port] 11 51 02 00 00 00 00`.

> ⚠️ Port numbers and modes **differ between hubs** (Duplo Train, City Hub, Technic Hub). Verify them on your own unit — when a device is attached, the hub sends an upstream **Hub Attached I/O (`0x04`)** message containing the Port ID and device type (e.g. `0x0002` = *System Train Motor*, `0x0008` = *LED Light*, `0x0017` = *RGB Light*). That is exactly the moment in the log where you can read what is plugged into which port.

---

## 11. node-poweredup

**[node-poweredup](https://github.com/nathankellenicki/node-poweredup)** (by Nathan Kellenicki) is a ready-made JavaScript library for controlling LEGO Powered Up components. Under the hood it uses the **noble** BLE library (`@stoprocent/noble`). It works out of the box on macOS.

### What it gives you

- **Hub discovery and scanning** (`discover`), connecting (`hub.connect()`).
- **Motor control:** `motor.setPower(speed)`, `motor.setSpeed(...)`, `motor.brake()`.
- **Port handling:** `hub.waitForDeviceAtPort("A")` — wait for a device on a port.
- **LEDs, lights, sensors** — depending on hub type and attached devices.
- **Sensor events** (via Notify) — colour, distance, motor rotation angle.
- Support for many hub types: WeDo 2.0, Boost Move Hub, City Hub (Duplo/City), Technic Hub, SPIKE Essential.

### Minimal example (conceptually)

```javascript
const PoweredUP = require("node-poweredup");
const poweredUP = new PoweredUP.PoweredUP();

poweredUP.on("discover", async (hub) => {
  console.log(`Found hub: ${hub.name}`);
  await hub.connect();

  const motor = await hub.waitForDeviceAtPort("A"); // motor on port A
  motor.setPower(50);           // drive at power 50
  await hub.sleep(2000);        // for 2 seconds
  motor.brake();                // stop
});

poweredUP.scan();
console.log("Scanning for hubs...");
```

> 💡 **Important for the demo:** `setPower` on a port does not check the device type — it works on a motor (speed) and on a light (brightness) alike. Convenient, but you need to know what is plugged into each port.

### Alternatives

- **[Pybricks](https://pybricks.com/)** — MicroPython running **on** the hub (a different approach: the code runs on the hub rather than controlling it from outside). Excellent [documentation](https://docs.pybricks.com/) and [technical-info](https://github.com/pybricks/technical-info).
- **[pylgbst](https://github.com/undera/pylgbst)** — a Python library.

---

## 12. Real-world BLE vulnerabilities

Concrete, documented cases for the security section (strong and memorable):

- **Xiaomi Mi Band 6** — researchers confirmed the absence of encryption; the issue has been known since 2017 and persisted into later models. Great brand recognition for an audience. The **BreakMi** study (covering Mi Band 2/3/4/5/6) found that Xiaomi **ignores standard BLE security mechanisms** — pairing and secure sessions — and instead implements its own pairing, authentication and communication protocols **at the application layer** on top of a plain BLE link. Two separate layers, and the standard one is simply skipped.
- **BLE mice without encryption** — researchers reconstructed cursor trajectories from raw Bluetooth data and **inferred typed passwords** from them. A surprising "wow" fact.
- **Fitness trackers / health sensors** — an entire category frequently unencrypted, because "who cares about eavesdropping on step counts".
- **BLE keyboards** — usually **encrypted** (you type passwords on them) → a good contrast: the security level is a **business decision driven by risk assessment**, not by technical capability.
- **Vulnerability families:**
  - **SweynTooth** — a set of BLE vulnerabilities affecting fitness trackers, smart home and medical devices.
  - **BrakTooth** — 16 vulnerabilities in commercial Bluetooth stacks, affecting over 1400 chipsets across billions of devices (phones, laptops, industrial equipment, **toys**, IoT).

**The point:** keyboard = high stakes = encryption. Toy train = low stakes = Just Works or nothing. Technically every device *could* use LE Secure Connections — but cost (battery, complexity, UX) means toy vendors skip it.

---

## 13. Presentation plan (15 minutes)

Assumption: ~13 min of speaking + ~2 min buffer / Q&A. Roughly one slide per minute. Live demo with a recorded video as backup.

| # | Slide | Time | Content |
|---|---|---|---|
| 1 | **Title + hook** | 0:30 | Photo of the Duplo set + the official app listing. "I skipped the app. Watch what happens when you talk to the train directly." |
| 2 | **Why?** | 1:00 | The app is a thin, safe wrapper. The chip does more than the app lets you touch. A friendly way into BLE hacking. |
| 3 | **BLE 101: Classic vs BLE** | 1:00 | Two different protocols under one brand. Difference table. "Bluetooth 5.0" = spec version, not mode. |
| 4 | **BLE 101: Central vs Peripheral** | 1:00 | Train = Peripheral (advertises), laptop = Central (initiates). SIG terminology. |
| 5 | **BLE 101: GATT** | 1:30 | Services → Characteristics → Properties (Read/Write/Notify). Control = writing bytes to a characteristic. Hierarchy diagram. |
| 6 | **The trap: GAP vs GATT** | 1:00 | Peripheral = GATT **Server**, Central = GATT **Client**. The toy "serves", the laptop "requests". |
| 7 | **Channels & hopping** | 1:00 | 40 channels; 37/38/39 for advertising, placed to dodge Wi-Fi. Hopping across 37 data channels — interference costs 1/37 of packets. Why the sniffer must catch `CONNECT_IND`. |
| 8 | **Security: pairing** | 1:00 | Pairing vs bonding vs encryption. Association models. Legacy vs LE Secure Connections, `crackle`. |
| 9 | **Just Works vs no pairing** | 1:00 | The side-by-side table. Both end in "anyone in range can control it". Encryption ≠ access control. |
| 10 | **Sniffing + SNIFFER LOG** | 1:30 | How to capture (HCI snoop / nRF52840). **Wireshark screenshot** (`btatt`) with the payload highlighted: "this is what the app sends when I change speed". Optionally proof of Just Works / no pairing. |
| 11 | **LEGO Powered Up / LWP3 + PACKET DECODE** | 1:30 | Hub = Peripheral, LWP3 (public LEGO docs), single characteristic `1624`. **Decode** `08 00 81 00 11 51 00 00` byte by byte + side-by-side `...51 00 00` (stop) vs `...51 00 64` (full) — "one byte changes". Credit the community. |
| 12 | **Demo: control** | 1:30 | **VIDEO / live** of the running train: motor speed + lights from your own Node code. Side-by-side "what I click" vs "what goes over BLE". |
| 13 | **What's next** | 1:00 | Undiscovered features, camera + obstacle detection idea, sensors. "This is where I'm still stuck" — an authentic moment. |
| 14 | **Takeaway** | 0:30 | "The BLE stack around you is more open than the app pretends." Security = a business decision, not a technical limit. |
| 15 | **Thanks + links + Q&A** | 0:30 | Code repo, links, contact. |

### Demo tips

- **Have a recorded video as backup** — a conference room is a crowded 2.4 GHz environment (hundreds of phones), and BLE discovery is the most fragile phase since advertising channels cannot adapt.
- Showing **Wireshark live** while changing speed is a strong "theory meets practice in real time" moment.
- Consider a **live dashboard** (simple HTML/JS) with current speed, light state and a hex dump of BLE packets — cheap visual impact, no extra hardware.
- Calibrate everything **under stage lighting** if the demo depends on a camera.

---

## 14. Bonus: camera-based obstacle detection

> A "future work" section — for the *What's next* slide. Nothing urgent. Sketch of an example solution: **webcam + macOS + tagging the train**.

### Why not streaming (GoPro over Wi-Fi)

Streaming over Wi-Fi introduces 2–3 s of latency — far too much for a train approaching an obstacle. The video must be processed **locally**, with no network round trip. Hence:

- **Camera above the track, stationary** (bird's eye) — not on the train (no weight, battery or vibration problems).
- **A plain USB webcam into the laptop** — zero network latency, and the whole pipeline (camera → CV → decision → BLE) lives in one Node process on the Mac.
- A GoPro in "GoPro Webcam" mode (USB) would also work, but it has a fisheye lens and a focus profile built for action — for a small track at close range a plain webcam is simpler and better.

### The core problem: the train itself creates motion

If the train runs on a loop, a naive *frame diff* over the whole track will flag **the train** as an obstacle — it is also a pixel change. The fix: **tag the train** and ignore motion where the train currently is.

- **Simple variant:** a bright, unique colour on the roof → in OpenCV convert to **HSV**, `inRange()` (colour threshold), `findContours()` + centroid = train position.
- **More "technical" variant:** an **ArUco** marker (`cv.aruco`) — gives position **and** orientation, robust to lighting, and looks great on a slide (bounding box + axes drawn on the camera feed).

### Long train — two tags

If the train is ~30 cm long and the tag is at the front, the rear falls outside the exclusion zone and triggers a false alarm. The fix: **two markers (front + rear)**, with the exclusion zone being a **corridor connecting both points** (interpolation). It also works on curves, since both tags move with the train. Good "iteration story" for the talk: *"the first version with one tag ignored the train's length — so I added a second."*

### Logic (pseudo-code)

```
for each frame:
    train_position = find_tags(frame)          // HSV/centroid or ArUco (front + rear)
    corridor = capsule_between(tag_front, tag_rear)  // exclusion zone

    motion = frame_diff(previous_frame, frame)
    motion_outside_train = motion AND NOT corridor

    if sum(motion_outside_train) > threshold:
        send_BLE_command("stop")               // Port Output Command, last byte = 0x00
```

### Tech stack (Node.js on a Mac)

- **Frame capture + CV:** [`opencv4nodejs`](https://github.com/UrielCh/opencv4nodejs) (real `VideoCapture`, ~30 FPS with a C270). **Avoid `node-webcam`** — it shells out to `imagesnap` per frame, realistically ~1–3 FPS, too slow for tracking.
- **BLE:** your existing `node-poweredup` / `noble`.
- **IR sensor as backup/confirmation** (optional): Arduino + IR sensor → USB Serial → the [`serialport`](https://github.com/serialport/node-serialport) library in Node. A USB cable is the lowest-risk option on stage (no Wi-Fi in a crowded room).

### Practical notes

- Installing `opencv4nodejs` on a Mac (especially Apple Silicon) can be fiddly (native compilation, `brew install opencv`) — **do this first**, before writing any logic. Plan B: a small Python + OpenCV server on `localhost`, talking to Node over WebSocket.
- **Calibrate the detection threshold under stage lighting** — conference lights differ from your desk.
- "Mediocre webcam quality" is usually a **focus/lighting** problem, not resolution — 720p is plenty; add a lamp and set focus for your actual working distance.

---

## 15. Useful links

### BLE specification and theory
- Bluetooth SIG — assigned numbers / company identifiers: https://www.bluetooth.com/specifications/assigned-numbers/
- Nordic — nRF Sniffer for Bluetooth LE: https://www.nordicsemi.com/Products/Development-tools/nRF-Sniffer-for-Bluetooth-LE
- BLE channels & frequencies explained: https://www.electronics-notes.com/articles/connectivity/bluetooth/bluetooth-low-energy-le-frequency-channels.php

### LEGO Powered Up / protocol
- **Official LWP3 protocol documentation (LEGO):** https://github.com/LEGO/lego-ble-wireless-protocol-docs
- **LWP3 — browsable version (handy for the Port Output Command section):** https://lego.github.io/lego-ble-wireless-protocol-docs/
- **node-poweredup (JS, for control):** https://github.com/nathankellenicki/node-poweredup
- node-poweredup on npm: https://www.npmjs.com/package/node-poweredup
- node-poweredup full documentation: https://nathankellenicki.github.io/node-poweredup/
- **Pybricks (MicroPython on the hub):** https://pybricks.com/
- Pybricks — documentation: https://docs.pybricks.com/
- Pybricks — technical-info (protocols, Wireshark plugins): https://github.com/pybricks/technical-info
- pylgbst (Python): https://github.com/undera/pylgbst
- BOOSTreveng (original reverse engineering): https://github.com/JorgePe/BOOSTreveng

### Companion document
- **`ble_faq_pl.md`** — follow-up Q&A (in Polish): sniffer configuration, `CONNECT_IND` timing, sniffing third-party connections, channel selection algorithms in detail, Bluetooth Classic hopping, and sniffing a Mi Band.

### Tools
- Wireshark: https://www.wireshark.org/
- Btlejack (recovering existing connections): https://github.com/virtualabs/btlejack
- Gadgetbridge (open-source wearable protocols): https://gadgetbridge.org/
- crackle (cracking Legacy Pairing): https://github.com/mikeryan/crackle
- bleak (Python BLE): https://github.com/hbldh/bleak
- noble (Node.js BLE): https://github.com/abandonware/noble

---

*Good luck on stage! 🚂*
