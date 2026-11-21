import { CheckCircle2, Clock, Vote } from 'lucide-react';
import { formatDateLimite } from '../lib/useDateLimite.js';

const deux = (n) => String(n).padStart(2, '0');

function Blocs({ t, sombre }) {
  const blocs = [[t.jours, t.jours > 1 ? 'jours' : 'jour'], [t.heures, 'heures'], [t.minutes, 'min'], [t.secondes, 'sec']];
  return (
    <div className="flex gap-2 sm:gap-3" role="timer" aria-live="off" aria-label={`Il reste ${t.jours} jours, ${t.heures} heures et ${t.minutes} minutes`}>
      {blocs.map(([valeur, libelle]) => (
        <div
          key={libelle}
          className={`flex w-[4.25rem] flex-col items-center rounded-xl py-2.5 sm:w-20 sm:py-3 ${
            sombre ? 'border border-white/15 bg-white/10 backdrop-blur' : 'border border-brun-100 bg-white shadow-sm'
          }`}
        >
          <span className={`text-2xl font-extrabold tabular-nums sm:text-3xl ${sombre ? 'text-white' : 'text-brun-800'}`}>
            {deux(valeur)}
          </span>
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${sombre ? 'text-brun-200' : 'text-brun-500'}`}>
            {libelle}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Compte à rebours jusqu'à la clôture des candidatures aux élections (`temps.elections`). */
export function CompteAReboursElections({ elections, variante = 'sombre' }) {
  const sombre = variante === 'sombre';
  if (!elections.ouvert) {
    return (
      <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${sombre ? 'bg-white/10 text-white' : 'bg-brun-50 text-brun-800'}`}>
        <Vote className="h-4 w-4" /> Le dépôt des candidatures est clos. Merci à tous les candidat(e)s !
      </div>
    );
  }
  return (
    <div>
      <p className={`mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${sombre ? 'text-caramel-200' : 'text-caramel-700'}`}>
        <Clock className="h-4 w-4" /> Candidatures prolongées jusqu'au {formatDateLimite(elections.dateLimite)}
      </p>
      <Blocs t={elections} sombre={sombre} />
    </div>
  );
}

/** variante "sombre" (sur le hero) ou "clair" (au-dessus du formulaire). */
export default function CompteARebours({ temps, variante = 'sombre' }) {
  const { ouvert, aCompteARebours, jours, heures, minutes, secondes, dateLimite } = temps;
  const sombre = variante === 'sombre';

  if (!ouvert) {
    return (
      <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${sombre ? 'bg-white/10 text-white' : 'bg-red-50 text-red-700'}`}>
        <Clock className="h-4 w-4" /> Les inscriptions sont actuellement fermées.
      </div>
    );
  }

  if (!aCompteARebours) {
    return (
      <div
        className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-bold ${
          sombre
            ? 'border border-caramel-400/40 bg-caramel-500/20 text-caramel-200 backdrop-blur-sm'
            : 'border border-caramel-200 bg-caramel-50 text-brun-800'
        }`}
      >
        <CheckCircle2 className={`h-4 w-4 shrink-0 ${sombre ? 'text-caramel-300' : 'text-caramel-600'}`} />
        Inscriptions réouvertes — Candidat seul (1 membre) ou équipe (jusqu’à 6)
      </div>
    );
  }

  return (
    <div>
      <p className={`mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${sombre ? 'text-caramel-200' : 'text-caramel-600'}`}>
        <Clock className="h-4 w-4" /> Clôture des inscriptions : {formatDateLimite(dateLimite)}
      </p>
      <Blocs t={{ jours, heures, minutes, secondes }} sombre={sombre} />
    </div>
  );
}
