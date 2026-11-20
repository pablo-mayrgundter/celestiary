/**
 * Approximate heliocentric positions of Venus and Earth from JPL's Keplerian
 * elements and rates ("Approximate Positions of the Planets", Standish,
 * table 1, valid 1800-2050, https://ssd.jpl.nasa.gov/planets/approx_pos.html).
 *
 * The app positions planets with VSOP87 (js/vsop.js), which is more accurate
 * but loads as WebAssembly and is asynchronous.  The mission model needs
 * Venus synchronously, in tests as well as in the browser, and only to the
 * accuracy of a patched-conic reconstruction, so it uses these instead.  The
 * two agree to about 1e-4 AU over the mission dates; that is far inside the
 * model's own error, though it is several Venus radii, so do not read flyby
 * altitudes off the rendered scene.
 */
import {DAY, GM_SUN, AU, TWO_PI, add, scale, solveKepler} from './kepler.js'


const toRad = Math.PI / 180
const J2000_UNIX_DAYS = 2451545.0 - 2440587.5
const DAYS_PER_CENTURY = 36525

// [value at J2000, change per Julian century]; a in AU, angles in degrees.
const ELEMENTS = {
  venus: {
    a: [0.72333566, 0.00000390],
    e: [0.00677672, -0.00004107],
    inc: [3.39467605, -0.00078890],
    meanLon: [181.97909950, 58517.81538729],
    lonPeri: [131.60246718, 0.00268329],
    lonNode: [76.67984255, -0.27769418],
  },
  // Earth-Moon barycenter.
  earth: {
    a: [1.00000261, 0.00000562],
    e: [0.01671123, -0.00004392],
    inc: [-0.00001531, -0.01294668],
    meanLon: [100.46457166, 35999.37244981],
    lonPeri: [102.93768193, 0.32327364],
    lonNode: [0.0, 0.0],
  },
}


/**
 * @param {string} name 'venus' or 'earth'
 * @param {number} t Unix time, seconds
 * @returns {{r: Array<number>, v: Array<number>, normal: Array<number>}} Heliocentric
 *   ecliptic J2000 state in meters and m/s, and the orbit's unit normal
 */
export function planetState(name, t) {
  const el = ELEMENTS[name]
  if (!el) {
    throw new Error(`No elements for planet: ${name}`)
  }
  const T = ((t / DAY) - J2000_UNIX_DAYS) / DAYS_PER_CENTURY
  const at = (pair) => pair[0] + (pair[1] * T)
  const a = at(el.a) * AU
  const e = at(el.e)
  const inc = at(el.inc) * toRad
  const node = at(el.lonNode) * toRad
  const argPeri = (at(el.lonPeri) * toRad) - node
  const M = (at(el.meanLon) - at(el.lonPeri)) * toRad

  const E = solveKepler(M % TWO_PI, e)
  const b = Math.sqrt(1 - (e * e))
  const x = a * (Math.cos(E) - e)
  const y = a * b * Math.sin(E)
  const dist = a * (1 - (e * Math.cos(E)))
  const k = Math.sqrt(GM_SUN * a) / dist
  const vx = -k * Math.sin(E)
  const vy = k * b * Math.cos(E)

  const [cO, sO] = [Math.cos(node), Math.sin(node)]
  const [cw, sw] = [Math.cos(argPeri), Math.sin(argPeri)]
  const [ci, si] = [Math.cos(inc), Math.sin(inc)]
  const P = [(cO * cw) - (sO * sw * ci), (sO * cw) + (cO * sw * ci), sw * si]
  const Q = [(-cO * sw) - (sO * cw * ci), (-sO * sw) + (cO * cw * ci), cw * si]
  return {
    r: add(scale(P, x), scale(Q, y)),
    v: add(scale(P, vx), scale(Q, vy)),
    normal: [sO * si, -cO * si, ci],
  }
}
