import {
  SNAPSHOT_VERSION,
  SNAPSHOT_APP,
  pickSnapshotData,
  buildSnapshot,
  stableStringify,
  fingerprint,
  validateSnapshot,
  SnapshotError,
} from './snapshot';
import { makeStore } from '../../test/renderWithStore';
import { addStraw, setIsPlayingAnimation, updateStraw } from '../straw/strawSlice';
import { openSettings } from '../settings/slice';

const rootState = () => makeStore().getState();

describe('pickSnapshotData / buildSnapshot', () => {
  test('contains only the whitelisted straw and settings fields', () => {
    const store = makeStore();
    store.dispatch(setIsPlayingAnimation(true));
    store.dispatch(openSettings());

    const data = pickSnapshotData(store.getState());
    expect(Object.keys(data)).toEqual(['straw', 'settings']);
    expect(Object.keys(data.straw)).toEqual(['straws', 'history', 'presets', 'strawCount', 'presetCount']);
    expect(Object.keys(data.settings)).toEqual(['isRepeatable', 'showAnimation', 'animationType', 'animationTimeout']);
    expect(data.straw).not.toHaveProperty('isPlayingAnimation');
    expect(data.settings).not.toHaveProperty('displaySetting');
  });

  test('buildSnapshot adds version, app and an ISO timestamp', () => {
    const now = new Date('2026-09-19T12:00:00.000Z');
    const snap = buildSnapshot(rootState(), now);
    expect(snap).toMatchObject({ version: SNAPSHOT_VERSION, app: SNAPSHOT_APP, savedAt: '2026-09-19T12:00:00.000Z' });
    expect(snap.data).toEqual(pickSnapshotData(rootState()));
  });
});

describe('stableStringify', () => {
  test('sorts object keys recursively and keeps array order', () => {
    const a = { b: 1, a: { d: [3, { z: 1, y: 2 }], c: null } };
    const b = { a: { c: null, d: [3, { y: 2, z: 1 }] }, b: 1 };
    expect(stableStringify(a)).toBe(stableStringify(b));
    expect(stableStringify(a)).toBe('{"a":{"c":null,"d":[3,{"y":2,"z":1}]},"b":1}');
  });

  test('matches JSON semantics for undefined and primitives', () => {
    expect(stableStringify({ a: undefined, b: 'x' })).toBe('{"b":"x"}');
    expect(stableStringify([undefined, 1])).toBe('[null,1]');
    expect(stableStringify('s')).toBe('"s"');
    expect(stableStringify(null)).toBe('null');
  });
});

describe('fingerprint', () => {
  test('is stable across key order and object identity', () => {
    const a = pickSnapshotData(rootState());
    const b = JSON.parse(JSON.stringify(a));
    b.straw.straws[0] = { name: b.straw.straws[0].name, id: b.straw.straws[0].id }; // reordered keys
    expect(fingerprint(a)).toBe(fingerprint(b));
    expect(fingerprint(a)).toMatch(/^[0-9a-f]{8}:\d+$/);
  });

  test('changes when any backed-up value changes', () => {
    const store = makeStore();
    const before = fingerprint(pickSnapshotData(store.getState()));
    store.dispatch(updateStraw({ id: 0, name: 'Renamed' }));
    expect(fingerprint(pickSnapshotData(store.getState()))).not.toBe(before);
  });

  test('ignores transient fields', () => {
    const store = makeStore();
    const before = fingerprint(pickSnapshotData(store.getState()));
    store.dispatch(setIsPlayingAnimation(true));
    store.dispatch(openSettings());
    expect(fingerprint(pickSnapshotData(store.getState()))).toBe(before);
  });
});

describe('validateSnapshot', () => {
  const valid = () => buildSnapshot(rootState());

  test('accepts what buildSnapshot produces and normalizes it', () => {
    const snap = valid();
    const out = validateSnapshot(JSON.parse(JSON.stringify(snap)));
    expect(out.version).toBe(SNAPSHOT_VERSION);
    expect(out.savedAt).toBe(snap.savedAt);
    expect(out.data.straw.straws).toEqual(snap.data.straw.straws);
    expect(out.data.straw.strawCount).toBe(3);
    expect(out.data.settings).toEqual(snap.data.settings);
  });

  test('tolerates missing optional parts', () => {
    const out = validateSnapshot({
      version: 1,
      app: SNAPSHOT_APP,
      data: { straw: { straws: [{ id: 7, name: 'Only', rgb: { r: 1, g: 2, b: 3, a: 1 } }] } },
    });
    expect(out.data.straw).toEqual({ straws: [{ id: 7, name: 'Only', rgb: { r: 1, g: 2, b: 3, a: 1 } }], history: [], presets: [] });
    expect(out.data.settings).toEqual({});
    expect(out.savedAt).toBeUndefined();
  });

  test('drops invalid counters so hydrate recomputes them', () => {
    const out = validateSnapshot({
      version: 1,
      app: SNAPSHOT_APP,
      data: { straw: { straws: [], strawCount: -1, presetCount: 'x' } },
    });
    expect(out.data.straw).not.toHaveProperty('strawCount');
    expect(out.data.straw).not.toHaveProperty('presetCount');
  });

  test.each([
    ['not an object', null, 'not_object'],
    ['an array', [], 'not_object'],
    ['another app', { ...valid(), app: 'other' }, 'wrong_app'],
    ['a newer version', { ...valid(), version: SNAPSHOT_VERSION + 1 }, 'unsupported_version'],
    ['no version', { ...valid(), version: undefined }, 'malformed'],
    ['no data', { version: 1, app: SNAPSHOT_APP }, 'malformed'],
    ['straws not an array', { version: 1, app: SNAPSHOT_APP, data: { straw: { straws: 'x' } } }, 'malformed'],
    ['a straw with a string id', { version: 1, app: SNAPSHOT_APP, data: { straw: { straws: [{ id: '1', name: 'a' }] } } }, 'malformed'],
    ['a straw without a name', { version: 1, app: SNAPSHOT_APP, data: { straw: { straws: [{ id: 1 }] } } }, 'malformed'],
    ['a preset without value', { version: 1, app: SNAPSHOT_APP, data: { straw: { straws: [], presets: [{ id: 0 }] } } }, 'malformed'],
    ['history not an array', { version: 1, app: SNAPSHOT_APP, data: { straw: { straws: [], history: {} } } }, 'malformed'],
    ['settings not an object', { version: 1, app: SNAPSHOT_APP, data: { straw: { straws: [] }, settings: 5 } }, 'malformed'],
  ])('rejects %s', (_label, input, code) => {
    expect(() => validateSnapshot(input)).toThrow(SnapshotError);
    try {
      validateSnapshot(input);
    } catch (err) {
      expect(err.code).toBe(code);
    }
  });

  test('a snapshot with a rejected straw is discarded entirely, not partially', () => {
    const input = { version: 1, app: SNAPSHOT_APP, data: { straw: { straws: [{ id: 0, name: 'ok' }, { id: 1 }] } } };
    expect(() => validateSnapshot(input)).toThrow(SnapshotError);
  });
});

describe('addStraw keeps the snapshot valid', () => {
  test('a freshly added straw round-trips through validateSnapshot', () => {
    const store = makeStore();
    store.dispatch(addStraw({ name: 'New', rgb: { r: 1, g: 2, b: 3, a: 1 } }));
    const snap = JSON.parse(JSON.stringify(buildSnapshot(store.getState())));
    expect(() => validateSnapshot(snap)).not.toThrow();
  });
});
