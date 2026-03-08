// Run with: node generate-icons.js
// Generates PNG icons for PWA manifest
// Requires: npm install canvas (optional, for CI)
// Alternative: use any image tool to create 192x192 and 512x512 PNGs from favicon.svg

const { createCanvas } = require('canvas')
const fs = require('fs')

function createIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#1e40af'
  const r = size * 0.2
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.quadraticCurveTo(size, 0, size, r)
  ctx.lineTo(size, size - r)
  ctx.quadraticCurveTo(size, size, size - r, size)
  ctx.lineTo(r, size)
  ctx.quadraticCurveTo(0, size, 0, size - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fill()

  // Heart
  const cx = size / 2
  const cy = size * 0.45
  const hs = size * 0.28
  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.moveTo(cx, cy + hs * 0.9)
  ctx.bezierCurveTo(cx - hs, cy + hs * 0.4, cx - hs * 1.2, cy - hs * 0.4, cx - hs * 0.6, cy - hs * 0.6)
  ctx.bezierCurveTo(cx - hs * 0.2, cy - hs * 0.8, cx, cy - hs * 0.4, cx, cy)
  ctx.bezierCurveTo(cx, cy - hs * 0.4, cx + hs * 0.2, cy - hs * 0.8, cx + hs * 0.6, cy - hs * 0.6)
  ctx.bezierCurveTo(cx + hs * 1.2, cy - hs * 0.4, cx + hs, cy + hs * 0.4, cx, cy + hs * 0.9)
  ctx.closePath()
  ctx.fill()

  return canvas.toBuffer('image/png')
}

try {
  fs.writeFileSync('public/icon-192.png', createIcon(192))
  fs.writeFileSync('public/icon-512.png', createIcon(512))
  console.log('Icons generated!')
} catch (e) {
  console.log('canvas not available, skipping icon generation')
}
