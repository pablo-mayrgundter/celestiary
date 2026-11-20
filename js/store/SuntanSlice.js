/**
 * The Suntan mission app: whether its panel and its spacecraft are shown.
 *
 * @param {Function} set
 * @param {Function} get
 * @returns {object} Zustand slice
 */
export default function createSuntanSlice(set, get) {
  return {
    // On from the start when the page was opened on the craft, e.g. #sun/suntan.
    isSuntanActive: typeof location !== 'undefined' && location.hash.includes('suntan'),
    toggleIsSuntanActive: () => set((state) => ({isSuntanActive: !state.isSuntanActive})),
  }
}
