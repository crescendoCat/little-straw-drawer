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
    presetCount: 0,
    isPlayingAnimation: false
  },
  reducers: {
    addStraw: (state, action) => {
      if(typeof action.payload === "string") {
        state.straws.push({
          id: state.strawCount,
          name: action.payload
        });
      }
      if(typeof action.payload === "object") {
        console.log("new straw", action.payload)
        let newStraw = {id: state.strawCount, name: ""}
        if(typeof action.payload.name === "string") 
          newStraw.name = action.payload.name

        if(action.payload.rgb) 
          newStraw.rgb = action.payload.rgb;

        state.straws.push(newStraw);

      }
      state.strawCount += 1;
    },
    addStraws: (state, action) => {
      if(!Array.isArray(action.payload.straws)) {
        console.error("straws is not an array");
        return;
      }
      if(action.payload.straws.length <= 0) {
        console.error("straws is an empty array");
        return 
      }
      if(typeof action.payload.afterIndex !== "number") {
        console.error("afterIndex is not a number");

        return;
      }
      let startIndex = state.straws.findIndex(s => s.id === action.payload.afterIndex);
      if(startIndex === -1) {
        console.error("straws who's id equals afterIndex not exists");
        
        return;
      }
      let newStraws = []
      for(let s of action.payload.straws) {
        let newStraw = {id: state.strawCount, name: ""}
        if(typeof s.name === "string") 
          newStraw.name = s.name;
        else
          continue;

        if(s.rgb) 
          newStraw.rgb = s.rgb;

        newStraws.push(newStraw);
        state.strawCount += 1;
      }
      console.log(newStraws);

      state.straws.splice(startIndex, 0, ...newStraws);
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
      if(typeof action.payload.id === "undefined") {
        return;
      }
      let idxToUpdate = state.straws.findIndex((item) => {
        return item.id === action.payload.id
      })
      if(typeof action.payload.name === "string") {
        state.straws[idxToUpdate].name = action.payload.name
      }
      if(action.payload.rgb) {
        state.straws[idxToUpdate].rgb = action.payload.rgb
      }
      if(typeof action.payload.isPicked !== "undefined") {
        state.straws[idxToUpdate].isPicked = action.payload.isPicked
      }
    },
    addHistory: (state, action) => {
      state.history.push(action.payload)
    },
    clearHistory: (state) => {
      state.history = [];
      //clean up picked straws
      for(let i in state.straws) {
        state.straws[i].isPicked = false;
      }
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
    },
    setIsPlayingAnimation: (state, action) => {
      state.isPlayingAnimation = action.payload
    }
  }
})

export const { 
  addStraw, removeStraw, updateStraw, 
  addHistory, clearHistory,
  loadPreset, savePreset, removePreset,
  setIsPlayingAnimation,
  addStraws
} = strawSlice.actions

export default strawSlice.reducer
