import { configureStore } from '@reduxjs/toolkit';
import { save, load } from 'redux-localstorage-simple';
import strawReducer from '../features/straw/strawSlice';
import settingsReducer from '../features/settings/slice';
import tutorialReducer from '../features/tutorial/tutorialSlice';
import whatsNewReducer from '../features/whatsNew/whatsNewSlice';

/**
 * localStorage persistence contract.
 *
 * Every entry below is written by redux-localstorage-simple after each action
 * under the key `${STORAGE_NAMESPACE}_${path}` and read back when the store is
 * created. Nested paths (e.g. "tutorial.showTutorial") persist a single field;
 * the dot is part of the key name. Changing this list or renaming a slice is a
 * data-migration event, so it is covered by src/app/store.test.js.
 */
export const STORAGE_NAMESPACE = 'redux_localstorage_simple';
export const storageKeyFor = (path) => `${STORAGE_NAMESPACE}_${path}`;

export const PERSISTED_STATES = [
  'settings',
  'straw',
  'tutorial.showTutorial',
  'whatsNew.seenVersion',
];

export const rootReducer = {
  straw: strawReducer,
  tutorial: tutorialReducer,
  settings: settingsReducer,
  whatsNew: whatsNewReducer,
};

/**
 * Base object that persisted values are merged onto by `load()`.
 *
 * Redux replaces a slice's initialState with whatever is preloaded, so a
 * slice that persists only some fields (tutorial.showTutorial) or a stored
 * object written by an older version that lacks newer fields would otherwise
 * come back with `undefined` holes. Seeding every slice with its own initial
 * state makes missing fields fall back to defaults. RTK freezes initialState
 * and `load()` mutates the base while merging, so shallow copies are required
 * (arrays and nested objects are assigned wholesale, never mutated).
 */
export const defaultPreloadedState = () =>
  Object.fromEntries(
    Object.entries(rootReducer).map(([slice, reducer]) => [
      slice,
      { ...reducer(undefined, { type: '@@app/preload' }) },
    ])
  );

/**
 * Build the application store.
 *
 * @param {object}  [options]
 * @param {boolean} [options.persist=true]  read from / write to localStorage
 * @param {object}  [options.preloadedState] per-slice overrides (tests)
 */
export function createAppStore({ persist = true, preloadedState } = {}) {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => {
      // The tutorial slice holds JSX, so the serializable check must stay off.
      const base = getDefaultMiddleware({ serializableCheck: false });
      return persist ? base.concat(save({ states: PERSISTED_STATES })) : base;
    },
    preloadedState: persist
      ? load({
          states: PERSISTED_STATES,
          disableWarnings: true,
          preloadedState: { ...defaultPreloadedState(), ...preloadedState },
        })
      : preloadedState,
  });
}

export default createAppStore();
