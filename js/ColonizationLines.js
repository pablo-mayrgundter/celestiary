import {
  BufferAttribute,
  BufferGeometry,
  LineBasicMaterial,
  LineSegments,
  Object3D,
} from 'three'
import {LIGHTYEAR_METER} from './shared.js'
import {named} from './utils.js'


// Bright-to-dark along blue.  First hop (e.g. Alpha Centauri) is near
// white, last hop is near black.  Linear RGB, written straight into
// the color buffer, as the renderer outputs linear.
const RAMP = [
  [0.95, 0.97, 1.00],
  [0.62, 0.77, 1.00],
  [0.25, 0.50, 0.92],
  [0.09, 0.22, 0.52],
  [0.02, 0.03, 0.07],
]


/**
 * @param {number} hop 1-based hop number
 * @param {number} maxHop Longest path in hops
 * @returns {Array<number>} rgb
 */
export function hopColor(hop, maxHop) {
  const t = maxHop > 1 ? (hop - 1) / (maxHop - 1) : 0
  const x = t * (RAMP.length - 1)
  const i = Math.min(Math.floor(x), RAMP.length - 2)
  const f = x - i
  const [a, b] = [RAMP[i], RAMP[i + 1]]
  return [0, 1, 2].map((c) => a[c] + ((b[c] - a[c]) * f))
}


/** @returns {string} CSS color for hop */
export function hopColorCss(hop, maxHop) {
  const [r, g, b] = hopColor(hop, maxHop).map((c) => Math.round(c * 255))
  return `rgb(${r}, ${g}, ${b})`
}


/**
 * Line segments for each hop of the spread, from parent star to child
 * star, colored by hop number.  A segment grows from its parent while
 * in transit and is hidden before departure.
 */
export default class ColonizationLines extends Object3D {
  /** */
  constructor() {
    super()
    this.name = 'Colonization'
    this.uniforms = {uTime: {value: 0}}
    this.material = new LineBasicMaterial({vertexColors: true, toneMapped: false})
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.uniforms.uTime
      shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>
uniform float uTime;
attribute vec3 aFrom;
attribute vec2 aTimes;
varying float vShow;`)
          .replace('#include <begin_vertex>', `
float span = max(aTimes.y - aTimes.x, 1e-6);
float frac = clamp((uTime - aTimes.x) / span, 0.0, 1.0);
vec3 transformed = mix(aFrom, position, frac);
vShow = uTime >= aTimes.x ? 1.0 : 0.0;`)
      shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>
varying float vShow;`)
          .replace('void main() {', `void main() {
  if (vShow < 0.5) discard;`)
    }
    this.segments = null
  }


  /**
   * @param {import('./Colonization.js').Spread} spread
   * @param {Float64Array} pos Star positions in light-years, packed xyz
   */
  setSpread(spread, pos) {
    if (this.segments) {
      this.remove(this.segments)
      this.segments.geometry.dispose()
    }
    const numSegs = spread.numReached - 1
    const position = new Float32Array(numSegs * 6)
    const from = new Float32Array(numSegs * 6)
    const color = new Float32Array(numSegs * 6)
    const times = new Float32Array(numSegs * 4)
    let s = 0
    // Skip origin at order[0].
    for (let o = 1; o < spread.numReached; o++) {
      const i = spread.order[o]
      const p = spread.parent[i]
      const rgb = hopColor(spread.hop[i], spread.maxHop)
      for (let v = 0; v < 2; v++) {
        const vi = (2 * s) + v
        const ndx = v === 0 ? p : i
        for (let c = 0; c < 3; c++) {
          position[(3 * vi) + c] = pos[(3 * ndx) + c] * LIGHTYEAR_METER
          from[(3 * vi) + c] = pos[(3 * p) + c] * LIGHTYEAR_METER
          color[(3 * vi) + c] = rgb[c]
        }
        times[2 * vi] = spread.departYears[i]
        times[(2 * vi) + 1] = spread.arriveYears[i]
      }
      s++
    }
    const geom = new BufferGeometry()
    geom.setAttribute('position', new BufferAttribute(position, 3))
    geom.setAttribute('aFrom', new BufferAttribute(from, 3))
    geom.setAttribute('color', new BufferAttribute(color, 3))
    geom.setAttribute('aTimes', new BufferAttribute(times, 2))
    this.segments = named(new LineSegments(geom, this.material), 'ColonizationSegments')
    // Positions animate in the shader, so bounds are not meaningful.
    this.segments.frustumCulled = false
    this.add(this.segments)
  }


  /** @param {number} years Years since departure from origin */
  setTime(years) {
    this.uniforms.uTime.value = years
  }
}
