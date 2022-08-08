import { configureStore } from '@reduxjs/toolkit';
import strawReducer from '../features/straw/strawSlice';
import { save, load } from "redux-localstorage-simple"

export default configureStore({
  reducer: {
    straw: strawReducer
  },
  middleware: [save()],
  preloadedState: load()
})