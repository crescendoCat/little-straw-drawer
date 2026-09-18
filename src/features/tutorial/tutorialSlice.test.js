import reducer, { startTutorial, next, previous, endTutorial, tutorialDefault } from './tutorialSlice';

const initialState = reducer(undefined, { type: '@@INIT' });
const lastIndex = tutorialDefault.tutorials.length - 1;

describe('tutorialSlice', () => {
  test('initial state shows the first step', () => {
    expect(initialState.currentPosition).toBe(0);
    expect(initialState.showTutorial).toBe('show');
    expect(initialState.display.description).toBe(tutorialDefault.tutorials[0].description);
  });

  test('next advances and clamps at the last step', () => {
    let state = reducer(initialState, next());
    expect(state.currentPosition).toBe(1);
    expect(state.display).toEqual(tutorialDefault.tutorials[1]);

    for (let i = 0; i < tutorialDefault.tutorials.length + 5; i++) {
      state = reducer(state, next());
    }
    expect(state.currentPosition).toBe(lastIndex);
    expect(state.display).toEqual(tutorialDefault.tutorials[lastIndex]);
  });

  test('previous steps back and hides the tutorial when going before the first step', () => {
    let state = reducer(initialState, next());
    state = reducer(state, previous());
    expect(state.currentPosition).toBe(0);
    expect(state.showTutorial).toBe('show');

    state = reducer(state, previous());
    expect(state.currentPosition).toBe(0);
    expect(state.showTutorial).toBe('hide');
  });

  test('endTutorial hides and startTutorial resets', () => {
    let state = reducer(initialState, next());
    state = reducer(state, endTutorial());
    expect(state.showTutorial).toBe('hide');

    state = reducer(state, startTutorial());
    expect(state.showTutorial).toBe('show');
    expect(state.currentPosition).toBe(0);
    expect(state.display).toEqual(tutorialDefault.tutorials[0]);
  });
});
