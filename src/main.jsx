import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Route /admin to the full admin panel, everything else to the regular app
const isAdmin = window.location.pathname === '/admin';

async function mount() {
  const root = ReactDOM.createRoot(document.getElementById('root'));

  if (isAdmin) {
    const { default: AdminDashboard } = await import('./pages/AdminDashboard.jsx');
    root.render(<AdminDashboard />);
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
