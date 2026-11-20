import React, {ReactElement, useEffect, useMemo, useState} from 'react'
import Box from '@mui/material/Box'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import NextIcon from '@mui/icons-material/SkipNext'
import PauseIcon from '@mui/icons-material/Pause'
import PlayIcon from '@mui/icons-material/PlayArrow'
import PreviousIcon from '@mui/icons-material/SkipPrevious'
import Time from '../Time'
import {currentEvent, missionEvents, nextEvent, previousEvent} from '../suntan/events'
import {buildMission} from '../suntan/mission'
import {formatField, formatTemperature, readSensors} from '../suntan/sensors'
import TooltipIconButton from './TooltipIconButton'


const DAY = 86400
// Time#timeScale is 2^timeScaleSteps.  These span watching the lander fall
// (hours a second) to watching the seven-year approach (months a second).
const SPEED_STEPS = [0, 12, 16, 19, 22]
const REFRESH_MS = 250


/**
 * The Suntan mission app: a mission clock, play controls that step between
 * the mission's events, and the simulated sensor readings of the relay or
 * the lander.  It drives the same Time object as the app's own time controls
 * and builds the same mission as js/Spacecraft.js, so the panel and the
 * scene always agree.
 *
 * @property {Time} time The app's simulation clock
 * @property {boolean} isPaused The app's paused state
 * @property {Function} setIsPaused Sets the app's paused state, kept in step with Time#togglePause
 * @returns {ReactElement}
 */
export default function SuntanPanel({time, isPaused, setIsPaused}) {
  const mission = useMemo(() => buildMission(), [])
  const events = useMemo(() => missionEvents(mission), [mission])
  const [vehicle, setVehicle] = useState('relay')
  // Time is not React state; re-read it a few times a second.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  const t = time.simTime / 1000
  const state = mission.stateAt(t, vehicle)
  const sensors = readSensors(state)
  const speedSteps = SPEED_STEPS.includes(time.timeScaleSteps) ? time.timeScaleSteps : null
  // An event passed within the last two seconds of wall-clock still counts
  // as "here", so stepping back while time runs leaves it.
  const margin = Math.max(1, Math.abs(time.timeScale) * 2)

  const jumpTo = (event) => {
    if (event) {
      time.setTime(event.t * 1000)
    }
  }
  const onPauseClick = () => {
    setIsPaused(!isPaused)
    time.togglePause()
  }
  const onSpeed = (e, steps) => {
    if (steps !== null) {
      time.timeScaleSteps = steps
      time.timeScale = Math.pow(2, steps)
    }
  }
  const now = currentEvent(events, t)

  return (
    <Box id='suntan-panel' data-testid='suntan-panel' sx={panelStyle}>
      <Stack direction='row' justifyContent='space-between' alignItems='baseline'>
        <strong>Suntan mission</strong>
        <ToggleButtonGroup size='small' exclusive value={vehicle} onChange={(e, v) => v && setVehicle(v)}>
          <ToggleButton value='relay'>Relay</ToggleButton>
          <ToggleButton value='lander'>Lander</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <div data-testid='suntan-clock'>{new Date(time.simTime).toISOString().slice(0, 16).replace('T', ' ')} UTC</div>
      <div>
        {t < mission.tStart ? 'Before launch' : `T+${((t - mission.tStart) / DAY).toFixed(1)} days`}
        {state && ` · ${state.leg.name}`}
      </div>
      <Stack direction='row' alignItems='center'>
        <TooltipIconButton tip='Previous event' icon={<PreviousIcon/>} onClick={() => jumpTo(previousEvent(events, t, margin))}/>
        <TooltipIconButton tip={time.isPaused ? 'Play' : 'Pause'} icon={time.isPaused ? <PlayIcon/> : <PauseIcon/>} onClick={onPauseClick}/>
        <TooltipIconButton tip='Next event' icon={<NextIcon/>} onClick={() => jumpTo(nextEvent(events, t, margin))}/>
        <ToggleButtonGroup size='small' exclusive value={speedSteps} onChange={onSpeed} aria-label='Mission speed'>
          {SPEED_STEPS.map((steps) => <ToggleButton key={steps} value={steps}>{speedLabel(steps)}</ToggleButton>)}
        </ToggleButtonGroup>
      </Stack>
      <Slider
        size='small'
        aria-label='Mission time'
        min={mission.tStart}
        max={mission.tEnd}
        value={Math.min(mission.tEnd, Math.max(mission.tStart, t))}
        onChange={(e, seconds) => time.setTime(seconds * 1000)}
      />
      <select
        data-testid='suntan-events'
        aria-label='Jump to a mission event'
        value={now ? now.id : ''}
        onChange={(e) => jumpTo(events.find((event) => event.id === e.target.value))}
      >
        <option value='' disabled>Jump to…</option>
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {new Date(event.t * 1000).toISOString().slice(0, 10)} {event.name}
          </option>))}
      </select>
      {sensors ? <Sensors sensors={sensors}/> : <div>No readings before launch.</div>}
    </Box>
  )
}


/**
 * @property {object} sensors From readSensors
 * @returns {ReactElement}
 */
function Sensors({sensors}) {
  const rows = [
    ['Distance', `${sensors.distanceRs.toFixed(2)} Rs`],
    ['Altitude', `${Math.round(sensors.altitudeKm).toLocaleString('en-US')} km`],
    ['Speed', `${sensors.speedKms.toFixed(1)} km/s`],
    ['Sunlight', `${sunlight(sensors.sunlightWm2)} (${Math.round(sensors.suns).toLocaleString('en-US')} suns)`],
    ['Plate, sun-facing', formatTemperature(sensors.plateTemperatureK)],
    ['Hull, bare sphere', formatTemperature(sensors.hullTemperatureK)],
    ['Gas', formatTemperature(sensors.gasTemperatureK)],
    ['Layer', `${sensors.layer} (${sensors.agreement})`],
    ['Wind', `${sensors.windSpeedKms.toFixed(0)} km/s`],
    ['Magnetic field', formatField(sensors.fieldNt)],
    ['radial / azimuthal', `${formatField(sensors.fieldRadialNt)} / ${formatField(sensors.fieldAzimuthalNt)}`],
  ]
  return (
    <table data-testid='suntan-sensors' style={{width: '100%', borderSpacing: 0, marginTop: '0.5em'}}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td style={{opacity: 0.7, paddingRight: '1em', whiteSpace: 'nowrap'}}>{label}</td>
            <td style={{textAlign: 'right'}}>{value}</td>
          </tr>))}
      </tbody>
    </table>
  )
}


/**
 * @param {number} steps Time#timeScaleSteps
 * @returns {string} Simulated time per second of wall clock, e.g. '18 h/s'
 */
function speedLabel(steps) {
  const scale = Math.pow(2, steps)
  if (scale >= DAY) {
    return `${Math.round(scale / DAY)} d/s`
  }
  if (scale >= 3600) {
    return `${Math.round(scale / 3600)} h/s`
  }
  return scale > 1 ? `${Math.round(scale / 60)} min/s` : '1×'
}


/**
 * @param {number} wattsPerSquareMeter
 * @returns {string}
 */
function sunlight(wattsPerSquareMeter) {
  return wattsPerSquareMeter >= 1e6 ?
    `${(wattsPerSquareMeter / 1e6).toFixed(1)} MW/m²` : `${(wattsPerSquareMeter / 1e3).toFixed(0)} kW/m²`
}


// Bottom right: the nav text is top left, the time controls top right and
// the About and Settings buttons bottom left.
const panelStyle = {
  'position': 'fixed',
  'right': '1em',
  'bottom': '1em',
  'width': '26em',
  // The panel sits inside the app's right-aligned top-right stack.
  'textAlign': 'left',
  'maxWidth': 'calc(100vw - 2em)',
  'padding': '0.75em 1em',
  'fontSize': '0.8rem',
  'color': '#ccc',
  'backgroundColor': 'rgba(10, 14, 24, 0.82)',
  'border': 'solid 1px rgba(255, 255, 255, 0.25)',
  'borderRadius': '6px',
  'zIndex': 1,
  '& .MuiToggleButton-root': {
    color: '#ccc', borderColor: 'grey', padding: '1px 6px', fontSize: '0.7rem', textTransform: 'none', whiteSpace: 'nowrap',
  },
  '& .MuiToggleButton-root.Mui-selected': {color: '#fff', backgroundColor: 'rgba(255, 255, 255, 0.22)'},
  '& .MuiIconButton-root': {color: '#ccc', padding: '4px'},
  '& .MuiSlider-root': {color: '#40ff90', padding: '8px 0'},
  '& select': {width: '100%', color: '#ccc', backgroundColor: 'rgba(0, 0, 0, 0.5)', border: 'solid 1px grey', borderRadius: '3px'},
}
