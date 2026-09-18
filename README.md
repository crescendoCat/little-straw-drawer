# Little Straw Drawer (Mi Mi Draw Machine)

A tiny web app for drawing straws and keeping track of the results. State is
persisted in `localStorage`. Built with React 18, Redux Toolkit, Bootstrap and
[Vite](https://vite.dev/); tests run on [Vitest](https://vitest.dev/).

## Requirements

- Node.js 24 (see `.nvmrc` / `.node-version`; `nvm use` or `fnm use` picks it up automatically)
- npm 10 or later

## Available Scripts

In the project directory, you can run:

### `npm run dev` (alias: `npm start`)

Runs the app in development mode with hot module replacement.Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### `npm test`

Launches Vitest in watch mode.

### `npm run test:ci`

Runs the whole test suite once without watch mode (for CI or a quick local check).

### `npm run build`

Builds the app for production to the `build` folder.The output is minified and file names include content hashes.

### `npm run preview`

Serves the production build locally so you can check it before deploying.

## Google Drive backup

Users can back up their straws, presets, drawing history and settings to
their **own** Google Drive and restore them on another device. Everything runs
in the browser: Google Identity Services issues a short-lived access token,
and the app talks to the Drive REST API directly. There is no server and no
refresh token; a token lives in memory for about an hour and is requested
again the next time the user saves or restores.

The backup is one JSON file, `little-straw-drawer.json`, stored in Drive's
hidden **app-data folder** (`drive.appdata` scope). It does not appear in the
user's Drive listing and the app cannot read any other file. Users can remove
it from Google Drive → Settings → *Manage apps*.

### How it works in the UI

- A cloud icon sits in the menu bar next to the settings gear:
  grey = not linked, amber = changes not yet saved, green = backed up,
  spinning = working, red = error (hover for the message).
- Not linked: clicking the icon starts the Google sign-in and links this
  device. If Drive already holds a different backup, a dialog asks whether to
  restore it here or keep this device's data.
- Linked: a **Save to Drive** button appears next to the icon and lights up
  when there are unsaved changes. Clicking the icon opens a small menu with
  *Save to Drive now*, *Restore from Drive…* and *Unlink Google Drive*.
- Saving is manual by design. Before any restore the current local data is
  copied to the browser's localStorage under `little-straw-drawer.preRestoreBackup`.

### Setup (once per deployment)

1. In [Google Cloud Console](https://console.cloud.google.com/) create or pick
   a project and enable **Google Drive API** (APIs & Services → Library).
2. Configure the **OAuth consent screen**: user type *External*, add the scope
   `https://www.googleapis.com/auth/drive.appdata`. This scope is
   non-sensitive, so publishing the app does not require a Google review.
   While the app is in *Testing* mode only the listed test users can link.
3. Create an **OAuth client ID** of type *Web application*. Under
   *Authorized JavaScript origins* add `http://localhost:3000` and the
   production origin(s). No redirect URIs are needed for the token flow.
4. Put the client id in `.env.local` (see `.env.example`):

   ```
   VITE_GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
   ```

   The value is baked in at build time. On a hosting platform set it as a
   **build** environment variable and rebuild after changing it. When it is
   missing the feature is simply disabled.

Do not send a `Cross-Origin-Opener-Policy: same-origin` header from the host;
it prevents the Google sign-in popup from reporting back. `same-origin-allow-popups`
is fine.

## Project layout

```
index.html                 Vite entry HTML (analytics tags live here)
public/                    Static assets copied verbatim to the build
src/index.jsx              App bootstrap (Redux Provider, StrictMode)
src/App.jsx                Main screen and draw logic
src/components/            UI components (Straw list, results, menu, settings, tutorial,
                           ColorPicker, CloudStatus + CloudConflictModal)
src/features/              Redux slices: straw, settings, tutorial, whatsNew, cloud
src/features/cloud/        Backup snapshot helpers, cloud slice and Google Drive thunks
src/lib/googleDrive.js     Browser-only Google Identity Services + Drive REST client
src/app/store.js           Store factory and the localStorage persistence contract
src/utils.js               Color helpers and hooks
src/test/renderWithStore   Test helper that renders with a fresh in-memory store
vite.config.js             Vite + Vitest configuration
```

## Migration notes (from Create React App)

- `react-scripts` was replaced by Vite 8 and Vitest 5. Files containing JSX use the `.jsx` extension.
- `public/index.html` moved to the project root; `%PUBLIC_URL%` became plain absolute paths.
- `moment` (unused) and `react-color` were dropped. Color picking now uses a small
  `ColorPicker` component built on [`react-colorful`](https://github.com/omgovich/react-colorful).
- `react-spring` was narrowed to `@react-spring/web`.
