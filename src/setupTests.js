// jest-dom adds custom matchers for asserting on DOM nodes, e.g.
// expect(element).toHaveTextContent(/react/i)
// https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest';

// Vitest loads .env / .env.local like Vite does. Start every test with the
// Google Drive feature unconfigured so a developer's real client id cannot
// change test behaviour; tests that need it stub a fake id themselves.
beforeEach(() => {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
});
