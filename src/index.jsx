import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.scss';
import App from './App';
import store from "./app/store"
import { Provider } from 'react-redux'

const root = ReactDOM.createRoot(document.getElementById('root'));
window.screen.orientation.lock('portrait-primary');
root.render(
  <Provider store={store}>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </Provider>
);

