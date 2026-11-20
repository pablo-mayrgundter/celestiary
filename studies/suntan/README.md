# Suntan working study

Working material for the Suntan concept: fly a Parker Solar Probe (PSP) trajectory to the Sun,
lower into a sun-synchronous orbit as a relay, and put a lander on the photosphere. Nothing here
edits the concept doc; it is the material to fold into it.

| File | What it is |
|---|---|
| [psp-working-study.md](psp-working-study.md) | What PSP has actually done and measured, the solar atmosphere by altitude with how well each number is agreed, and the solid-surface question. Web research; unverified items are marked. |
| [trajectory.md](trajectory.md) | The simulated trajectory's numbers: how well it reproduces PSP, the relay orbit, the lander descent, the alternatives. Generated. |
| [trajectory.svg](trajectory.svg), [trajectory-inner.svg](trajectory-inner.svg) | Top-down plots of the same. Generated. |
| [celestiary-psp-phase.png](celestiary-psp-phase.png), [celestiary-descent.png](celestiary-descent.png) | The craft in the celestiary scene, during the PSP phase and during the lander's fall. |
| [cad/](cad/) | The STEP assembly of the flight system, its generator, and screenshots of it in Bldrs Share. |


## What celestiary already had

- **Planet positions:** VSOP87 for the eight planets (`js/vsop.js`, `js/Animation.js`), which is
  accurate. Pluto and the moons use what `Animation.js` itself calls "a (very incorrect) elliptical
  orbit": an ellipse centred on the parent rather than focused on it, swept at a constant angular
  rate, with no inclination.
- **Orbit frames:** `js/Orbit.js` builds the node / inclination / perihelion frame hierarchy from
  orbital elements, but `Planet.js` does not use it; planet orbit lines are Sun-centred ellipses.
- **N-body step:** `js/gravity.js` is a velocity-Verlet integrator with a rescaled G, used by the
  galaxy demo. It has no units and no notion of a central body.
- **Time:** `js/Time.js` is a simulation clock with a time scale and Julian-day output.
- **A per-frame hook:** `Animation#animateSystem` calls `preAnimCb(time)` on any scene object that
  has one.

What it did not have: a Kepler propagator (nothing solved Kepler's equation), a Lambert solver, a
spacecraft object type, or any way to chain orbit legs.


## What this adds

- `js/suntan/kepler.js`: Kepler's equation, orbit from apsides or from a state vector, state at a
  time, single-revolution Lambert. Plain arrays, SI units, no three.js.
- `js/suntan/ephemeris.js`: Venus and Earth from JPL's approximate elements, synchronous, so the
  model runs the same in tests and in the browser.
- `js/suntan/mission.js`: the mission as a chain of legs, the burns, the comparison numbers, and
  `stateAt(time, vehicle)`. Its header says which legs are solved, reconstructed or assumed.
- `js/suntan/mission.test.js`: 14 tests, including the checks against PSP.
- `js/Spacecraft.js`, plus a `spacecraft` case in `Scene#objectFactory`: draws each leg and moves a
  relay marker and a lander marker from `preAnimCb`.
- `public/data/suntan.json`, and `suntan` added to the Sun's `system` list, so it loads with the
  solar system and is a navigation target.
- `tools/suntanReport.mjs`: regenerates `trajectory.md` and the two plots.


## Run it

```bash
yarn install
```

```bash
yarn serve
```

Then open `http://localhost:8080/#sun/suntan`. At today's date the craft is on PSP's final 88-day
orbit, about where PSP really is. The app's default view of any target looks outward from the
Sun's side, so drag the camera up above the orbit plane to see the legs laid out as in the
screenshots. Use the fast-forward control to run time on; the Suntan burns
start on 2027-01-15 and the lander is released on 2027-04-29. To jump, in the browser console:

```js
c.time.setTime(Date.parse('2027-04-29T00:00:00Z'))
```

```bash
bun test js/suntan
```

```bash
bun tools/suntanReport.mjs
```


## Headline results

Details and tables are in [trajectory.md](trajectory.md).

- **The model reproduces PSP.** The reconstructed legs meet Venus within 40,000 km at all seven
  flybys, Venus-relative speed is conserved through each to 0.1 km/s, and the solved launch arc
  needs C3 = 152 km²/s² against PSP's roughly 154.
- **The sun-synchronous orbit is at 35.5 Rs (0.165 AU)**, which is almost exactly PSP's *first*
  perihelion (35.66 Rs). The concept doc's "a yet lower orbit" holds for the period (88 days
  down to 24.5), but the perihelion has to come *up*, from 9.86 Rs; it is the aphelion that must
  come down, from 0.73 AU.
- **Getting there costs 22–30 km/s of propulsion**, because Venus flybys cannot circularize an
  orbit that close in. That is the relay's main open design problem.
- **The lander reaches the photosphere at about 610 km/s whatever the route.**
- **A minimum-energy descent arrives level, not falling:** the last 2,000 km take about two
  minutes and 76,000 km of travel round the Sun.
- **Sunlight alone takes a bare hull past its melting point 44,000 km up**, ten minutes before
  arrival. At the photosphere a sphere settles near 4,850 K, about 480 K over the concept's
  4,100 °C limit rather than 1,400.
- **A minimum-energy descent lands where the relay cannot see it.**


## The CAD model in Bldrs Share

`cad/suntan.step` is an AP214 assembly of the flight system: the PSP-derived relay orbiter and a
sling wheel carrying four landers. [cad/README.md](cad/README.md) has the layout, the parts and
mass table, and how it was validated against Share's engine.

Checked in a local build of Share: it opens in about four seconds, 82 placed parts drawn as
150,353 triangles from 33,684 unique ones (repeated parts are stored once), and the part tree
reads Suntan > Orbiter and Sling wheel > Lander ×4.

- **Open it:** drag `cad/suntan.step` onto Share. Once this is on GitHub it also opens by URL,
  as `/share/v/gh/pablo-mayrgundter/celestiary/<branch>/studies/suntan/cad/suntan.step`.
- **Part tree:** the Navigation button, top left
  ([screenshot](cad/share-suntan-navtree.png)).
- **Section the landers:** turn on the X cut plane, or add `#cp:x` to the URL
  ([screenshot](cad/share-suntan-cut-x.png)).
- **Go straight to a sectioned lander:** add
  `#cp:x;c:2.37246,-7.73909,2.52042,1.3889,-8.72265,1.53686`
  ([screenshot](cad/share-suntan-lander-section.png)). From outside in: ablator, hafnium
  carbonitride hull, coolant plenum, insulation, instrument core, with the diamond window port at
  the bottom and the magnet coils around it.


## Limits of the model

- Orbit families 1–7 are a kinematic reconstruction from PSP's published perihelia, not a
  forward-propagated design, and flyby altitude is not resolved.
- All legs after the first flyby are coplanar, in Venus's orbital plane; the Sun's equator is
  treated as lying in that plane (it is really 7.25° from the ecliptic).
- Burns are impulsive and sized, not optimized. Low-thrust or sail trajectories, which are the
  realistic way to pay for the relay orbit, are not modelled.
- The lander "at the photosphere" simply co-rotates. Nothing models the entry.
- In the app, planet orbit lines are Sun-centred ellipses (existing behaviour), so the craft's path
  and Venus's drawn orbit line do not cross exactly where the flyby happens, even though the
  craft and the Venus body do meet.

Existing issue found on the way: `yarn lint` does not run at HEAD (ESLint 9 with the legacy
`.eslintrc.js`, and the removed `require-jsdoc` rule). The new files were checked with
`ESLINT_USE_FLAT_CONFIG=false`, which reports only that repo-wide rule error for them.
