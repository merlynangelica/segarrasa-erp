import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErpProvider } from './store/erpContext';
import { AppContent } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErpProvider>
      <AppContent />
    </ErpProvider>
  </React.StrictMode>
);
