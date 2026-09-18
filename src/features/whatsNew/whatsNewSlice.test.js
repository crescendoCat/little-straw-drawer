import reducer, {
  WHATS_NEW_VERSION,
  WHATS_NEW_NOTES,
  markWhatsNewSeen,
  resetWhatsNew,
  selectShouldShowWhatsNew,
} from './whatsNewSlice';

const initialState = reducer(undefined, { type: '@@INIT' });

describe('whatsNewSlice', () => {
  test('has at least one note and a version string', () => {
    expect(typeof WHATS_NEW_VERSION).toBe('string');
    expect(WHATS_NEW_NOTES.length).toBeGreaterThan(0);
  });

  test('new users should see the modal', () => {
    expect(initialState.seenVersion).toBeNull();
    expect(selectShouldShowWhatsNew({ whatsNew: initialState })).toBe(true);
  });

  test('markWhatsNewSeen hides it for the current version', () => {
    const state = reducer(initialState, markWhatsNewSeen());
    expect(state.seenVersion).toBe(WHATS_NEW_VERSION);
    expect(selectShouldShowWhatsNew({ whatsNew: state })).toBe(false);
  });

  test('a user who saw an older version sees it again', () => {
    const state = { seenVersion: 'ancient' };
    expect(selectShouldShowWhatsNew({ whatsNew: state })).toBe(true);
  });

  test('resetWhatsNew clears the seen version', () => {
    let state = reducer(initialState, markWhatsNewSeen());
    state = reducer(state, resetWhatsNew());
    expect(state.seenVersion).toBeNull();
  });
});
