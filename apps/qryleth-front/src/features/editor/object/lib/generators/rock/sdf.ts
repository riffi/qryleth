import { createSeededNoise, fbm } from './noise'
import type { MacroParams, RockGeneratorParams } from './types'

function sdSphere(x: number, y: number, z: number, r: number): number {
  return Math.sqrt(x * x + y * y + z * z) - r
}

function sdBox(x: number, y: number, z: number, sx: number, sy: number, sz: number): number {
  const qx = Math.abs(x) - sx
  const qy = Math.abs(y) - sy
  const qz = Math.abs(z) - sz
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0))
  const inside = Math.min(Math.max(qx, Math.max(qy, qz)), 0)
  return outside + inside
}

function smoothMin(a: number, b: number, k: number): number {
  const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / (k || 1e-6)))
  return a * (1 - h) + b * h - (k || 0) * h * (1 - h)
}
function smoothMax(a: number, b: number, k: number): number {
  return -smoothMin(-a, -b, k)
}

export function createRockSDF(params: RockGeneratorParams): (x: number, y: number, z: number) => number {
  const noise = createSeededNoise(params.seed)
  const [sx, sy, sz] = params.size
  const macro: MacroParams = params.macro || {}

  function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / ((edge1 - edge0) || 1e-12)))
    return t * t * (3 - 2 * t)
  }
  function hsh(n: number): number {
    let x = (params.seed ^ (n * 374761393)) >>> 0
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5
    return (x >>> 0) / 0xffffffff
  }

  return (x: number, y: number, z: number) => {
    // Нормализуем координаты
    let nx = x / sx, ny = y / sy, nz = z / sz

    // Макро‑варпы в нормализованном пространстве
    if (macro.taper) { const t = 1 + macro.taper * ny; nx *= t; nz *= t }
    if (macro.twist) { const a = macro.twist * ny; const c = Math.cos(a), s = Math.sin(a); const rx = c * nx - s * nz; nz = s * nx + c * nz; nx = rx }
    if (macro.bend)  { const a = macro.bend * nx; const c = Math.cos(a), s = Math.sin(a); const ry = c * ny - s * nz; nz = s * ny + c * nz; ny = ry }

    if (macro.program && macro.program.length) {
      for (let i = 0; i < macro.program.length; i++) {
        const st = macro.program[i]
        const feather = st.band.feather ?? 0.1
        const w0 = st.band.y0 - feather, w1 = st.band.y0, w2 = st.band.y1, w3 = st.band.y1 + feather
        const wy = ny
        const a = smoothstep(w0, w1, wy), b = 1 - smoothstep(w2, w3, wy)
        const w = Math.min(a, b)
        let amount = st.amount
        if (macro.randomizeFromSeed) amount *= (1 + (hsh(1000 + i) - 0.5) * 0.3)
        if (w > 1e-3 && amount !== 0) {
          if (st.kind === 'taper') { const t = 1 + amount * ny * w; nx *= t; nz *= t }
          else if (st.kind === 'twist') { const ang = amount * ny * w; const c = Math.cos(ang), s = Math.sin(ang); const rx = c * nx - s * nz; const rz = s * nx + c * nz; nx = rx; nz = rz }
          else if (st.kind === 'bend') {
            const axis = st.axis || 'x'
            if (axis === 'x') { const ang = amount * nx * w; const c = Math.cos(ang), s = Math.sin(ang); const ry = c * ny - s * nz; const rz = s * ny + c * nz; ny = ry; nz = rz }
            else if (axis === 'y') { const ang = amount * ny * w; const c = Math.cos(ang), s = Math.sin(ang); const rz = c * nz - s * nx; const rx = s * nz + c * nx; nx = rx; nz = rz }
            else { const ang = amount * nz * w; const c = Math.cos(ang), s = Math.sin(ang); const rx = c * nx - s * ny; const ry = s * nx + c * ny; nx = rx; ny = ry }
          }
        }
      }
    }

    const baseBlend = Math.max(0, Math.min(1, macro.baseBlend ?? 0.5))
    const makeBase = (x0: number, y0: number, z0: number) => {
      const sphere = sdSphere(x0, y0, z0, 0.45)
      const box = sdBox(x0, y0, z0, 0.35, 0.3, 0.35)
      return sphere * (1 - baseBlend) + box * baseBlend
    }

    const pc = Math.max(1, Math.floor(macro.piecesCount ?? 1))
    const spread = macro.piecesSpread ?? 0
    const pj = macro.piecesScaleJitter ?? 0
    const pk = macro.piecesSmoothK ?? 0.12
    const pop = macro.piecesOp ?? 'union'

    let d: number
    if (pc <= 1) {
      d = makeBase(nx, ny, nz)
    } else {
      let acc = 0
      for (let i = 0; i < pc; i++) {
        const ox = (hsh(200 + i * 3 + 0) * 2 - 1) * spread
        const oy = (hsh(200 + i * 3 + 1) * 2 - 1) * spread
        const oz = (hsh(200 + i * 3 + 2) * 2 - 1) * spread
        const s = 1 + ((hsh(400 + i) * 2 - 1) * pj)
        let px = (nx - ox) / s, py = (ny - oy) / s, pz = (nz - oz) / s
        if (macro.taper) { const t = 1 + macro.taper * py; px *= t; pz *= t }
        if (macro.twist) { const ang = macro.twist * py; const c = Math.cos(ang), s2 = Math.sin(ang); const rx = c * px - s2 * pz; const rz = s2 * px + c * pz; px = rx; pz = rz }
        if (macro.bend)  { const ang = macro.bend * px; const c = Math.cos(ang), s2 = Math.sin(ang); const ry = c * py - s2 * pz; const rz = s2 * py + c * pz; py = ry; pz = rz }
        if (macro.program && macro.program.length) {
          for (let j = 0; j < macro.program.length; j++) {
            const st = macro.program[j]
            const feather = st.band.feather ?? 0.1
            const w0 = st.band.y0 - feather, w1 = st.band.y0, w2 = st.band.y1, w3 = st.band.y1 + feather
            const wy = py
            const a = smoothstep(w0, w1, wy), b = 1 - smoothstep(w2, w3, wy)
            const w = Math.min(a, b)
            let amount = st.amount
            if (macro.randomizeFromSeed) amount *= (1 + (hsh(1000 + j) - 0.5) * 0.3)
            if (w > 1e-3 && amount !== 0) {
              if (st.kind === 'taper') { const t = 1 + amount * py * w; px *= t; pz *= t }
              else if (st.kind === 'twist') { const ang = amount * py * w; const c = Math.cos(ang), s3 = Math.sin(ang); const rx = c * px - s3 * pz; const rz = s3 * px + c * pz; px = rx; pz = rz }
              else if (st.kind === 'bend') {
                const axis = st.axis || 'x'
                if (axis === 'x') { const ang = amount * px * w; const c = Math.cos(ang), s3 = Math.sin(ang); const ry = c * py - s3 * pz; const rz = s3 * py + c * pz; py = ry; pz = rz }
                else if (axis === 'y') { const ang = amount * py * w; const c = Math.cos(ang), s3 = Math.sin(ang); const rz = c * pz - s3 * px; const rx = s3 * pz + c * px; px = rx; pz = rz }
                else { const ang = amount * pz * w; const c = Math.cos(ang), s3 = Math.sin(ang); const rx = c * px - s3 * py; const ry = s3 * px + c * py; px = rx; py = ry }
              }
            }
          }
        }
        const micro = Math.min((params.recipe === 'slate' ? 0.08 : (params.recipe === 'porous' ? 0.12 : 0.05)), pk * 0.25)
        const nval = fbm(noise, px * (params.recipe === 'porous' ? 5 : 3), py * (params.recipe === 'porous' ? 5 : 3), pz * (params.recipe === 'porous' ? 5 : 3), 4)
        const di = (makeBase(px, py, pz) + nval * micro) * s
        if (i === 0) acc = di
        else {
          if (pop === 'union') acc = smoothMin(acc, di, pk)
          else if (pop === 'intersect') acc = smoothMax(acc, di, pk)
          else acc = smoothMax(acc, -di, pk)
        }
      }
      d = acc
      if (pop === 'union' && pc > 1) d -= pk * 0.02
    }

    if (pc <= 1) {
      const noiseScale = params.recipe === 'slate' ? 3 : (params.recipe === 'porous' ? 5 : 2)
      const noiseStrength = params.recipe === 'slate' ? 0.08 : (params.recipe === 'porous' ? 0.12 : 0.05)
      const noiseValue = fbm(noise, nx * noiseScale, ny * noiseScale, nz * noiseScale, 4)
      d += noiseValue * noiseStrength
    }

    if (macro.cuts && macro.cuts.length > 0) {
      for (const cut of macro.cuts) {
        const [nxp, nyp, nzp] = cut.normal
        const len = Math.hypot(nxp, nyp, nzp) || 1
        const ux = nxp / len, uy = nyp / len, uz = nzp / len
        const plane = nx * ux + ny * uy + nz * uz - cut.offset
        d = Math.max(d, plane)
      }
    }

    const avgSize = (sx + sy + sz) / 3
    return d * avgSize
  }
}

