import { createSlice } from '@reduxjs/toolkit'
import Straw from './index'
export const strawSlice = createSlice({
  name: 'straw',
  initialState: {
    straws: [new Straw("Test"), new Straw("Straw")], // array of Straw
    history: []
  },
  reducers: {
    addStraw: (state, action) => {
      state.straws.push(new Straw(action.payload))
    },
    removeStraw: (state, action) => {
      state.straws = state.straws.filter(item => {
        return item.id !== action.payload.id
      })
    }
  }
})

export const { addStraw, removeStraw } = strawSlice.actions

export default strawSlice.reducer
