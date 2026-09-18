import { createSlice } from '@reduxjs/toolkit';

/**
 * Bump this whenever the notes below change so returning users see the
 * modal once more. Any string works; a date keeps it easy to reason about.
 */
export const WHATS_NEW_VERSION = '2026-09-19';

export const WHATS_NEW_NOTES = [
  {
    title: 'Back up to Google Drive',
    description:
      'Tap the cloud icon next to the settings gear to link your Google Drive, then save or restore your straws, presets, history and settings on any device.',
  },
  {
    title: 'New color picker',
    description: 'Tap the palette icon on a straw to pick from ten swatches or type any hex color.',
  },
  {
    title: 'Share to X',
    description: 'The share bar now uses fresh icons and supports X (formerly Twitter).',
  },
  {
    title: 'Faster and lighter',
    description: 'The app was rebuilt on modern tooling, so it loads quicker and works better offline.',
  },
];

export const whatsNewSlice = createSlice({
  name: 'whatsNew',
  initialState: {
    // version string the user last dismissed; persisted to localStorage
    seenVersion: null,
  },
  reducers: {
    markWhatsNewSeen: (state) => {
      state.seenVersion = WHATS_NEW_VERSION;
    },
    resetWhatsNew: (state) => {
      state.seenVersion = null;
    },
  },
});

export const selectShouldShowWhatsNew = (state) => state.whatsNew.seenVersion !== WHATS_NEW_VERSION;

export const { markWhatsNewSeen, resetWhatsNew } = whatsNewSlice.actions;

export default whatsNewSlice.reducer;
