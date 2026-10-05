# slides — *How I hacked my son's LEGO Duplo train*

A [Slidev](https://sli.dev) deck for the talk, styled to match the Allegro Tech
Meeting #19 template supplied by the organiser
(`Allegro_Prezentacja atm_19_video_20_08.pptx`).
The published deck uses dark surfaces throughout to keep transitions comfortable
in a dim presentation room.

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
| `npm run study-guide` | Phone-friendly PDF with each slide and its speaker notes |

## Cloudflare Pages

The `Deploy slides to Cloudflare Pages` workflow builds and publishes the deck
after changes are merged into `master`. It can also be started manually from
the repository's **Actions** tab with **Run workflow**.

Before the first deployment:

1. Create an empty Direct Upload Pages project from the repository root using
   Wrangler (no manual file upload is required):
   ```bash
   npx wrangler login
   npx wrangler pages project create duplo-train --production-branch master
   ```
2. Create a Cloudflare API token with the **Account → Cloudflare Pages → Edit**
   permission and copy the Cloudflare account ID.
3. In the GitHub repository, open **Settings → Secrets and variables →
   Actions** and add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as
   repository secrets.

Do not connect Cloudflare's Git integration: GitHub Actions builds and uploads
the presentation to this Direct Upload project. After the workflow completes,
its deployment log and the Cloudflare dashboard show the public `pages.dev`
address.

Presenter view with the speaker notes (English) is at
[localhost:3030/presenter](http://localhost:3030/presenter); the grid of all
slides is at [/overview](http://localhost:3030/overview). `f` fullscreen,
`o` overview, `d` dark/light, `g` go-to-slide.

`npm run export` needs a Chromium — this repo already pins
`playwright-chromium`, so `npx playwright install chromium` once is enough if it
is missing.

`npm run study-guide` creates `dist/duplo-train-study-guide.pdf`. Each slide
starts on a portrait A4 page with a large preview and its speaker notes below,
so the file can be used as a rehearsal handout on a phone without PowerPoint.

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

**Type** — content slides follow the organiser's template: Open Sans Bold
titles and Open Sans Light body copy. The opening cover instead follows the
speaker-board PDF, using Inter Thin for the headline and lighter Inter weights
for the speaker details. The deck also uses JetBrains Mono for code and Noto
Color Emoji so `🚂` survives PDF export (headless Chromium has no system emoji
font). WOFF2 files are bundled under `styles/fonts/` and declared in
`styles/fonts.css`; Slidev's Google Fonts provider is disabled, so running or
building the deck does not fetch fonts from the network. SIL Open Font License
notices are in `styles/fonts/licenses/`.

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

**Artwork** — `public/atm/` holds the template's own images. The cover
uses `cover-background.png`, a lossless render of the organiser's speaker-board
PDF with the text removed. Its original orange treatment, soft photo fade,
logo and circuit artwork stay intact; the heading and speaker details are still
editable text in `slides.md`. Other full-slide backgrounds were re-encoded as
JPEG at 1920px (they carry no alpha); the line-art decorations stay PNG.

Three extracted decorations that are not used by the current deck were moved to
`cleanup-candidates/atm/` for later review.

## Layouts

Each one mirrors a specific layout in the template.

| Layout | Template origin | Use it for |
|---|---|---|
| `atm-cover` | `slideLayout2` + slide 2 | The opening slide |
| `atm-photo` | custom photo layout | Full-bleed product or object photo |
| `image` | built-in Slidev layout | Full-screen artwork; pass `image: /shots/ble-iceberg.png` |
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
- `hideProgress` — `true` hides the train progress footer for full-screen artwork

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
| `<Shot label="…" hint="…" ratio="16/10">` | A picture, or a dashed placeholder until the file exists |
| `<AnnotatedScreenshot src="…" :annotations="[…]" mode="accumulate">` | Screenshot with click-revealed annotations; each annotation defines a label, `[left, top, width, height]` as image percentages, title, optional code value, and description. Use `mode="focus"` to show only the current annotation. |

Handy CSS classes: `.atm-lead` (32pt standfirst), `.atm-sub` (24pt subtitle),
`.atm-caption` (14pt), `.atm-foot` (footnote band), `.atm-kicker` (letterspaced
orange eyebrow), `.atm-frame` (thin photo frame), `.atm-pin` / `.atm-pin__label`
(connector-hung label).

## How the deck is put together

Slides carry keywords and schematics only — the detail lives in the speaker
notes (English, one block per slide, with timing cues). If a slide feels like it
needs another bullet, the sentence probably belongs in its notes instead.

Every photo and screenshot is a `<Shot>`: until the real file exists it renders
as a dashed placeholder naming the file it wants. See
[`public/shots/README.md`](public/shots/README.md) for the list.

`transition: fade` is deliberate — the deck alternates full-bleed dark artwork
with white slides, and a horizontal slide makes those swaps lurch.

## Before you present

- **Drop the remaining pictures and captures into `public/shots/`**. The
  placeholder disappears when the matching `<Shot>` gets a real `src`.
- Add the official-app GATT screenshots, the Wireshark screenshots, and the
  final web-panel image before presenting.
- Keep the recorded demos in `public/videos/` as fallbacks. A conference room
  is crowded 2.4 GHz, and BLE discovery is the fragile part of a live demo.
- Keep full-resolution source videos in `original-videos/`, outside the
  presentation bundle; large originals may need separate storage rather than
  Git.
