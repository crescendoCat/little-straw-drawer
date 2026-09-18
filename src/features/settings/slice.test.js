import reducer, {
  openSettings,
  closeSettings,
  setDisplaySettings,
  setRepeatable,
  setShowAnimation,
  setAnimationType,
  setAnimationTimeout,
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
});
