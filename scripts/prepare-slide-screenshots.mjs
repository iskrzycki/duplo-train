#!/usr/bin/env node

/**
 * Normalizes screenshots for the Slidev deck without adding an npm dependency.
 * It uses the macOS built-in `sips` command to produce same-sized PNG files.
 */

import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { basename, join, parse, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const DEFAULTS = {
  width: 1600,
  height: 900,
  mode: 'contain',
  background: '101418',
  outputDir: 'slides/public/shots/wireshark',
  overwrite: false,
}

const HELP = `
Prepare Wireshark screenshots for the slides.

Usage:
  node scripts/prepare-slide-screenshots.mjs [options] <image> [image...]

Examples:
  # Safe default: show the entire screenshot on a 1600x900 dark canvas.
  node scripts/prepare-slide-screenshots.mjs ~/Desktop/frame-*.png

  # Store images elsewhere and use a different canvas size/background.
  node scripts/prepare-slide-screenshots.mjs \\
    --output-dir slides/public/shots/wireshark \\
    --width 1920 --height 1080 --background 0d1117 \\
    ~/Desktop/wireshark/*.png

  # Fill the canvas completely. This crops equally from opposing edges.
  node scripts/prepare-slide-screenshots.mjs --mode cover ~/Desktop/frame.png

Options:
  -i, --input <path>       Add an input image (may be repeated).
  -o, --output-dir <path>  Destination directory.
      --width <pixels>     Canvas width. Default: ${DEFAULTS.width}
      --height <pixels>    Canvas height. Default: ${DEFAULTS.height}
      --mode <contain|cover>
                            contain keeps the full image and adds padding
                            (default); cover fills the canvas and may crop it.
      --background <RRGGBB>
                            Padding color, without #. Default:
                            ${DEFAULTS.background}
      --overwrite          Replace existing output files.
  -h, --help               Show this message.

Outputs are PNGs. This script requires macOS because it uses the built-in
"sips" image tool.
`.trim()

function fail(message) {
  console.error(`Error: ${message}`)
  console.error('\nRun with --help to see usage.')
  process.exit(1)
}

function requireValue(args, index, flag) {
  const value = args[index + 1]

  if (!value || value.startsWith('-')) {
    fail(`${flag} needs a value.`)
  }

  return value
}

function parsePositiveInteger(value, flag) {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isSafeInteger(parsed) || parsed < 1 || String(parsed) !== value) {
    fail(`${flag} must be a positive integer.`)
  }

  return parsed
}

function parseArgs(args) {
  const options = { ...DEFAULTS, inputs: [] }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]

    switch (argument) {
      case '-h':
      case '--help':
        console.log(HELP)
        process.exit(0)
      case '-i':
      case '--input':
        options.inputs.push(requireValue(args, index, argument))
        index += 1
        break
      case '-o':
      case '--output-dir':
        options.outputDir = requireValue(args, index, argument)
        index += 1
        break
      case '--width':
        options.width = parsePositiveInteger(requireValue(args, index, argument), argument)
        index += 1
        break
      case '--height':
        options.height = parsePositiveInteger(requireValue(args, index, argument), argument)
        index += 1
        break
      case '--mode':
        options.mode = requireValue(args, index, argument)
        index += 1
        break
      case '--background':
        options.background = requireValue(args, index, argument).replace(/^#/, '')
        index += 1
        break
      case '--overwrite':
        options.overwrite = true
        break
      default:
        if (argument.startsWith('-')) {
          fail(`Unknown option: ${argument}`)
        }

        options.inputs.push(argument)
    }
  }

  if (!options.inputs.length) {
    fail('Provide at least one image.')
  }

  if (!['contain', 'cover'].includes(options.mode)) {
    fail('--mode must be either "contain" or "cover".')
  }

  if (!/^[0-9a-fA-F]{6}$/.test(options.background)) {
    fail('--background must be a six-digit hexadecimal color, e.g. 101418.')
  }

  return options
}

async function commandExists(command) {
  try {
    await execFileAsync(command, ['--version'])
    return true
  } catch {
    return false
  }
}

async function getDimensions(file) {
  const { stdout } = await execFileAsync('sips', [
    '--getProperty', 'pixelWidth',
    '--getProperty', 'pixelHeight',
    file,
  ])
  const width = Number.parseInt(stdout.match(/pixelWidth:\s*(\d+)/)?.[1], 10)
  const height = Number.parseInt(stdout.match(/pixelHeight:\s*(\d+)/)?.[1], 10)

  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) {
    throw new Error(`Could not read dimensions from ${file}.`)
  }

  return { width, height }
}

async function imageExists(file) {
  try {
    await getDimensions(file)
    return true
  } catch {
    return false
  }
}

function outputName(input, usedNames) {
  const base = parse(basename(input)).name || 'screenshot'
  let name = `${base}.png`
  let suffix = 2

  while (usedNames.has(name)) {
    name = `${base}-${suffix}.png`
    suffix += 1
  }

  usedNames.add(name)
  return name
}

async function runSips(args) {
  await execFileAsync('sips', args)
}

async function prepareImage({ input, output, tempDir, options }) {
  const source = await getDimensions(input)
  const scale = options.mode === 'contain'
    ? Math.min(options.width / source.width, options.height / source.height)
    : Math.max(options.width / source.width, options.height / source.height)

  const resized = {
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
  }
  const temp = join(tempDir, `${parse(basename(output)).name}-resized.png`)

  await runSips([
    '--resampleHeightWidth', String(resized.height), String(resized.width),
    '--setProperty', 'format', 'png',
    input,
    '--out', temp,
  ])

  if (options.mode === 'contain') {
    await runSips([
      '--padToHeightWidth', String(options.height), String(options.width),
      '--padColor', options.background,
      '--setProperty', 'format', 'png',
      temp,
      '--out', output,
    ])
  } else {
    const offsetY = Math.floor((resized.height - options.height) / 2)
    const offsetX = Math.floor((resized.width - options.width) / 2)

    await runSips([
      '--cropToHeightWidth', String(options.height), String(options.width),
      '--cropOffset', String(offsetY), String(offsetX),
      '--setProperty', 'format', 'png',
      temp,
      '--out', output,
    ])
  }

  return { source, resized }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (!(await commandExists('sips'))) {
    fail('This script needs the macOS "sips" command, but it was not found.')
  }

  const outputDir = resolve(options.outputDir)
  const inputs = options.inputs.map((input) => resolve(input))
  const invalidInputs = []

  for (const input of inputs) {
    if (!(await imageExists(input))) {
      invalidInputs.push(input)
    }
  }

  if (invalidInputs.length) {
    fail(`These are not readable image files:\n${invalidInputs.map((file) => `  - ${file}`).join('\n')}`)
  }

  await mkdir(outputDir, { recursive: true })
  const tempDir = await mkdtemp(join(tmpdir(), 'duplo-train-slides-'))
  const usedNames = new Set()

  console.log(`Preparing ${inputs.length} screenshot(s) as ${options.width}x${options.height} (${options.mode})`)

  try {
    for (const input of inputs) {
      const output = join(outputDir, outputName(input, usedNames))

      if (!options.overwrite && await imageExists(output)) {
        throw new Error(`Output already exists: ${output}\nUse --overwrite or rename the source screenshot.`)
      }

      const { source, resized } = await prepareImage({ input, output, tempDir, options })
      console.log(`✓ ${basename(input)} (${source.width}x${source.height}) → ${output} (${resized.width}x${resized.height})`)
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(`\nError: ${error.message}`)
  process.exit(1)
})
