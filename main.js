import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';

const root = document.getElementById('root');
try {
  createRoot(root).render(React.createElement(App));
} catch (e) {
  root.innerHTML = "PropDesk — Startfehler:<br><span style='color:#F0705A'>" + (e.message || e) + '</span>';
}
