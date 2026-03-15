import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

const path = window.location.pathname;

async function mount() {
  const root = ReactDOM.createRoot(document.getElementById('root'));

  if (path === '/admin') {
    const { default: AdminDashboard } = await import('./pages/AdminDashboard.jsx');
    root.render(<AdminDashboard />);
  } else if (path === '/superadmin') {
    const { default: SuperAdminDashboard } = await import('./pages/SuperAdminDashboard.jsx');
    root.render(<SuperAdminDashboard />);
  } else {
    const { default: App } = await import('./App.jsx');
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

mount();
