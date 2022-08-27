import { configureStore } from '@reduxjs/toolkit';
import strawReducer from '../features/straw/strawSlice';
import tutorialReducer from '../features/tutorial/tutorialSlice';
import { save, load } from "redux-localstorage-simple"

export default configureStore({
  reducer: {
    straw: strawReducer,
    tutorial: tutorialReducer
  },
  middleware: [save({
    ignoreStates: ['tutorial.tutorials']
  })],
  preloadedState: load()
})