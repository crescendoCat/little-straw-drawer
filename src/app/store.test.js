import { isValidElement } from 'react';
import {
  createAppStore,
  PERSISTED_STATES,
  STORAGE_NAMESPACE,
  storageKeyFor,
  defaultPreloadedState,
} from './store';
import { addStraw, savePreset, addHistory, removeStraw } from '../features/straw/strawSlice';
import { setRepeatable, setAnimationTimeout } from '../features/settings/slice';
import { startTutorial, endTutorial, tutorialDefault } from '../features/tutorial/tutorialSlice';
import { markWhatsNewSeen, WHATS_NEW_VERSION } from '../features/whatsNew/whatsNewSlice';
import { cloudInitialState } from '../features/cloud/cloudSlice';
import { linkDrive, saveToDrive, resolveConflict, unlinkDrive } from '../features/cloud/cloudThunks';
import { hydrate as hydrateStraw } from '../features/straw/strawSlice';
import { hydrate as hydrateSettings } from '../features/settings/slice';
import { SNAPSHOT_APP, PRE_RESTORE_BACKUP_KEY, validateSnapshot } from '../features/cloud/snapshot';

const seed = (path, value) => localStorage.setItem(storageKeyFor(path), JSON.stringify(value));
const readKey = (path) => {
  const raw = localStorage.getItem(storageKeyFor(path));
  return raw === null ? null : JSON.parse(raw);
};
const white = { r: 255, g: 255, b: 255, a: 1 };

/** State an app from the Create React App era would have written. */
const legacyStraw = {
  straws: [
    { id: 0, name: 'Alpha', rgb: { r: 255, g: 105, b: 0, a: 1 }, isPicked: true },
    { id: 3, name: 'Beta' },
  ],
  history: [{ id: 0, name: 'Alpha', color: { r: 255, g: 105, b: 0, a: 1 } }],
  presets: [{ id: 0, value: [{ id: 0, name: 'Alpha' }, { id: 3, name: 'Beta' }] }],
  strawCount: 4,
  presetCount: 1,
  isPlayingAnimation: false,
};
const legacySettings = {
  isRepeatable: false,
  showAnimation: false,
  animationType: 'default',
  displaySetting: false,
  animationTimeout: 800,
};

describe('localStorage persistence (src/app/store.js)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('contract', () => {
    test('persisted paths are exactly the documented list', () => {
      expect(PERSISTED_STATES).toEqual([
        'settings',
        'straw',
        'tutorial.showTutorial',
        'whatsNew.seenVersion',
        'cloud.linked',
        'cloud.fileId',
        'cloud.lastSyncedAt',
        'cloud.lastSyncedFingerprint',
      ]);
    });

    test('keys use the library default namespace and keep the dot of nested paths', () => {
      expect(STORAGE_NAMESPACE).toBe('redux_localstorage_simple');
      expect(storageKeyFor('straw')).toBe('redux_localstorage_simple_straw');
      expect(storageKeyFor('tutorial.showTutorial')).toBe('redux_localstorage_simple_tutorial.showTutorial');
    });

    test('defaultPreloadedState seeds every slice with its initial state', () => {
      const base = defaultPreloadedState();
      expect(Object.keys(base).sort()).toEqual(['cloud', 'settings', 'straw', 'tutorial', 'whatsNew']);
      expect(base.straw.straws).toHaveLength(3);
      expect(base.tutorial).toEqual(tutorialDefault);
      expect(base.cloud).toEqual(cloudInitialState);
      expect(Object.isFrozen(base.straw)).toBe(false); // load() mutates the base while merging
    });
  });

  describe('first run', () => {
    test('boots with defaults, without throwing or warning, when storage is empty', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const store = createAppStore();
      const state = store.getState();
      expect(state.straw.straws.map((s) => s.name)).toEqual(['Some', 'Little', 'Straw']);
      expect(state.settings.isRepeatable).toBe(true);
      expect(state.tutorial.showTutorial).toBe('hide');
      expect(state.whatsNew.seenVersion).toBeNull();
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('writing', () => {
    test('every action lands in localStorage synchronously', () => {
      const store = createAppStore();

      store.dispatch(addStraw({ name: 'New', rgb: white }));
      expect(readKey('straw')).toEqual(store.getState().straw);

      store.dispatch(savePreset());
      store.dispatch(addHistory({ id: 0, name: 'Some', color: white }));
      expect(readKey('straw')).toEqual(store.getState().straw);
      expect(readKey('straw').presets).toHaveLength(1);
      expect(readKey('straw').history).toHaveLength(1);

      store.dispatch(setRepeatable(false));
      expect(readKey('settings')).toEqual(store.getState().settings);

      store.dispatch(startTutorial());
      expect(readKey('tutorial.showTutorial')).toBe('show');
      store.dispatch(endTutorial());
      expect(readKey('tutorial.showTutorial')).toBe('hide');

      store.dispatch(markWhatsNewSeen());
      expect(readKey('whatsNew.seenVersion')).toBe(WHATS_NEW_VERSION);
    });

    test('only the documented keys are written (falsy nested values are left out)', () => {
      const store = createAppStore();
      store.dispatch(addStraw('x'));
      store.dispatch(markWhatsNewSeen());
      const keys = Object.keys(localStorage).sort();
      // cloud.* are all falsy while unlinked, so the library removes those keys
      expect(keys).toEqual(['settings', 'straw', 'tutorial.showTutorial', 'whatsNew.seenVersion'].map(storageKeyFor).sort());
    });

    test('a store created with persist:false never touches localStorage', () => {
      const store = createAppStore({ persist: false });
      store.dispatch(addStraw('x'));
      store.dispatch(markWhatsNewSeen());
      expect(localStorage.length).toBe(0);
    });

    test('a failing localStorage write (quota) does not break the app state', () => {
      const store = createAppStore();
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      });

      expect(() => store.dispatch(addStraw('Still here'))).not.toThrow();
      expect(store.getState().straw.straws.map((s) => s.name)).toContain('Still here');
    });
  });

  describe('reading back', () => {
    test('a full session round-trips through a new store', () => {
      const first = createAppStore();
      first.dispatch(addStraw({ name: 'Round', rgb: white }));
      first.dispatch(removeStraw({ id: 0 }));
      first.dispatch(savePreset());
      first.dispatch(addHistory({ id: 1, name: 'Little', color: white }));
      first.dispatch(setRepeatable(false));
      first.dispatch(setAnimationTimeout('900'));
      first.dispatch(startTutorial());
      first.dispatch(markWhatsNewSeen());

      const second = createAppStore();
      expect(second.getState().straw).toEqual(first.getState().straw);
      expect(second.getState().settings).toEqual(first.getState().settings);
      expect(second.getState().tutorial.showTutorial).toBe('show');
      expect(second.getState().whatsNew.seenVersion).toBe(WHATS_NEW_VERSION);
    });

    test('ids keep incrementing after a reload (counters are persisted)', () => {
      const first = createAppStore();
      first.dispatch(addStraw('A')); // id 3
      first.dispatch(removeStraw({ id: 3 }));

      const second = createAppStore();
      second.dispatch(addStraw('B'));
      const ids = second.getState().straw.straws.map((s) => s.id);
      expect(ids).toEqual([0, 1, 2, 4]);
      expect(new Set(ids).size).toBe(ids.length);
    });

    test('the tutorial content (JSX) is untouched by persistence', () => {
      const first = createAppStore();
      first.dispatch(startTutorial());

      const second = createAppStore();
      const { tutorial } = second.getState();
      expect(tutorial.tutorials).toHaveLength(tutorialDefault.tutorials.length);
      expect(isValidElement(tutorial.tutorials[8].description)).toBe(true);
      expect(tutorial.display).toBeDefined();
      expect(tutorial.currentPosition).toBe(0);
    });

    test('nested paths merge onto the slice defaults instead of replacing the slice', () => {
      seed('tutorial.showTutorial', 'show');
      const { tutorial } = createAppStore().getState();
      expect(tutorial.showTutorial).toBe('show');
      expect(tutorial.tutorials).toEqual(tutorialDefault.tutorials);
      expect(tutorial.display).toEqual(tutorialDefault.display);
    });

    test('falsy values survive a reload', () => {
      const first = createAppStore();
      first.dispatch(setRepeatable(false));
      expect(createAppStore().getState().settings.isRepeatable).toBe(false);
    });
  });

  describe('upgrading from older versions', () => {
    test('data written by the Create React App build is loaded unchanged', () => {
      seed('straw', legacyStraw);
      seed('settings', legacySettings);
      seed('tutorial.showTutorial', 'show');
      // no whatsNew key: that slice did not exist yet

      const state = createAppStore().getState();
      expect(state.straw).toEqual(legacyStraw);
      expect(state.settings).toEqual(legacySettings);
      expect(state.tutorial.showTutorial).toBe('show');
      expect(state.whatsNew.seenVersion).toBeNull();
    });

    test('fields missing from a stored slice fall back to defaults without losing the rest', () => {
      const { presetCount, history, isPlayingAnimation, ...partial } = legacyStraw;
      seed('straw', partial);

      const { straw } = createAppStore().getState();
      expect(straw.straws).toEqual(legacyStraw.straws);
      expect(straw.presets).toEqual(legacyStraw.presets);
      expect(straw.strawCount).toBe(legacyStraw.strawCount);
      expect(straw.history).toEqual([]);
      expect(straw.presetCount).toBe(0);
      expect(straw.isPlayingAnimation).toBe(false);
    });

    test('an empty straws array is respected (the user deleted everything)', () => {
      seed('straw', { ...legacyStraw, straws: [] });
      expect(createAppStore().getState().straw.straws).toEqual([]);
    });

    test('a corrupt key falls back to defaults for that slice only', () => {
      localStorage.setItem(storageKeyFor('settings'), '{not json');
      seed('straw', legacyStraw);

      let store;
      expect(() => {
        store = createAppStore();
      }).not.toThrow();
      expect(store.getState().settings.isRepeatable).toBe(true);
      expect(store.getState().settings.animationTimeout).toBe(500);
      expect(store.getState().straw).toEqual(legacyStraw);
    });

    test('a corrupt key is overwritten by the next action instead of poisoning future loads', () => {
      localStorage.setItem(storageKeyFor('straw'), 'garbage');
      const store = createAppStore();
      store.dispatch(addStraw('Recovered'));
      expect(readKey('straw').straws.map((s) => s.name)).toContain('Recovered');
      expect(createAppStore().getState().straw.straws.map((s) => s.name)).toContain('Recovered');
    });
  });

  describe('Google Drive link (cloud slice)', () => {
    const syncedPayload = {
      outcome: 'synced',
      fileId: 'file-1',
      savedAt: '2026-09-19T08:00:00.000Z',
      fingerprint: 'deadbeef:42',
    };
    const remoteData = {
      straw: {
        straws: [{ id: 10, name: 'Remote' }],
        history: [],
        presets: [],
        strawCount: 11,
        presetCount: 0,
      },
      settings: { isRepeatable: false, showAnimation: true, animationType: 'default', animationTimeout: 650 },
    };

    test('only the four link fields are persisted; transient fields stay in memory', () => {
      const store = createAppStore();
      store.dispatch({ type: linkDrive.pending.type });
      store.dispatch({ type: saveToDrive.rejected.type, payload: { code: 'api', message: 'boom' } });
      expect(store.getState().cloud.error).toBe('boom');

      const cloudKeys = Object.keys(localStorage).filter((k) => k.startsWith(storageKeyFor('cloud')));
      expect(cloudKeys).toEqual([]); // still unlinked: every persisted field is falsy

      store.dispatch({ type: linkDrive.fulfilled.type, payload: syncedPayload });
      expect(readKey('cloud.linked')).toBe(true);
      expect(readKey('cloud.fileId')).toBe('file-1');
      expect(readKey('cloud.lastSyncedAt')).toBe(syncedPayload.savedAt);
      expect(readKey('cloud.lastSyncedFingerprint')).toBe(syncedPayload.fingerprint);
      expect(localStorage.getItem(storageKeyFor('cloud.busy'))).toBeNull();
      expect(localStorage.getItem(storageKeyFor('cloud.error'))).toBeNull();
      expect(localStorage.getItem(storageKeyFor('cloud.pendingRemote'))).toBeNull();
    });

    test('the link survives a reload while transient fields reset', () => {
      const first = createAppStore();
      first.dispatch({ type: linkDrive.fulfilled.type, payload: syncedPayload });
      first.dispatch({ type: saveToDrive.pending.type });

      const { cloud } = createAppStore().getState();
      expect(cloud).toEqual({
        ...cloudInitialState,
        linked: true,
        fileId: 'file-1',
        lastSyncedAt: syncedPayload.savedAt,
        lastSyncedFingerprint: syncedPayload.fingerprint,
      });
      expect(cloud.busy).toBe('idle');
    });

    test('an unlinked device reloads with the complete cloud default state', () => {
      const store = createAppStore();
      store.dispatch(addStraw('x'));
      expect(createAppStore().getState().cloud).toEqual(cloudInitialState);
    });

    test('a restore is written to localStorage immediately, so a reload keeps the restored data', () => {
      const store = createAppStore();
      store.dispatch(hydrateStraw(remoteData.straw));
      store.dispatch(hydrateSettings(remoteData.settings));

      expect(readKey('straw').straws).toEqual(remoteData.straw.straws);
      expect(readKey('settings').animationTimeout).toBe(650);

      const reloaded = createAppStore().getState();
      expect(reloaded.straw.straws).toEqual(remoteData.straw.straws);
      expect(reloaded.straw.strawCount).toBe(11);
      expect(reloaded.settings.isRepeatable).toBe(false);
    });

    test('resolving a conflict by restoring keeps a pre-restore copy of the local data', async () => {
      const store = createAppStore();
      store.dispatch(addStraw('Local only'));
      const localNames = store.getState().straw.straws.map((s) => s.name);
      store.dispatch({
        type: linkDrive.fulfilled.type,
        payload: {
          outcome: 'conflict',
          fileId: 'file-1',
          pendingRemote: {
            fileId: 'file-1',
            modifiedTime: 't',
            savedAt: '2026-09-18T00:00:00.000Z',
            snapshot: { version: 1, app: SNAPSHOT_APP, savedAt: '2026-09-18T00:00:00.000Z', data: remoteData },
          },
        },
      });

      await store.dispatch(resolveConflict('restore'));

      expect(store.getState().straw.straws.map((s) => s.name)).toEqual(['Remote']);
      expect(readKey('straw').straws.map((s) => s.name)).toEqual(['Remote']);

      const backup = validateSnapshot(JSON.parse(localStorage.getItem(PRE_RESTORE_BACKUP_KEY)));
      expect(backup.data.straw.straws.map((s) => s.name)).toEqual(localNames);
      expect(backup.data.straw.straws.map((s) => s.name)).toContain('Local only');
    });

    test('unlinking forgets the link but leaves local data keys untouched', async () => {
      const store = createAppStore();
      store.dispatch(addStraw('Stays'));
      store.dispatch({ type: linkDrive.fulfilled.type, payload: syncedPayload });
      const strawBefore = localStorage.getItem(storageKeyFor('straw'));
      const settingsBefore = localStorage.getItem(storageKeyFor('settings'));

      await store.dispatch(unlinkDrive());

      expect(store.getState().cloud).toEqual(cloudInitialState);
      expect(localStorage.getItem(storageKeyFor('cloud.linked'))).toBeNull();
      expect(localStorage.getItem(storageKeyFor('cloud.fileId'))).toBeNull();
      expect(localStorage.getItem(storageKeyFor('straw'))).toBe(strawBefore);
      expect(localStorage.getItem(storageKeyFor('settings'))).toBe(settingsBefore);
      expect(createAppStore().getState().straw.straws.map((s) => s.name)).toContain('Stays');
    });
  });
});
