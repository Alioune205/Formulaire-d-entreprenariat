import { Clock } from 'lucide-react';
import { formatDateLimite } from '../lib/useDateLimite.js';

const deux = (n) => String(n).padStart(2, '0');

/** variante "sombre" (sur le hero) ou "clair" (au-dessus du formulaire). */
export default function CompteARebours({ temps, variante = 'sombre' }) {
  const { ouvert, jours, heures, minutes, secondes, dateLimite } = temps;
  const sombre = variante === 'sombre';

  if (!ouvert) {
    return (
      <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${sombre ? 'bg-white/10 text-white' : 'bg-red-50 text-red-700'}`}>
        <Clock className="h-4 w-4" /> Les inscriptions sont closes.
      </div>
    );
  }

  const blocs = [[jours, jours > 1 ? 'jours' : 'jour'], [heures, 'heures'], [minutes, 'min'], [secondes, 'sec']];

  return (
    <div>
      <p className={`mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${sombre ? 'text-caramel-200' : 'text-caramel-600'}`}>
        <Clock className="h-4 w-4" /> Clôture des inscriptions : {formatDateLimite(dateLimite)}
      </p>
      <div className="flex gap-2 sm:gap-3" role="timer" aria-live="off" aria-label={`Il reste ${jours} jours, ${heures} heures et ${minutes} minutes`}>
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
    </div>
  );
}
