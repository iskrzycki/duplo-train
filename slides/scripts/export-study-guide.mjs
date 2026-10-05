import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import MarkdownIt from 'markdown-it'
import { chromium } from 'playwright-chromium'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const slidesDir = resolve(scriptDir, '..')
const outputFile = resolve(slidesDir, process.argv[2] || 'dist/duplo-train-study-guide.pdf')
const slidevCli = resolve(slidesDir, 'node_modules/@slidev/cli/bin/slidev.mjs')

const markdown = new MarkdownIt({
  breaks: true,
  html: true,
  linkify: true,
})

const temporaryDir = await mkdtemp(resolve(tmpdir(), 'duplo-train-study-guide-'))
const markdownOutput = resolve(temporaryDir, 'slides')
const markdownFile = `${markdownOutput}.md`

let browser

try {
  await run(process.execPath, [
    slidevCli,
    'export',
    'slides.md',
    '--per-slide',
    '--format',
    'md',
    '--output',
    markdownOutput,
  ])

  const slides = await readExportedSlides(markdownFile, temporaryDir)
  if (slides.length === 0)
    throw new Error('Slidev did not export any slides')

  const html = buildStudyGuide(slides)
  const htmlFile = resolve(temporaryDir, 'study-guide.html')
  await writeFile(htmlFile, html)
  await mkdir(dirname(outputFile), { recursive: true })

  browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`file://${htmlFile}`, { waitUntil: 'load' })
  await page.emulateMedia({ media: 'screen' })
  await page.pdf({
    path: outputFile,
    format: 'A4',
    margin: {
      top: '12mm',
      right: '12mm',
      bottom: '12mm',
      left: '12mm',
    },
    printBackground: true,
    preferCSSPageSize: true,
  })

  console.log(`\nStudy guide exported to ${outputFile}`)
}
finally {
  await browser?.close()
  await rm(temporaryDir, { force: true, recursive: true })
}

async function run(command, args) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: slidesDir,
      stdio: 'inherit',
    })

    child.on('error', rejectPromise)
    child.on('exit', (code, signal) => {
      if (code === 0)
        resolvePromise()
      else
        rejectPromise(new Error(`Slidev export failed (${signal || `exit code ${code}`})`))
    })
  })
}

async function readExportedSlides(sourceFile, imagesDir) {
  const source = await readFile(sourceFile, 'utf8')
  const sections = source.split(/\n---\n/g)
  const slides = []

  for (const section of sections) {
    const [imageLine, ...noteLines] = section.trim().split('\n')
    const imageMatch = imageLine.match(/^!\[(.*)]\(\.\/(.+)\)$/)
    if (!imageMatch)
      continue

    const [, title, imageName] = imageMatch
    const image = await readFile(resolve(imagesDir, imageName))
    slides.push({
      imageUrl: `data:image/png;base64,${image.toString('base64')}`,
      noteHtml: markdown.render(noteLines.join('\n').trim()),
      title,
    })
  }

  return slides
}

function buildStudyGuide(slides) {
  const sections = slides.map((slide, index) => {
    const noteHtml = slide.noteHtml || '<p class="empty-note">No speaker notes for this slide.</p>'
    const exportedTitle = slide.title.trim()
    const title = /^\d+$/.test(exportedTitle) ? '' : escapeHtml(exportedTitle)
    const titleHtml = title ? `<strong>${title}</strong>` : ''

    return `
      <article class="study-slide">
        <header>
          <span>Slide ${index + 1} / ${slides.length}</span>
          ${titleHtml}
        </header>
        <img class="slide-preview" src="${slide.imageUrl}" alt="${title || `Slide ${index + 1}`}">
        <section class="notes">
          ${noteHtml}
        </section>
      </article>
    `
  }).join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>How I hacked my son's LEGO Duplo train — study guide</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm;
    }

    * {
      box-sizing: border-box;
    }

    html {
      color: #17202a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      -webkit-print-color-adjust: exact;
    }

    body {
      margin: 0;
    }

    .study-slide {
      break-after: page;
      page-break-after: always;
    }

    .study-slide:last-child {
      break-after: auto;
      page-break-after: auto;
    }

    header {
      align-items: baseline;
      display: flex;
      font-size: 10pt;
      gap: 8mm;
      justify-content: space-between;
      margin-bottom: 3mm;
    }

    header span {
      color: #68737d;
      flex: none;
    }

    header strong {
      overflow: hidden;
      text-align: right;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .slide-preview {
      background: #051018;
      border: 0.25mm solid #d8dde2;
      display: block;
      height: auto;
      width: 100%;
    }

    .notes {
      font-size: 12pt;
      line-height: 1.42;
      margin-top: 5mm;
    }

    .notes > :first-child {
      margin-top: 0;
    }

    .notes > :last-child {
      margin-bottom: 0;
    }

    .notes p,
    .notes ul,
    .notes ol,
    .notes pre {
      margin: 0 0 2.5mm;
    }

    .notes ul,
    .notes ol {
      padding-left: 7mm;
    }

    .notes li {
      margin: 0 0 1.2mm;
    }

    .notes code {
      background: #edf0f2;
      border-radius: 1mm;
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 0.9em;
      padding: 0.2mm 0.8mm;
    }

    .notes pre {
      background: #edf0f2;
      border-radius: 1.5mm;
      overflow-wrap: anywhere;
      padding: 3mm;
      white-space: pre-wrap;
    }

    .notes pre code {
      background: transparent;
      padding: 0;
    }

    .empty-note {
      color: #8a939b;
      font-style: italic;
    }
  </style>
</head>
<body>
  ${sections}
</body>
</html>`
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
