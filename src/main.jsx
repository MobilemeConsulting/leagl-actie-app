import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { LanguageProvider } from './context/LanguageContext.jsx';

const path = window.location.pathname;

async function mount() {
  const root = ReactDOM.createRoot(document.getElementById('root'));

  if (path === '/voice') {
    const { default: VoicePage } = await import('./pages/VoicePage.jsx')
    root.render(<VoicePage />)
  } else if (path === '/assistant') {
    const { default: AssistantPage } = await import('./pages/AssistantPage.jsx')
    root.render(<AssistantPage />)
  } else if (path === '/assistant/settings') {
    const { default: AssistantSettingsPage } = await import('./pages/AssistantSettingsPage.jsx')
    root.render(<AssistantSettingsPage />)
  } else if (path === '/admin') {
    const { default: AdminDashboard } = await import('./pages/AdminDashboard.jsx');
    root.render(<LanguageProvider><AdminDashboard /></LanguageProvider>);
  } else if (path === '/superadmin') {
    const { default: SuperAdminDashboard } = await import('./pages/SuperAdminDashboard.jsx');
    root.render(<LanguageProvider><SuperAdminDashboard /></LanguageProvider>);
  } else {
    const { default: App } = await import('./App.jsx');
    root.render(
      <React.StrictMode>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </React.StrictMode>
    );
  }
}

mount();
