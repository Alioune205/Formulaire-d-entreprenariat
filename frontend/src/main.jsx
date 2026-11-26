import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Accueil from './pages/Accueil.jsx';
import Admin from './pages/Admin.jsx';
import Recuperation from './pages/Recuperation.jsx';
import Elections from './pages/Elections.jsx';
import Vote from './pages/Vote.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/elections" element={<Elections />} />
        <Route path="/postes" element={<Elections />} />
        <Route path="/vote" element={<Vote />} />
        {/* Période de vote : le suivi des dossiers d'inscription est retiré, on renvoie vers le vote. */}
        <Route path="/suivi" element={<Navigate to="/vote" replace />} />
        <Route path="/recuperation" element={<Recuperation />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
