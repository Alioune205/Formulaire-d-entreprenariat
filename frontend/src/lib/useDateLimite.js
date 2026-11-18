import { useEffect, useState } from 'react';
import { api } from './api.js';

// Valeur de secours si l'API est injoignable.
const DATE_LIMITE_SECOURS = '2026-11-14T23:59:59+00:00';

/**
 * Renvoie l'état d'ouverture des inscriptions contrôlé depuis l'administration,
 * ainsi que les données de date limite éventuelles.
 */
export default function useDateLimite() {
  const [dateLimite, setDateLimite] = useState(() => new Date(DATE_LIMITE_SECOURS));
  const [ouvert, setOuvert] = useState(true);
  const [decalage, setDecalage] = useState(0);
  const [maintenant, setMaintenant] = useState(() => Date.now());

  useEffect(() => {
    let actif = true;
    api('/infos/')
      .then((d) => {
        if (!actif || !d) return;
        if (typeof d.inscriptions_ouvertes === 'boolean') {
          setOuvert(d.inscriptions_ouvertes);
        }
        if (d.date_limite) setDateLimite(new Date(d.date_limite));
        if (d.maintenant) setDecalage(new Date(d.maintenant).getTime() - Date.now());
      })
      .catch(() => {});
    const t = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => { actif = false; clearInterval(t); };
  }, []);

  const restant = Math.max(0, dateLimite.getTime() - (maintenant + decalage));
  return {
    dateLimite,
    ouvert,
    aCompteARebours: restant > 0,
    jours: Math.floor(restant / 86_400_000),
    heures: Math.floor((restant / 3_600_000) % 24),
    minutes: Math.floor((restant / 60_000) % 60),
    secondes: Math.floor((restant / 1000) % 60),
  };
}

export const formatDateLimite = (d) =>
  d.toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar',
  });
