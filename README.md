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

## Project layout

```
index.html                 Vite entry HTML (analytics tags live here)
public/                    Static assets copied verbatim to the build
src/index.jsx              App bootstrap (Redux Provider, StrictMode)
src/App.jsx                Main screen and draw logic
src/components/            UI components (Straw list, results, menu, settings, tutorial, ColorPicker)
src/features/              Redux slices: straw, settings, tutorial
src/app/store.js           Store setup with localStorage persistence
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
