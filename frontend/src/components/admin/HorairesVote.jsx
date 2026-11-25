import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarClock, CheckCircle2, History, Loader2, Lock, Square } from 'lucide-react';
import { api, ErreurApi } from '../../lib/api.js';

// Heure de Dakar = UTC (pas d'heure d'été) : les champs datetime-local sont en UTC.
const versChamp = (iso) => new Date(iso).toISOString().slice(0, 16);
const depuisChamp = (v) => `${v}:00+00:00`;
const ajouter = (iso, minutes) => new Date(new Date(iso).getTime() + minutes * 60000).toISOString();

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar',
  });
}
const court = (iso) => new Date(iso).toLocaleString('fr-FR', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar',
});

/** Prolonger, avancer ou clore le vote depuis le back-office. Chaque changement est journalisé avec son motif. */
export default function HorairesVote({ onMaj, onDeconnexion }) {
  const [h, setH] = useState(null);
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');
  const [motif, setMotif] = useState('');
  const [confirmer, setConfirmer] = useState(null); // { libelle, corps }
  const [erreur, setErreur] = useState(null);
  const [ok, setOk] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  const appliquer = (d) => {
    setH(d);
    setDebut(versChamp(d.vote_debut));
    setFin(versChamp(d.vote_fin));
  };

  const charger = useCallback(async () => {
    try {
      appliquer(await api('/admin/vote/horaires/', { auth: true }));
    } catch (err) {
      if (err instanceof ErreurApi && err.status === 401) onDeconnexion();
      else setErreur(err instanceof ErreurApi ? err.message : 'Impossible de joindre le serveur.');
    }
  }, [onDeconnexion]);

  useEffect(() => { charger(); }, [charger]);

  if (!h) {
    return erreur
      ? <p className="flex items-center gap-2 text-sm text-red-700"><AlertCircle className="h-4 w-4" /> {erreur}</p>
      : null;
  }

  const clos = h.vote_etat === 'clos';
  const ouvert = h.vote_etat === 'ouvert';

  const preparer = (corps, libelle) => {
    setErreur(null);
    setOk(null);
    if (motif.trim().length < 5) {
      setErreur('Indiquez le motif (ex. « Décision de la commission : coupure Internet au campus »).');
      return;
    }
    setConfirmer({ corps: { ...corps, motif: motif.trim() }, libelle });
  };

  const envoyer = async () => {
    setEnvoi(true);
    try {
      const d = await api('/admin/vote/horaires/', { method: 'POST', body: confirmer.corps, auth: true });
      appliquer(d);
      setMotif('');
      setOk('Horaires mis à jour. Le site affiche déjà les nouvelles heures.');
      onMaj?.();
    } catch (err) {
      if (err instanceof ErreurApi && err.status === 401) onDeconnexion();
      else setErreur(err instanceof ErreurApi ? err.message : 'Impossible de joindre le serveur.');
    } finally {
      setEnvoi(false);
      setConfirmer(null);
    }
  };

  const enregistrer = () => preparer(
    { debut: depuisChamp(debut), fin: depuisChamp(fin) },
    `Ouverture : ${formatDate(depuisChamp(debut))}\nClôture : ${formatDate(depuisChamp(fin))}`,
  );
  const prolonger = (minutes) => {
    const nouvelle = ajouter(h.vote_fin, minutes);
    preparer({ fin: nouvelle }, `Prolonger la clôture au ${formatDate(nouvelle)}`);
  };

  return (
    <section className="rounded-2xl border border-brun-100 bg-white p-6 print:hidden">
      <h3 className="flex items-center gap-2 text-lg font-extrabold text-brun-800">
        <CalendarClock className="h-5 w-5 text-caramel-500" /> Horaires du scrutin
      </h3>

      {clos ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-brun-50 p-4 text-sm text-brun-700">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          Le vote est clos : les horaires sont verrouillés car les résultats sont désormais visibles.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-brun-600">
            Heure de Dakar. Toute modification doit être décidée par la commission électorale : elle est enregistrée
            dans le journal ci-dessous avec son motif.
            {ouvert && ' Le vote a commencé : seule l’heure de clôture peut encore changer.'}
          </p>

          {erreur && <p role="alert" className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /> {erreur}</p>}
          {ok && <p role="status" className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4 shrink-0" /> {ok}</p>}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="h_debut" className="label">Ouverture</label>
              <input id="h_debut" type="datetime-local" className="champ disabled:bg-brun-50 disabled:text-brun-400"
                value={debut} onChange={(e) => setDebut(e.target.value)} disabled={ouvert} />
            </div>
            <div>
              <label htmlFor="h_fin" className="label">Clôture</label>
              <input id="h_fin" type="datetime-local" className="champ" value={fin} onChange={(e) => setFin(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="h_motif" className="label">Motif <span className="text-red-600">*</span></label>
              <input id="h_motif" className="champ" placeholder="Ex. Décision de la commission : forte affluence, prolongation d’1 h"
                value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={300} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-primaire" onClick={enregistrer} disabled={envoi}>Enregistrer les horaires</button>
            {[30, 60, 120].map((m) => (
              <button key={m} type="button" className="btn-secondaire" onClick={() => prolonger(m)} disabled={envoi}>
                + {m < 60 ? `${m} min` : `${m / 60} h`}
              </button>
            ))}
            {ouvert && (
              <button type="button" disabled={envoi}
                onClick={() => preparer({ clore_maintenant: true }, 'Clore le vote MAINTENANT. Les résultats deviendront visibles et le vote ne pourra plus être rouvert.')}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50">
                <Square className="h-4 w-4" /> Clore maintenant
              </button>
            )}
          </div>
        </>
      )}

      <div className="mt-6">
        <p className="flex items-center gap-2 text-sm font-bold text-brun-700"><History className="h-4 w-4" /> Journal des modifications</p>
        {h.journal.length ? (
          <ul className="mt-2 divide-y divide-brun-50 rounded-xl border border-brun-100 text-sm">
            {h.journal.map((j) => (
              <li key={j.le} className="px-3 py-2.5">
                <p className="font-semibold text-brun-800">
                  {court(j.le)} · {j.par} : {court(j.debut_apres)} → {court(j.fin_apres)}
                  <span className="font-normal text-brun-400"> (avant : {court(j.debut_avant)} → {court(j.fin_avant)})</span>
                </p>
                <p className="text-brun-600">{j.motif}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-brun-400">Aucune modification : horaires d’origine.</p>
        )}
      </div>

      {confirmer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brun-900/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h4 className="text-xl font-extrabold text-brun-900">Confirmer la modification ?</h4>
            <p className="mt-3 whitespace-pre-line rounded-xl bg-brun-50 p-3 text-sm font-semibold text-brun-800">{confirmer.libelle}</p>
            <p className="mt-3 text-sm text-brun-600">Motif : {confirmer.corps.motif}</p>
            <div className="mt-6 flex gap-3">
              <button type="button" className="btn-secondaire flex-1" disabled={envoi} onClick={() => setConfirmer(null)}>Annuler</button>
              <button type="button" className="btn-primaire flex-1" disabled={envoi} onClick={envoyer}>
                {envoi && <Loader2 className="h-4 w-4 animate-spin" />} Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
