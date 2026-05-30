import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'

function genIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0D0D0D'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `bold ${Math.floor(size * 0.22)}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('ON AIR', size/2, size/2 - size*0.05)
  ctx.fillStyle = '#E00000'
  ctx.fillRect(size*0.2, size/2 + size*0.12, size*0.6, 3)
  const buf = canvas.toBuffer('image/png')
  writeFileSync(`public/icon-${size}.png`, buf)
  console.log(`Generated icon-${size}.png`)
}
genIcon(192)
genIcon(512)
