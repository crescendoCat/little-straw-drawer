import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import { createAppStore } from '../app/store';

/**
 * Build an in-memory store with the app's real reducers and middleware but
 * without localStorage persistence, so tests stay isolated. `preloadedState`
 * is merged per slice by Redux: pass a whole slice object to override it.
 */
export function makeStore(preloadedState) {
  return createAppStore({ persist: false, preloadedState });
}

export function renderWithStore(ui, { preloadedState, store = makeStore(preloadedState), ...options } = {}) {
  const Wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
  return { store, ...render(ui, { wrapper: Wrapper, ...options }) };
}
