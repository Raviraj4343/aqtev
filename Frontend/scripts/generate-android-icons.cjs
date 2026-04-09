const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const DENSITIES = {
  ldpi: { legacy: 36, layer: 81 },
  mdpi: { legacy: 48, layer: 108 },
  hdpi: { legacy: 72, layer: 162 },
  xhdpi: { legacy: 96, layer: 216 },
  xxhdpi: { legacy: 144, layer: 324 },
  xxxhdpi: { legacy: 192, layer: 432 },
}

const ROOT = path.resolve(__dirname, '..')
const SRC_ICON = path.join(ROOT, 'assets', 'icon.png')
const RES_ROOT = path.join(ROOT, 'android', 'app', 'src', 'main', 'res')

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
}

function isNearGray(r, g, b) {
  const closeChannels = Math.abs(r - g) <= 12 && Math.abs(g - b) <= 12
  const avg = (r + g + b) / 3
  return closeChannels && avg >= 235
}

function gradientSvg(size) {
  return Buffer.from(`
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e8f5f8"/>
      <stop offset="100%" stop-color="#ecfaee"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" fill="url(#g)"/>
</svg>`)
}

async function extractRunnerPng() {
  const { data, info } = await sharp(SRC_ICON).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  let minX = info.width
  let minY = info.height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const idx = (y * info.width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const a = data[idx + 3]

      if (a > 10 && isNearGray(r, g, b)) {
        data[idx + 3] = 0
      }

      if (data[idx + 3] > 10) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error('Could not isolate the logo foreground from assets/icon.png')
  }

  const croppedWidth = maxX - minX + 1
  const croppedHeight = maxY - minY + 1

  const extracted = await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .extract({ left: minX, top: minY, width: croppedWidth, height: croppedHeight })
    .png()
    .toBuffer()

  return extracted
}

async function makeForeground(size, runnerPng) {
  const runnerMeta = await sharp(runnerPng).metadata()
  const maxW = Math.round(size * 0.76)
  const maxH = Math.round(size * 0.8)

  const iconScale = Math.min(maxW / runnerMeta.width, maxH / runnerMeta.height)
  const drawW = Math.max(1, Math.round(runnerMeta.width * iconScale))
  const drawH = Math.max(1, Math.round(runnerMeta.height * iconScale))

  const left = Math.round((size - drawW) / 2)
  const top = Math.round((size - drawH) / 2)

  const resizedRunner = await sharp(runnerPng).resize(drawW, drawH, { fit: 'contain' }).png().toBuffer()

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resizedRunner, left, top }])
    .png()
    .toBuffer()
}

async function makeBackground(size) {
  return sharp(gradientSvg(size)).png().toBuffer()
}

async function writeDensityAssets(density, cfg, runnerPng) {
  const outDir = path.join(RES_ROOT, `mipmap-${density}`)
  ensureDir(outDir)

  const bg = await makeBackground(cfg.layer)
  const fg = await makeForeground(cfg.layer, runnerPng)

  await sharp(bg).toFile(path.join(outDir, 'ic_launcher_background.png'))
  await sharp(fg).toFile(path.join(outDir, 'ic_launcher_foreground.png'))

  const legacyBg = await makeBackground(cfg.legacy)
  const legacyFg = await makeForeground(cfg.legacy, runnerPng)

  const composedLegacy = await sharp(legacyBg)
    .composite([{ input: legacyFg, left: 0, top: 0 }])
    .png()
    .toBuffer()

  await sharp(composedLegacy).toFile(path.join(outDir, 'ic_launcher.png'))
  await sharp(composedLegacy).toFile(path.join(outDir, 'ic_launcher_round.png'))
}

async function main() {
  if (!fs.existsSync(SRC_ICON)) {
    throw new Error(`Missing source icon at ${SRC_ICON}`)
  }

  const runnerPng = await extractRunnerPng()

  for (const [density, cfg] of Object.entries(DENSITIES)) {
    await writeDensityAssets(density, cfg, runnerPng)
  }

  console.log('Generated refreshed Android launcher icons successfully.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
