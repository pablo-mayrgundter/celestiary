import {
  AdditiveBlending,
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  Object3D,
  Vector3,
} from 'three'
import SceneObject from './object.js'
import SpriteSheet from './SpriteSheet.js'
import {point} from './shapes.js'
import {ASTRO_UNIT_METER} from './shared.js'
import {named} from './utils.js'
import {buildMission} from './suntan/mission.js'


// One full orbit of a leg is drawn with this many segments.  The sun-grazing
// legs have e > 0.9, so a coarse polyline visibly cuts the corner at perihelion.
const PATH_SEGMENTS = 720
const PATH_COLORS = {
  psp: 0xb06020,
  transfer: 0xffe040,
  sync: 0x40ff90,
  relay: 0x40ff90,
  descent: 0xff3050,
}


/**
 * A spacecraft flown along a precomputed mission (js/suntan/mission.js)
 * rather than along a planet-style orbit.
 *
 * Planets are placed by Animation.js from VSOP87 or from `props.orbit`.  A
 * spacecraft has no single orbit, so it positions itself instead, from the
 * `preAnimCb` hook that Animation#animateSystem calls on every scene object
 * each frame.  It draws one path per mission leg and moves two markers: the
 * relay orbiter, which is the navigation target, and the lander, which is
 * the same point until release.
 */
export default class Spacecraft extends SceneObject {
  /**
   * @param {object} scene
   * @param {object} props From public/data/<name>.json
   */
  constructor(scene, props) {
    super(props.name, props)
    this.mission = buildMission(props.mission)

    // Named 'orbit' so Scene#toggleOrbits shows and hides it with the planets'.
    this.add(named(this.newPaths(), 'orbit'))

    const relayPosition = scene.newGroup(`${this.name}.orbitPosition`)
    const relay = new Object3D
    relay.props = props
    relay.orbitPosition = relayPosition
    // Far enough back to see the inner legs and the Sun behind the craft.
    relay.initialCameraDistance = ASTRO_UNIT_METER / 3
    relay.add(newMarker('Suntan relay', 0x40ff90))
    relayPosition.add(relay)
    scene.objects[this.name] = relay
    this.add(relayPosition)

    const landerPosition = new Object3D
    landerPosition.add(newMarker('Suntan lander', 0xff3050))
    this.add(landerPosition)

    this.preAnimCb = (time) => {
      const t = time.simTime / 1000
      place(relayPosition, this.mission.stateAt(t, 'relay'))
      const lander = this.mission.stateAt(t, 'lander')
      place(landerPosition, lander)
      // One stack until release; don't draw two labels on top of each other.
      landerPosition.visible = landerPosition.visible && lander.leg.vehicle === 'lander'
    }
  }


  /** @returns {Group} One line per mission leg */
  newPaths() {
    const group = new Group
    this.mission.legs.forEach((leg) => {
      const color = PATH_COLORS[leg.id] || PATH_COLORS[leg.phase]
      if (leg.id === 'surface' || color === undefined) {
        return
      }
      // A leg flown for several revolutions retraces itself; draw it once.
      const span = Math.min(leg.t1 - leg.t0, leg.orbit.period)
      const points = []
      for (let i = 0; i <= PATH_SEGMENTS; i++) {
        points.push(toScene(leg.stateAt(leg.t0 + ((span * i) / PATH_SEGMENTS)).r, new Vector3))
      }
      const material = new LineBasicMaterial({
        color,
        blending: AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        toneMapped: false,
      })
      group.add(named(new Line(new BufferGeometry().setFromPoints(points), material), leg.id))
    })
    return group
  }
}


/**
 * Heliocentric ecliptic meters to scene coordinates.  Same axis mapping as
 * the VSOP branch of Animation#animateSystem, so the craft and the planets
 * share a frame.
 *
 * @param {Array<number>} r
 * @param {Vector3} target
 * @returns {Vector3}
 */
function toScene(r, target) {
  return target.set(r[0], r[2], -r[1])
}


/**
 * @param {Object3D} obj
 * @param {object|null} state From mission.stateAt; null before launch
 */
function place(obj, state) {
  obj.visible = state !== null
  if (state) {
    toScene(state.r, obj.position)
  }
}


/**
 * @param {string} label
 * @param {number} color
 * @returns {Object3D} A fixed-size dot with a text label
 */
function newMarker(label, color) {
  const group = new Group
  group.add(point({
    color,
    size: 6,
    sizeAttenuation: false,
    blending: AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  }))
  const sheet = named(new SpriteSheet(1, label), 'label')
  sheet.add(0, 0, 0, label, `#${color.toString(16).padStart(6, '0')}`)
  group.add(named(sheet.compile(), 'label LOD'))
  return group
}
