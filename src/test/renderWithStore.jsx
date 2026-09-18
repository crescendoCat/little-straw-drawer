import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import strawReducer from '../features/straw/strawSlice';
import settingsReducer from '../features/settings/slice';
import tutorialReducer from '../features/tutorial/tutorialSlice';
import whatsNewReducer from '../features/whatsNew/whatsNewSlice';

/**
 * Build an in-memory store with the same reducers as the app but without
 * the localStorage persistence middleware, so tests stay isolated.
 * The serializable check is disabled to match the app store, whose
 * custom middleware list replaces the RTK defaults.
 */
export function makeStore(preloadedState) {
  return configureStore({
    reducer: {
      straw: strawReducer,
      settings: settingsReducer,
      tutorial: tutorialReducer,
      whatsNew: whatsNewReducer,
    },
    preloadedState,
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
  });
}

export function renderWithStore(ui, { preloadedState, store = makeStore(preloadedState), ...options } = {}) {
  const Wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
  return { store, ...render(ui, { wrapper: Wrapper, ...options }) };
}
