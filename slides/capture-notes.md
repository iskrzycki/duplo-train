# LEGO DUPLO Train BLE Capture Notes

This note documents the capture used for the BLE and LWP3 slides.

Capture file in this repository:

```text
slides/public/captured-packets.pcapng
```

It is the same 320,904-byte capture as the original working file:

```text
/Users/rafal/Documents/lego-app-udane-capture copy.txt
```

The `.txt` suffix is misleading: the file is a PCAPNG capture recorded with the
Nordic nRF Sniffer for Bluetooth LE. The repository copy contains 3,910 packets.

## Capture At A Glance

- Target: LEGO DUPLO Train Base.
- Train advertising address: `ec:9a:34:ac:d1:84`.
- LEGO company identifier: `0x0397` (`LEGO System A/S`).
- Advertising manufacturer data includes `00 20 02 fe 41 00`, identifying the DUPLO Train Base in this capture (`00` is the button-state byte before the system/device byte).
- LEGO Hub Service UUID: `00001623-1212-efde-1623-785feabcd123`.
- LEGO Hub Characteristic UUID: `00001624-1212-efde-1623-785feabcd123`.
- Advertising access address: `0x8e89bed6` (the standard BLE advertising access address).
- Data-channel access address from `CONNECT_IND`: `0x50655b55`.
- ATT traffic uses handle `0x000b` for the LEGO characteristic in this GATT database.
- ATT handle `0x000c` is the CCCD for that characteristic in this capture.
- The connection is shown as unencrypted: `Encrypted: No`.
- The capture contains motor and LED writes plus a battery notification.
- It does **not** contain color or speed value notifications. Do not present it as proof that the official app streamed those sensors in this session.

The handles are local to this GATT database. The UUIDs and LWP3 message types are
portable concepts; `0x000b` and `0x000c` should not be treated as universal
handles for every LEGO hub or every connection.

## How To Read A Packet

There are several nested protocols in a Wireshark row. Read them from outside to
inside:

```text
BLE Link Layer
  +-- LL Data / LL Control packet
       +-- L2CAP
            +-- ATT
                 +-- GATT characteristic value
                      +-- LEGO Wireless Protocol 3 (LWP3) message
```

For the application messages in this capture:

1. Find the BLE connection with `btle.access_address == 0x50655b55`.
2. Identify the ATT operation.
   - `0x12` is an ATT Write Request in the capture's decoded traffic.
   - `0x1b` is an ATT Handle Value Notification.
3. Check the ATT handle.
   - `0x000b` is the LEGO Hub Characteristic value.
   - `0x000c` is its CCCD.
4. For a packet on handle `0x000b`, ignore the ATT/L2CAP wrapper and decode the
   characteristic value as LWP3. Every short LWP3 message starts with:

   ```text
   [length] [hub id] [message type] ...
   ```

5. Use the LWP3 message type and, for port messages, the port ID and mode to give
   the payload a device-specific meaning.

Useful Wireshark filters:

```text
# Everything after the BLE connection was established
btle.access_address == 0x50655b55

# ATT writes in this session
btle.access_address == 0x50655b55 && btatt.opcode == 0x12

# ATT notifications in this session
btle.access_address == 0x50655b55 && btatt.opcode == 0x1b

# LEGO characteristic traffic
btatt.handle == 0x000b

# Enable/disable-notification descriptor in this capture
btatt.handle == 0x000c
```

The exact Wireshark display text can vary slightly with the Wireshark version and
BLE dissector settings. The frame number and raw bytes are the stable references
for this note.

## Frame Index

The following are the most useful frames for the presentation, in recommended
order.

| Frame | Layer / payload | Interpretation | Why show it |
|---:|---|---|---|
| 3230 | BLE advertisement | The train advertises its name, LEGO manufacturer data, service UUID and DUPLO identifier. | Establishes that the toy is discoverable before any connection exists. |
| 3234 | BLE scan response | The train returns the local name `Train Base` and connection interval range `20-40 ms`. | Cleaner name-focused discovery screenshot; pair it with frame `3230`. |
| 3255 | BLE Link Layer `CONNECT_IND` | The central accepts the train's advertisement and supplies the parameters needed to follow the new connection. | Best frame for explaining how an nRF sniffer moves from advertising channels to the hopping data connection. |
| 3256 | BLE Link Layer `LL_VERSION_IND` | The central reports Link Layer version 5.3; the packet is unencrypted. | Optional: shows that the BLE controller negotiates link capabilities after `CONNECT_IND`, before GATT. |
| 3258 | BLE Link Layer `LL_FEATURE_REQ` | The central advertises support for encryption, data-length extension, privacy and other BLE features. | Optional security context: hardware may support encryption even though this session does not use it. |
| 3260 | ATT Exchange MTU Request | The central advertises an ATT receive MTU of `0x00b9` = 185 bytes. | Optional low-level context: GATT negotiation determines how much ATT payload can fit in one exchange. |
| 3262 | ATT Read By Type Request | The central reads the characteristic declaration at handle `0x0008` to discover its properties and value handle. | Good GATT discovery context before the CCCD write. |
| 3264 | ATT Write Request to handle `0x000c` | `01 00` enables GATT notifications through the CCCD. | Connects GATT terminology to an actual packet: the app first asks the train to send updates. |
| 3269 | ATT Write Response | The train acknowledges the CCCD write to handle `0x000c`. | Optional: makes the GATT setup visibly request/response rather than a one-way magic write. |
| 3271 | ATT Notification, LWP3 `0x43` | Port Information for port `0x00`, part of device discovery. | Shows that the app learns what the built-in ports can do before issuing commands. |
| 3287 | ATT Notification, LWP3 `0x44` | Port Mode Information for port `0x00`, including the mode name text `T MOT`. | Optional: demonstrates that LWP3 describes device modes, not just opaque values. |
| 3589 | ATT Write Request, LWP3 `0x41` | Configures port `0x11`, mode `0x00`; the final `00` leaves port notifications disabled. | Useful negative evidence: GATT notifications are enabled globally, but this port is not configured to stream values. |
| 3591 | ATT Write Request, LWP3 `0x81` | Write color `0x0a` to port `0x11`: the built-in LED is set to white. | Best non-motor command; proves the same LWP3 structure controls another device. |
| 3617 | ATT Write Request, LWP3 `0x41` | Configures motor port `0x00`, mode `0x00`; the final `00` leaves port notifications disabled. | Shows the setup immediately before the motor command and explains why no sensor-value stream follows. |
| 3619 | ATT Write Request, LWP3 `0x81` | Motor port `0x00`, mode `0x00`, signed power `0x45` = `+69`. | Best frame for the main slide: one short GATT write makes the train move. |
| 3656 | ATT Write Request, LWP3 `0x81` | Motor port `0x00`, mode `0x00`, signed power `0xbb` = `-69`. | Excellent companion frame: one byte changes the direction. |
| 3689 | ATT Notification, LWP3 `0x82` | Output command feedback for port `0x11`; `0x0a` means idle (`0x08`) plus command completed (`0x02`). | Optional evidence that the train acknowledges an output command. |
| 3821 | ATT Notification, LWP3 `0x01` | Hub Properties update: property `0x06` (battery voltage), operation `0x06` (update), value `0x54` = `84%`. | Best return-path frame: the application writes commands, while the train notifies state back. |

Frame `3234` is an alternative discovery frame containing the complete local
name `Train Base`. It is useful when the slide needs a readable name rather than
the manufacturer-data decoding in frame `3230`.

Frames `3710` and `3724` are additional LED writes (`0x07` and `0x00`) if a
second LED example is useful. Frames `3759` and `3797` are output feedback for
other ports. They are less useful than frame `3591` because white is visually
easy to explain and the motor pair tells a stronger story.

## The BLE Connection: Frame 3255

Frame `3255` is the single most important low-level frame in the capture:

```text
CONNECT_IND
Advertising access address:  0x8e89bed6 (outer advertising-link context)
Initiator Address:   63:98:dc:da:a4:46
Advertising Address:  ec:9a:34:ac:d1:84
Data Access Address:  0x50655b55
CRC Init:             0x5dab57
Window Size:          3 (3.75 ms)
Window Offset:        6 (7.5 ms)
Connection Interval:  30 ms
Peripheral Latency:   0
Supervision Timeout:  720 ms
Channel Map:          1fef000000
Hop Increment:        1 (as decoded by Wireshark for this capture)
```

The `CONNECT_IND` PDU itself is carried under the standard advertising access
address `0x8e89bed6`. Its payload assigns the new data-channel access address
`0x50655b55`; that is the value used by the later ATT packets. This distinction
explains why the session filter below finds the data traffic but not frame `3255`:

```text
frame.number == 3255
btle.access_address == 0x8e89bed6
```

The second expression is for packets after the connection request. The first is
the reliable way to select the `CONNECT_IND` itself.

The nRF Sniffer must see this one-time connection request to follow the link
after the train leaves the advertising channels. The packet provides the access
address and channel-hopping parameters used by the subsequent data packets.

The packet header also shows `TxAdd: Random` for the initiator and `RxAdd:
Public` for the train. The train's public advertising address is therefore
visible before and during connection setup.

This is **not** the pairing protocol. `CONNECT_IND` establishes a BLE link; it
does not by itself prove that keys were negotiated. In this capture, Wireshark
shows `Encrypted: No`, and the session does not show an SMP pairing exchange.
That combination supports the presentation claim that this connection was open
and unencrypted, rather than the stronger and less precise claim that
`CONNECT_IND` means "no security".

Frame `3230` is a useful lead-in. Its advertising payload contains the train
name, the LEGO manufacturer identifier and the DUPLO-specific manufacturer data.
It shows why the app or a script can recognize the target before it connects.

### Advertising: Frame 3230

The advertising payload includes the following manufacturer-specific bytes:

```text
97 03 00 20 02 fe 41 00
```

Read them as:

```text
97 03  LEGO company ID 0x0397, little-endian on the air
00     button state
20     system/device byte: DUPLO Train Base
02     device capabilities
fe     last-network value
41     status byte
00     future/option byte
```

The exact advertising packet also carries the name `Train Base` and the LEGO
service UUID. This is a good frame to show before `CONNECT_IND`: discovery is
already public and readable before GATT or LWP3 traffic begins.

Frame `3234` is the optional, cleaner name-advertisement example. It contains the
complete local name `Train Base` in the scan response. Use frame `3230` when the
slide should emphasize manufacturer data and service discovery; use frame `3234`
when the slide should emphasize the human-readable device name.

Reference:

- [LEGO Advertising](https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#advertising)

### ATT MTU Exchange: Frame 3260

The ATT payload in frame `3260` is:

```text
02 b9 00
```

`0x02` is an ATT Exchange MTU Request and `b9 00` is the central's requested
receive MTU, 185 bytes in little-endian form. This is not an LWP3 message. It is
BLE transport setup that affects how large an ATT/GATT exchange can be before
fragmentation or additional transport handling is needed.

## GATT And The LEGO Pipe

LEGO's Powered UP hubs expose one vendor-specific service and one characteristic:

```text
Service:        00001623-1212-efde-1623-785feabcd123
Characteristic: 00001624-1212-efde-1623-785feabcd123
Properties:     Write Without Response, Notify
```

The single `1624` characteristic is the GATT transport pipe. The application
protocol is not encoded in the UUID or the ATT opcode; it is inside the
characteristic value as an LWP3 message.

The LWP3 documentation describes the characteristic as supporting Write Without
Response, but the ATT writes visible in this iOS capture use opcode `0x12`, which
is a Write Request. This is consistent with the documentation's note about iOS
write behavior. For this capture, trust the decoded ATT operation and not only
the generic characteristic property description.

The official LEGO documentation describes this design and the common LWP3
header:

- [LEGO Specific GATT Service](https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#lego-specific-gatt-service)
- [Common Message Header](https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#common-message-header)
- [Message Types](https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#message-types)

### Enabling Notifications: Frame 3264

The ATT payload in frame `3264` is:

```text
ATT Write Request
Handle: 0x000c
Value:  01 00
```

`0x000c` is the Client Characteristic Configuration Descriptor (CCCD) for the
LEGO characteristic in this capture. `01 00` enables notifications. This is a
standard GATT operation, not an LWP3 command. It must be distinguished from the
LWP3 `0x41` messages later in the capture: CCCD enables the BLE notification
transport, while `0x41` asks a particular LEGO port to produce input updates.

### Port Discovery: Frames 3271 And 3287

After notification setup, the train sends LWP3 discovery messages on handle
`0x000b`:

```text
Frame 3271, LWP3 value:
0b 00 43 00 01 03 02 02 00 01 00

Frame 3287, LWP3 value:
11 00 44 00 00 00 54 20 4d 4f 54 00 00 00 00 00 00
```

The first byte sequence has message type `0x43` (`Port Information`). The second
has message type `0x44` (`Port Mode Information`) and includes the ASCII text
`T MOT` for the mode name. These messages are useful context, but they are not
the command that drives the train.

The LWP3 references are:

- [Port Information](https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#port-information)
- [Port Mode Information](https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#port-mode-information)

## Motor Command: Frames 3619 And 3656

The two most useful application packets are:

```text
Frame 3619  ATT value: 08 00 81 00 11 51 00 45
Frame 3656  ATT value: 08 00 81 00 11 51 00 bb
```

Decode the common eight-byte LWP3 message as follows:

| Byte | Value | Meaning |
|---:|---:|---|
| 0 | `08` | Total LWP3 message length: 8 bytes. |
| 1 | `00` | Hub ID; unused in this setup. |
| 2 | `81` | `Port Output Command`. |
| 3 | `00` | Port ID `0x00`, the built-in motor on this DUPLO base. |
| 4 | `11` | Startup `0x1` (execute immediately) plus completion `0x1` (request feedback). |
| 5 | `51` | `WriteDirectModeData`. |
| 6 | `00` | Device mode `0x00`, motor power mode. |
| 7 | `45` / `bb` | Signed 8-bit power value. |

Interpret the last byte as signed `int8`:

```text
0x45 =  69 decimal = +69 power
0xbb = 187 unsigned = -69 signed = -69 power
```

Therefore:

- Frame `3619` requests forward power `+69`.
- Frame `3656` requests reverse power `-69`.

This is the strongest slide pairing. The protocol structure is identical and
only the final byte changes the direction. The official specification links are:

- [Port Output Command](https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#port-output-command)
- [WriteDirectModeData](https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#writedirectmodedata)
- [Encoding of `WriteDirectModeData` (`0x81`, `0x51`)](https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#encoding-of-writedirectmodedata-0x81-0x51)

Important scope note: LWP3 defines the command format, but the meaning of port
`0x00` and mode `0x00` comes from this train's attached-device map. Port IDs and
modes can differ on other LEGO hubs.

## LED Command: Frame 3591

Frame `3591` contains:

```text
08 00 81 11 11 51 00 0a
```

The same LWP3 structure now means:

```text
0x81  Port Output Command
0x11  Port 17, the built-in LED on this train
0x11  Execute immediately and request feedback
0x51  WriteDirectModeData
0x00  LED palette-color mode
0x0a  Color value 10, WHITE
```

This is worth showing beside the motor frame:

```text
Motor: 08 00 81 00 11 51 00 45
LED:   08 00 81 11 11 51 00 0a
```

The message type and subcommand stay the same. The port and the final value are
interpreted according to the selected device. That makes the point that the app
is a thin UI over a shared command protocol.

The color names are not defined by the generic `Port Output Command` section of
the LWP3 document; they are part of the DUPLO Train Base device behavior. The
project's `node-poweredup` constants map `0x0a` to `WHITE`.

## Battery Notification: Frame 3821

Frame `3821` is an ATT notification from the train:

```text
ATT Notification
Handle: 0x000b
LWP3 value: 06 00 01 06 06 54
```

Decode the LWP3 value:

| Byte | Value | Meaning |
|---:|---:|---|
| 0 | `06` | Total message length: 6 bytes. |
| 1 | `00` | Hub ID. |
| 2 | `01` | `Hub Properties`. |
| 3 | `06` | Property `0x06`: Battery Voltage `[%]`. |
| 4 | `06` | Operation `0x06`: Update. |
| 5 | `54` | Battery value: `0x54` = `84` decimal = 84%. |

The relevant LWP3 documentation is:

- [Hub Properties](https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#hub-properties)
- [Hub Property Reference](https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#hub-property-reference)
- [Hub Property Operation](https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#hub-property-operation)
- [Hub Property Payload](https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#hub-property-payload)

This makes a good second example because it is a notification in the opposite
direction from the motor write:

```text
App -> train: ATT Write, LWP3 0x81, motor power
Train -> app: ATT Notification, LWP3 0x01, battery update
```

The GATT characteristic is the same pipe in both directions; the LWP3 message
type tells us whether the value is a hub property, port command, sensor value,
or another protocol message.

## Other Relevant Frames

### `0x41`: Port Input Format Setup

Frames `3589` and `3617` are writes with LWP3 message type `0x41`:

```text
Frame 3589: 0a 00 41 11 00 01 00 00 00 00
Frame 3617: 0a 00 41 00 00 01 00 00 00 00
```

`0x41` is `Port Input Format Setup (Single)`. It configures a port to send
single-mode input updates. In these two values, the mode is the byte after the
port (`0x00`), the following four bytes are the delta interval
(`0x00000001`), and the final `0x00` disables updates. The LWP3 section
describes the complete field layout; the important slide-level point is that
the app can configure a port without actually enabling a value stream.

This is a useful setup frame for explaining that a GATT notification is not
automatically a sensor stream. The CCCD enables the BLE notification transport;
`0x41` configures an individual LEGO port; its final byte controls whether that
port's value updates are enabled.

Reference:

- [Port Input Format Setup (Single)](https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#port-input-format-setup-single)

### `0x82`: Port Output Command Feedback

Frames `3689`, `3705`, `3719`, `3733`, `3759` and `3797` are notifications with
LWP3 message type `0x82`:

```text
05 00 82 11 0a
```

`0x82` is `Port Output Command Feedback`. The port byte identifies the command's
target and the final status byte reports the command state. In frame `3689`,
`0x0a` combines `0x08` (idle) and `0x02` (command completed). This is optional
slide material: it is useful when explaining request/response behavior, but it
is less immediately visual than the motor command itself.

Reference:

- [Port Output Command Feedback](https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#port-output-command-feedback)

### `0x43` And `0x44`: Discovery Messages

The early notification sequence contains `0x43` and `0x44` messages. They are
the hub's responses to port and mode information requests:

- `0x43`: `Port Information`.
- `0x44`: `Port Mode Information`.

These are valuable if the slide explains how a generic library discovers the
train's built-in devices instead of hard-coding every feature. They are not the
best hero frames for a short talk because the payload is more metadata-heavy.

## What Is Not In This Capture

The session contains no confirmed LWP3 `0x45` (`Port Value (Single)`) or `0x46`
(`Port Value (CombinedMode)`) notifications for the color sensor or speedometer.
It also contains no `0x47` (`Port Input Format (Single)`) acknowledgments for
the two captured `0x41` setup writes. Their final `0x00` explicitly disables
port value updates, which is consistent with the absence of sensor streams in
this session.
Therefore:

- Do not use this file to claim that a speed value was captured.
- Do not use this file to claim that a color value was captured.
- The battery notification is real and can be shown as the return-path example.
- A new capture is needed if the slides should show live color or speed sensor data.

The LWP3 references are:

- [Port Value (Single)](https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#port-value-single)
- [Port Value (CombinedMode)](https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#port-value-combinedmode)

## Recommended Slide Set

For a concise story, use four frames/slides or four panels:

1. **Discovery and following the link** - frame `3230` advertisement followed by frame `3255` `CONNECT_IND`. Highlight the train address, advertising access address, data access address and hop parameters. The message is: *the sniffer must catch the one-time connection request*.
2. **GATT notification setup** - frame `3264`, ATT handle `0x000c`, value `01 00`. The message is: *GATT gives us a writable/notifiable characteristic; CCCD turns notifications on*.
3. **One byte drives the train** - frames `3619` and `3656`. Decode `0x81`, port `0x00`, `0x51`, mode `0x00`, then compare `0x45` and `0xbb`. The message is: *forward and reverse are the same command with a different signed byte*.
4. **Command plus state** - frame `3591` as the LED comparison, or frame `3821` as the battery notification. The recommended choice is the battery if the goal is to show bidirectional GATT traffic; choose the LED if the goal is to show that one LWP3 format controls multiple devices.

If there is room for only one application-level frame, use frame `3619` and put
the LWP3 documentation next to it. If there is room for two, add frame `3821` to
show the opposite direction. If the talk is specifically about sniffing, add
frame `3255` before both. For a fuller GATT setup sequence, use frames `3262`,
`3264` and `3269` as a compact discovery / CCCD request / CCCD response trio.

## Caveats For The Slides

- Say **BLE link establishment** for `CONNECT_IND`, not pairing.
- Say **no SMP exchange and unencrypted in this capture** rather than claiming that every DUPLO connection is universally unencrypted.
- Treat ATT handles as capture-specific. Use the UUIDs and the LWP3 message types as the durable protocol vocabulary.
- The generic LWP3 documentation defines message structure and message types. The DUPLO-specific port map and color constants come from the train's attach messages and the `node-poweredup` implementation.
- The frame numbers in this note refer to `slides/public/captured-packets.pcapng`. Re-importing or filtering does not renumber frames, but exporting a different capture can.
