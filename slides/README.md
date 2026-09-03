# slides — *How I hacked my son's LEGO Duplo train*

A [Slidev](https://sli.dev) deck for the talk, styled to match the Allegro Tech
Meeting #19 template supplied by the organiser
(`Allegro_Prezentacja atm_19_video_20_08.pptx`).

```bash
npm install --prefix slides
npm run dev --prefix slides      # http://localhost:3030
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run open` | Same, and opens a browser |
| `npm run build` | Static bundle in `dist/` (deployable anywhere) |
| `npm run export` | `dist/duplo-train.pdf` |
| `npm run export:png` | One PNG per slide in `dist/png/` |
| `npm run notes` | Speaker notes as a PDF |

Presenter view with the Polish notes is at
[localhost:3030/presenter](http://localhost:3030/presenter); the grid of all
slides is at [/overview](http://localhost:3030/overview). `f` fullscreen,
`o` overview, `d` dark/light, `g` go-to-slide.

`npm run export` needs a Chromium — this repo already pins
`playwright-chromium`, so `npx playwright install chromium` once is enough if it
is missing.

## Where the styling comes from

Nothing here is invented: the palette, type scale, geometry and artwork were all
read out of the organiser's `.pptx` (which is a ZIP of XML).

**Palette** — the only colours the template's slides actually use:

| Token | Value | Where it came from |
|---|---|---|
| `--atm-orange` | `#ff5a00` | The primary brand orange, 41 uses across the template's slides |
| `--atm-orange-2` | `#ff6e00` | Its lighter partner, 36 uses |
| `--atm-navy` | `#21364f` | Outline on the numbered cards |
| `--atm-void` | `#051018` | The one solid dark background (`slideLayout12`) |
| `--atm-panel` | `#000` @ 74.9% | The inset panel on dark slides (`dk1` at `alpha="74902"`) |

**Type** — the template embeds Open Sans and Open Sans Light. Titles are Open
Sans Bold, uppercase, tight leading, and never underlined. Body copy is Open
Sans Light (weight 300). Both are pulled from Google Fonts, plus Noto Color
Emoji so `🚂` survives PDF export (headless Chromium has no system emoji font).

**Geometry** — the template canvas is 20104100 × 11309350 EMU
(21.98in × 12.36in, 890.5pt tall). This deck's canvas is 1280 × 720, the same
ratio, so template points map to whole pixels at `720 / 890.5 = 0.8085`:

| Element | Template | Here |
|---|---|---|
| Left gutter | 10.6% | `--atm-gutter` |
| Title top | 26.4% (21.7% when dense) | `190px` / `156px` |
| Title box height | 14.4% | `104px` |
| Body top | 42.9% (38.2% when dense) | falls out of the two above `+ 15px` |
| Footnote band | 82%–94% | `.atm-foot`, anchored to the content box's bottom |
| Title / body / caption | 50pt / 24pt / 14pt | `40px` / `19px` / `11px` |

Every number lives in [`styles/tokens.css`](styles/tokens.css) with the original
value in a comment, so it stays checkable against the source file.

**Artwork** — `public/atm/` holds the template's own images. Full-slide
backgrounds were re-encoded as JPEG at 1920px (they carry no alpha); the line-art
decorations stay PNG with transparency. 1.2 MB in total, down from 5.2 MB raw.

Three pieces are extracted but not yet placed on a slide, in case you want them:
`deco-binary.png` (scattered binary text), `deco-grid.png` (a fading square grid)
and `deco-ring-binary.png` (the ring with binary annotations). Drop any of them in
with `<Deco src="deco-grid" :x="35" :y="48" :w="15" />`.

## Layouts

Each one mirrors a specific layout in the template.

| Layout | Template origin | Use it for |
|---|---|---|
| `atm-cover` | `slideLayout2` + slide 2 | The opening slide |
| `atm-section` | `slideLayout4` + slide 12 | Section dividers; pass `number: '01'` |
| `atm-cards` | slide 11 | A row of numbered orange cards; cards go in `::cards::` |
| `atm-statement` | slide 3 | One sentence, no furniture; `align: center` to centre it |
| `atm-dark` | `slideLayout5` / `slideLayout6` | Standard content on a dark ground |
| `atm-light` | `slideLayout8` / `9` / `13` | Standard content on white |
| `atm-split` | slides 5 / 15 / 16 | Two columns; right column after `::right::` |
| `atm-end` | slide 23 | The closing slide |

Shared frontmatter knobs:

- `bg` — `soft` · `bokeh` · `orb` · `orb-hand` · `void` (dark layouts)
- `panel` — `true` or `'soft'`: the inset semi-transparent panel
- `dense` — lifts the title from 26.4% to 21.7% for a fuller slide
- `deco` — which decoration set to place: `connector` · `corner` · `chip` ·
  `squares` · `ring` · `hand` · `none`
- `surface` — `dark` or `light` (`atm-split` only)
- `ratio` — CSS `grid-template-columns` for the split, e.g. `'1.2fr 1fr'`

The ATM 19 lockup only appears on the cover, section dividers, statements and
the closing slide — the template does the same, and it keeps the logo from
landing on top of the bottom-right decorations.

## Components

| Component | What it is |
|---|---|
| `<NumCard num="01" title="…">` | Numeral, connector, solid-orange card |
| `<PanelCard title="…" accent>` | Outlined panel for side-by-side comparisons |
| `<Note quiet>` | Tinted callout strip |
| `<PacketBytes :bytes="[['08','length'],…]" :hot="[7]">` | A frame as labelled byte boxes |
| `<Connector width="140px" flipX>` | The template's signature dot-line-dot, as SVG |
| `<Deco src="deco-chip" :x="76" :y="74.3" :w="21.7">` | Any decoration, placed by % of canvas |
| `<AtmLogo variant="orange">` | The lockup, bottom-right |

Handy CSS classes: `.atm-lead` (32pt standfirst), `.atm-sub` (24pt subtitle),
`.atm-caption` (14pt), `.atm-foot` (footnote band), `.atm-kicker` (letterspaced
orange eyebrow), `.atm-frame` (thin photo frame), `.atm-pin` / `.atm-pin__label`
(connector-hung label).

## Two deliberate departures from the outline

- **`transition: fade`** instead of `slide-left`. The deck alternates full-bleed
  dark artwork with white slides, and a horizontal slide makes those swaps lurch.
  Change the `transition:` line in `slides.md` if you disagree.
- **Two slides added**: an agenda on the numbered-card layout (which the template
  clearly wants used), and a third section divider before the protocol section so
  each of the four agenda items gets one. Both carry their own Polish notes.

## Before you present

- **Replace `snippets/wireshark-capture.txt`** with a few lines from your own
  capture — the "Sniffing the traffic" slide reads it straight off disk.
- **Fill in the repo link** on the closing slide (`<your repo link>`).
- **Record the demo.** The notes say it and it's worth repeating: a conference
  room is crowded 2.4 GHz, and BLE will pick the worst possible moment.
- Speaker notes are in Polish, one block per slide, and carry the timing cues.
