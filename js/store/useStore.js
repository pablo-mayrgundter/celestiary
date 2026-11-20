import {create} from 'zustand'
import createAsterismsSlice from './AsterismsSlice'
import createStarsSlice from './StarsSlice'
import createSuntanSlice from './SuntanSlice'
import createTimeSlice from './TimeSlice'


const useStore = create((set, get) => ({
  ...createAsterismsSlice(set, get),
  ...createStarsSlice(set, get),
  ...createSuntanSlice(set, get),
  ...createTimeSlice(set, get),
}))

export default useStore
