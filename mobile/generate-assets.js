// Generates minimal placeholder PNG assets without any npm dependencies.
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

function crc32(buf) {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function createSolidPNG(w, h, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // RGB color type
  // bytes 10-12 are 0 (compression, filter, interlace)

  // Build one scanline: filter byte (0) + RGB pixels
  const scanline = Buffer.alloc(1 + w * 3)
  scanline[0] = 0 // filter: None
  for (let x = 0; x < w; x++) {
    scanline[1 + x * 3] = r
    scanline[2 + x * 3] = g
    scanline[3 + x * 3] = b
  }

  // Stack h identical scanlines
  const chunks = []
  for (let y = 0; y < h; y++) chunks.push(scanline)
  const raw = Buffer.concat(chunks)

  const idat = zlib.deflateSync(raw, { level: 9 })

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

const dir = path.join(__dirname, 'assets')
fs.mkdirSync(dir, { recursive: true })

// #0f172a = rgb(15, 23, 42) — dark slate background matching app theme
const R = 15, G = 23, B = 42

fs.writeFileSync(path.join(dir, 'icon.png'), createSolidPNG(1024, 1024, R, G, B))
fs.writeFileSync(path.join(dir, 'adaptive-icon.png'), createSolidPNG(1024, 1024, R, G, B))
fs.writeFileSync(path.join(dir, 'splash.png'), createSolidPNG(1284, 2778, R, G, B))

console.log('Assets generated: icon.png, adaptive-icon.png, splash.png')
