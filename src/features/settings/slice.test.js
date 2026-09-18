import reducer, {
  openSettings,
  closeSettings,
  setDisplaySettings,
  setRepeatable,
  setShowAnimation,
  setAnimationType,
  setAnimationTimeout,
  hydrate,
} from './slice';

const initialState = reducer(undefined, { type: '@@INIT' });

describe('settingsSlice', () => {
  test('initial state', () => {
    expect(initialState).toEqual({
      isRepeatable: true,
      showAnimation: true,
      animationType: 'default',
      displaySetting: false,
      animationTimeout: 500,
    });
  });

  test('openSettings / closeSettings / setDisplaySettings', () => {
    let state = reducer(initialState, openSettings());
    expect(state.displaySetting).toBe(true);
    state = reducer(state, closeSettings());
    expect(state.displaySetting).toBe(false);
    state = reducer(state, setDisplaySettings(true));
    expect(state.displaySetting).toBe(true);
  });

  test('setRepeatable and setShowAnimation', () => {
    let state = reducer(initialState, setRepeatable(false));
    expect(state.isRepeatable).toBe(false);
    state = reducer(state, setShowAnimation(false));
    expect(state.showAnimation).toBe(false);
  });

  test('setAnimationType', () => {
    expect(reducer(initialState, setAnimationType('wheel')).animationType).toBe('wheel');
  });

  test('setAnimationTimeout parses numeric strings', () => {
    expect(reducer(initialState, setAnimationTimeout('1500')).animationTimeout).toBe(1500);
    expect(reducer(initialState, setAnimationTimeout(200)).animationTimeout).toBe(200);
  });

  describe('hydrate (restore from backup)', () => {
    test('merges the four backed-up fields', () => {
      const state = reducer(
        initialState,
        hydrate({ isRepeatable: false, showAnimation: false, animationType: 'wheel', animationTimeout: 900 })
      );
      expect(state).toEqual({
        isRepeatable: false,
        showAnimation: false,
        animationType: 'wheel',
        animationTimeout: 900,
        displaySetting: false,
      });
    });

    test('never touches displaySetting', () => {
      const open = reducer(initialState, openSettings());
      const state = reducer(open, hydrate({ isRepeatable: false, displaySetting: false }));
      expect(state.displaySetting).toBe(true);
      expect(state.isRepeatable).toBe(false);
    });

    test('ignores wrong types, unknown keys and non-object payloads', () => {
      const state = reducer(
        initialState,
        hydrate({ isRepeatable: 'yes', showAnimation: 1, animationType: 5, animationTimeout: 'fast', bogus: true })
      );
      expect(state).toEqual(initialState);
      expect(reducer(initialState, hydrate(null))).toEqual(initialState);
      expect(reducer(initialState, hydrate('x'))).toEqual(initialState);
    });

    test('accepts a partial payload', () => {
      const state = reducer(initialState, hydrate({ animationTimeout: 250 }));
      expect(state).toEqual({ ...initialState, animationTimeout: 250 });
    });
  });
});
