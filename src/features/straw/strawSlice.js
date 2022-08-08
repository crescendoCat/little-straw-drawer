import { createSlice } from '@reduxjs/toolkit'
export const strawSlice = createSlice({
  name: 'straw',
  initialState: {
    straws: [{
      id: 0,
      name: "Some"
    },{
      id: 1,
      name: "Little"
    },{
      id: 2,
      name: "Straw"
    }], // array of Straw
    history: [],
    presets: [],
    strawCount: 3,
    presetCount: 0
  },
  reducers: {
    addStraw: (state, action) => {
      state.straws.push({
        id: state.strawCount,
        name: action.payload
      });
      state.strawCount += 1;
    },
    removeStraw: (state, action) => {
      state.straws = state.straws.filter(item => {
        return item.id !== action.payload.id
      })
    },
    /**
     * update straw value
     * @param  {object} state  default state object
     * @param  {object} action must contains `payload` property. payload must be contains id, name
     *                         id:   old straw id to update
     *                         name: the new straw value
     * @return {undefined}     
     */
    updateStraw: (state, action) => {
      let idxToUpdate = state.straws.findIndex((item) => {
        return item.id === action.payload.id
      })
      state.straws[idxToUpdate].name = action.payload.name
    },
    addHistory: (state, action) => {
      state.history.push(action.payload)
    },
    clearHistory: (state) => {
      state.history = [];
    },
    savePreset: (state) => {
      if(state.straws.length <= 0) return;
      state.presets.push({
        id: state.presetCount,
        value: state.straws
      });
      state.presetCount += 1;
    },
    loadPreset: (state, action) => {
      let idxToLoad = state.presets.findIndex(item => {
        return item.id === action.payload.id
      });
      state.straws = state.presets[idxToLoad].value;
    },
    removePreset: (state, action) => {
      state.presets = state.presets.filter(item => {
        return item.id !== action.payload.id
      });
    }
  }
})

export const { 
  addStraw, removeStraw, updateStraw, 
  addHistory, clearHistory,
  loadPreset, savePreset, removePreset } = strawSlice.actions

export default strawSlice.reducer
