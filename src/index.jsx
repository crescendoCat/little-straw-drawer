import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.scss';
import App from './App';
import store from "./app/store"
import { Provider } from 'react-redux'
import { lockPortrait } from './utils';

const root = ReactDOM.createRoot(document.getElementById('root'));
lockPortrait(); // best effort; silently unsupported on desktop browsers
root.render(
  <Provider store={store}>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </Provider>
);

