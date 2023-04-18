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
  setAnimationTimeout
} = settingsSlice.actions

export default settingsSlice.reducer
