import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Import Tailwind CSS global styles
import './index.css';

// Mount the React app to the #root div in index.html
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
