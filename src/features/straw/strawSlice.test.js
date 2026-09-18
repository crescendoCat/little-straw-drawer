import reducer, {
  addStraw,
  addStraws,
  removeStraw,
  updateStraw,
  addHistory,
  clearHistory,
  savePreset,
  loadPreset,
  removePreset,
  setIsPlayingAnimation,
} from './strawSlice';

const initialState = reducer(undefined, { type: '@@INIT' });

describe('strawSlice', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('initial state contains three default straws', () => {
    expect(initialState.straws.map((s) => s.name)).toEqual(['Some', 'Little', 'Straw']);
    expect(initialState.strawCount).toBe(3);
    expect(initialState.history).toEqual([]);
    expect(initialState.presets).toEqual([]);
    expect(initialState.isPlayingAnimation).toBe(false);
  });

  describe('addStraw', () => {
    test('adds a straw from a string payload and increments strawCount', () => {
      const state = reducer(initialState, addStraw('New'));
      expect(state.straws).toHaveLength(4);
      expect(state.straws[3]).toEqual({ id: 3, name: 'New' });
      expect(state.strawCount).toBe(4);
    });

    test('adds a straw from an object payload with rgb', () => {
      const rgb = { r: 1, g: 2, b: 3, a: 1 };
      const state = reducer(initialState, addStraw({ name: 'Colored', rgb }));
      expect(state.straws[3]).toEqual({ id: 3, name: 'Colored', rgb });
    });

    test('assigns unique ids even after a straw is removed', () => {
      let state = reducer(initialState, removeStraw({ id: 2 }));
      state = reducer(state, addStraw('X'));
      expect(state.straws.map((s) => s.id)).toEqual([0, 1, 3]);
    });
  });

  describe('addStraws', () => {
    test('inserts multiple straws before the straw with the given id', () => {
      const state = reducer(
        initialState,
        addStraws({ afterIndex: 1, straws: [{ name: 'A' }, { name: 'B', rgb: { r: 0, g: 0, b: 0 } }] })
      );
      expect(state.straws.map((s) => s.name)).toEqual(['Some', 'A', 'B', 'Little', 'Straw']);
      expect(state.straws[1].id).toBe(3);
      expect(state.straws[2]).toEqual({ id: 4, name: 'B', rgb: { r: 0, g: 0, b: 0 } });
      expect(state.strawCount).toBe(5);
    });

    test('skips entries without a string name', () => {
      const state = reducer(
        initialState,
        addStraws({ afterIndex: 0, straws: [{ name: 42 }, { name: 'ok' }] })
      );
      expect(state.straws.map((s) => s.name)).toEqual(['ok', 'Some', 'Little', 'Straw']);
      expect(state.strawCount).toBe(4);
    });

    test.each([
      ['straws is not an array', { afterIndex: 0, straws: 'nope' }],
      ['straws is empty', { afterIndex: 0, straws: [] }],
      ['afterIndex is not a number', { afterIndex: '0', straws: [{ name: 'A' }] }],
      ['afterIndex does not exist', { afterIndex: 999, straws: [{ name: 'A' }] }],
    ])('ignores payload when %s', (_label, payload) => {
      const state = reducer(initialState, addStraws(payload));
      expect(state).toEqual(initialState);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('removeStraw / updateStraw', () => {
    test('removes the straw by id', () => {
      const state = reducer(initialState, removeStraw({ id: 1 }));
      expect(state.straws.map((s) => s.id)).toEqual([0, 2]);
    });

    test('updates name, rgb and isPicked', () => {
      const rgb = { r: 9, g: 9, b: 9, a: 1 };
      const state = reducer(initialState, updateStraw({ id: 1, name: 'Renamed', rgb, isPicked: true }));
      expect(state.straws[1]).toEqual({ id: 1, name: 'Renamed', rgb, isPicked: true });
      expect(state.straws[0]).toEqual(initialState.straws[0]);
    });

    test('does nothing when id is missing', () => {
      const state = reducer(initialState, updateStraw({ name: 'nope' }));
      expect(state).toEqual(initialState);
    });
  });

  describe('history', () => {
    test('addHistory appends and clearHistory resets picked flags', () => {
      let state = reducer(initialState, updateStraw({ id: 0, isPicked: true }));
      state = reducer(state, addHistory({ id: 0, name: 'Some' }));
      expect(state.history).toEqual([{ id: 0, name: 'Some' }]);

      state = reducer(state, clearHistory());
      expect(state.history).toEqual([]);
      expect(state.straws.every((s) => s.isPicked === false)).toBe(true);
    });
  });

  describe('presets', () => {
    test('savePreset stores a snapshot of current straws', () => {
      const state = reducer(initialState, savePreset());
      expect(state.presets).toHaveLength(1);
      expect(state.presets[0]).toEqual({ id: 0, value: initialState.straws });
      expect(state.presetCount).toBe(1);
    });

    test('savePreset is a no-op when there are no straws', () => {
      const empty = { ...initialState, straws: [] };
      const state = reducer(empty, savePreset());
      expect(state.presets).toEqual([]);
      expect(state.presetCount).toBe(0);
    });

    test('loadPreset restores saved straws', () => {
      let state = reducer(initialState, savePreset());
      state = reducer(state, removeStraw({ id: 0 }));
      state = reducer(state, removeStraw({ id: 1 }));
      expect(state.straws).toHaveLength(1);

      state = reducer(state, loadPreset({ id: 0 }));
      expect(state.straws).toEqual(initialState.straws);
    });

    test('removePreset deletes by id', () => {
      let state = reducer(initialState, savePreset());
      state = reducer(state, savePreset());
      state = reducer(state, removePreset({ id: 0 }));
      expect(state.presets.map((p) => p.id)).toEqual([1]);
    });
  });

  test('setIsPlayingAnimation toggles the flag', () => {
    const state = reducer(initialState, setIsPlayingAnimation(true));
    expect(state.isPlayingAnimation).toBe(true);
    expect(reducer(state, setIsPlayingAnimation(false)).isPlayingAnimation).toBe(false);
  });
});
