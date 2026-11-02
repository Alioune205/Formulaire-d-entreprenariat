import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Accueil from './pages/Accueil.jsx';
import Admin from './pages/Admin.jsx';
import Suivi from './pages/Suivi.jsx';
import Recuperation from './pages/Recuperation.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/suivi" element={<Suivi />} />
        <Route path="/recuperation" element={<Recuperation />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
