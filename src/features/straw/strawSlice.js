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
    strawCount: 3
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
    clearHistory: (state, action) => {
      state.history = [];
    }
  }
})

export const { addStraw, removeStraw, updateStraw, addHistory, clearHistory } = strawSlice.actions

export default strawSlice.reducer
