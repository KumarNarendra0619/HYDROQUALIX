import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './leaflet-setup';
import './lib/firebase';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
