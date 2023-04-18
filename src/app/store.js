import { configureStore } from '@reduxjs/toolkit';
import strawReducer from '../features/straw/strawSlice';
import settingsReducer from '../features/settings/slice';
import tutorialReducer, { tutorialDefault } from '../features/tutorial/tutorialSlice';
import { save, load } from "redux-localstorage-simple"

// tutorialDefault is immutable
let defaultState = {...tutorialDefault}

export default configureStore({
  reducer: {
    straw: strawReducer,
    tutorial: tutorialReducer,
    settings: settingsReducer
  },
  middleware: [save({
    states: [
      "settings",
      "straw",
      "tutorial.showTutorial"
    ]
  })],
  preloadedState: load({
    states: [
      "settings",
      "straw",
      "tutorial.showTutorial"
    ],
    preloadedState: {
      tutorial: defaultState
    }
  })
})

