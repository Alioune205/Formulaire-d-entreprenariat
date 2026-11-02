import { useEffect, useState } from 'react';
import { api } from './api.js';

// Valeur de secours si l'API est injoignable : mercredi 11 novembre 2026, 23 h 59 (heure de Dakar = UTC).
const DATE_LIMITE_SECOURS = '2026-11-11T23:59:59+00:00';

/**
 * Renvoie la date limite d'inscription et le temps restant, mis à jour chaque seconde.
 * L'heure du serveur est utilisée pour corriger une éventuelle horloge déréglée sur le téléphone.
 */
export default function useDateLimite() {
  const [dateLimite, setDateLimite] = useState(() => new Date(DATE_LIMITE_SECOURS));
  const [decalage, setDecalage] = useState(0);
  const [maintenant, setMaintenant] = useState(() => Date.now());

  useEffect(() => {
    let actif = true;
    api('/infos/')
      .then((d) => {
        if (!actif) return;
        setDateLimite(new Date(d.date_limite));
        setDecalage(new Date(d.maintenant).getTime() - Date.now());
      })
      .catch(() => {});
    const t = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => { actif = false; clearInterval(t); };
  }, []);

  const restant = Math.max(0, dateLimite.getTime() - (maintenant + decalage));
  return {
    dateLimite,
    ouvert: restant > 0,
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
