import { createSlice } from '@reduxjs/toolkit'
export const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    isRepeatable: true,
    showAnimation: true,
    animationType: "default",
    displaySetting: false,
    animationTimeout: 500
  },
  reducers: {
    openSettings: (state) => {
      state.displaySetting = true
    },
    closeSettings: (state) => {
      state.displaySetting = false
    },
    /**
     * set show settings modal or not
     * @param  {object} state  default state object
     * @param  {object} action { payload: true | false }
     * @return {undefined}     
     */
    setDisplaySettings: (state, action) => {
      state.displaySetting = action.payload
    },
    /**
     * set repeatable value
     * @param  {object} state  default state object
     * @param  {object} action { payload: true | false }
     * @return {undefined}     
     */
    setRepeatable: (state, action) => {
      state.isRepeatable = action.payload
    },
    /**
     * set repeatable value
     * @param  {object} state  default state object
     * @param  {object} action { payload: true | false }
     * @return {undefined}     
     */
    setShowAnimation: (state, action) => {
      state.showAnimation = action.payload
    },
    /**
     * set repeatable value
     * @param  {object} state  default state object
     * @param  {object} action { payload: animationType: string }
     *                         animationType: string must be one of the following:
     *                           "default"
     *                           
     * @return {undefined}     
     */
    setAnimationType: (state, action) => {
      state.animationType = action.payload
    },
    setAnimationTimeout: (state, action) => {
      state.animationTimeout = parseInt(action.payload)
    },
    /**
     * Merge settings from a backup (cloud restore). Each field is type-checked
     * and unknown keys are ignored; `displaySetting` (the modal flag) is never
     * touched so restoring cannot pop the settings dialog open.
     */
    hydrate: (state, action) => {
      const payload = action.payload
      if (!payload || typeof payload !== 'object') return
      if (typeof payload.isRepeatable === 'boolean') state.isRepeatable = payload.isRepeatable
      if (typeof payload.showAnimation === 'boolean') state.showAnimation = payload.showAnimation
      if (typeof payload.animationType === 'string') state.animationType = payload.animationType
      if (Number.isFinite(payload.animationTimeout)) state.animationTimeout = payload.animationTimeout
    }
  }
})

export const { 
  openSettings,
  closeSettings,
  setDisplaySettings,
  setRepeatable,
  setShowAnimation,
  setAnimationType,
  setAnimationTimeout,
  hydrate
} = settingsSlice.actions

export default settingsSlice.reducer
