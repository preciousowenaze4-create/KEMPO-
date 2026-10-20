import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Auto-update service worker caches so mobile browsers load the latest build
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.update();
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
