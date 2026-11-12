import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw, Search, Users, X, XCircle,
} from 'lucide-react';
import { api, ErreurApi } from '../../lib/api.js';

const COLONNES = [
  {
    id: 'a_passer',
    titre: 'À passer en entretien',
    vide: 'Tous les groupes ont été évalués.',
    badge: 'bg-amber-100 text-amber-800',
    bordure: 'border-t-4 border-t-caramel-500',
    statuts: new Set(['EN_ATTENTE', 'ENTRETIEN']),
  },
  {
    id: 'acceptes',
    titre: 'Acceptés',
    vide: 'Aucun groupe accepté pour le moment.',
    badge: 'bg-emerald-100 text-emerald-800',
    bordure: 'border-t-4 border-t-emerald-600',
    statuts: new Set(['ACCEPTE']),
  },
  {
    id: 'rejetes',
    titre: 'Rejetés',
    vide: 'Aucun groupe rejeté.',
    badge: 'bg-red-100 text-red-700',
    bordure: 'border-t-4 border-t-red-500',
    statuts: new Set(['REJETE']),
  },
];

const BADGES_STATUT = {
  EN_ATTENTE: { libelle: 'En attente', classe: 'bg-amber-100 text-amber-800' },
  ENTRETIEN: { libelle: 'En entretien', classe: 'bg-sky-100 text-sky-800' },
  ACCEPTE: { libelle: 'Accepté', classe: 'bg-emerald-100 text-emerald-800' },
  REJETE: { libelle: 'Rejeté', classe: 'bg-red-100 text-red-700' },
};

function correspondRecherche(ins, terme) {
  if (!terme) return true;
  const q = terme.toLowerCase();
  return [
    ins.nom_groupe,
    ins.nom_projet,
    ins.reference,
    ...ins.membres.flatMap((m) => [`${m.prenom} ${m.nom}`, m.departement, m.metier]),
  ].some((val) => val?.toLowerCase().includes(q));
}

function FicheEntretien({ inscription, onFermer, onEnregistre }) {
  const [notes, setNotes] = useState(inscription.notes_admin || '');
  const [enregistrement, setEnregistrement] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    setNotes(inscription.notes_admin || '');
    setErreur(null);
  }, [inscription]);

  useEffect(() => {
    const echap = (e) => e.key === 'Escape' && onFermer();
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [onFermer]);

  const decider = async (nouveauStatut, fermerApres = true) => {
    setEnregistrement(nouveauStatut);
    setErreur(null);
    try {
      const maj = await api(`/admin/inscriptions/${inscription.id}/`, {
        method: 'PATCH',
        body: { statut: nouveauStatut, notes_admin: notes },
        auth: true,
      });
      onEnregistre(maj, fermerApres);
    } catch (err) {
      setErreur(err instanceof ErreurApi ? err.message : 'Échec de l’enregistrement.');
    } finally {
      setEnregistrement(null);
    }
  };

  const badge = BADGES_STATUT[inscription.statut] ?? { libelle: inscription.statut, classe: 'bg-brun-100 text-brun-700' };
  const enCours = enregistrement !== null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-brun-900/40" onClick={onFermer}>
      <aside
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        aria-label={`Entretien du groupe ${inscription.nom_groupe}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-brun-100 px-6 py-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-caramel-600">{inscription.reference}</span>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.classe}`}>
                {badge.libelle}
              </span>
            </div>
            <h2 className="mt-1 text-xl font-extrabold text-brun-800">{inscription.nom_groupe}</h2>
            <p className="text-sm text-brun-500">
              Projet : <span className="font-semibold text-brun-800">{inscription.nom_projet}</span>
            </p>
          </div>
          <button type="button" onClick={onFermer} className="rounded-lg p-2 text-brun-500 hover:bg-brun-50" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-brun-500">Présentation du projet</h3>
            <p className="whitespace-pre-line rounded-xl bg-brun-50 p-4 text-sm leading-relaxed text-brun-800">
              {inscription.description_projet}
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-brun-500">
              Membres du groupe ({inscription.membres.length})
            </h3>
            <div className="divide-y divide-brun-100 overflow-hidden rounded-xl border border-brun-100">
              {inscription.membres.map((m, i) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div>
                    <p className="font-bold text-brun-800">
                      {m.prenom} {m.nom}
                      {i === 0 && (
                        <span className="ml-2 rounded-md bg-caramel-100 px-2 py-0.5 text-xs font-semibold text-caramel-600">
                          Responsable
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-brun-500">{m.metier}</p>
                  </div>
                  <span className="rounded-lg bg-brun-50 px-2.5 py-1 text-xs font-semibold text-brun-700">
                    {m.departement}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <label htmlFor="notes-entretien" className="mb-2 block text-xs font-bold uppercase tracking-wider text-brun-500">
              Notes de l’entretien
            </label>
            <textarea
              id="notes-entretien"
              rows={4}
              className="champ"
              placeholder="Impressions du jury, points forts, questions à suivre…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </section>

          {erreur && (
            <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {erreur}
            </p>
          )}
        </div>

        <div className="border-t border-brun-100 bg-brun-50/70 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {inscription.statut !== 'ENTRETIEN' && inscription.statut !== 'EN_ATTENTE' ? (
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => decider('ENTRETIEN')}
                  className="btn-secondaire"
                >
                  {enregistrement === 'ENTRETIEN' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                  Remettre à passer
                </button>
              ) : (
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => decider(inscription.statut === 'EN_ATTENTE' ? 'ENTRETIEN' : inscription.statut, false)}
                  className="btn-secondaire"
                >
                  {enregistrement === 'ENTRETIEN' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Enregistrer notes
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {inscription.statut !== 'REJETE' && (
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => decider('REJETE')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  {enregistrement === 'REJETE' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Rejeter
                </button>
              )}
              {inscription.statut !== 'ACCEPTE' && (
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => decider('ACCEPTE')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {enregistrement === 'ACCEPTE' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Accepter
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function Entretiens({ onDeconnexion, onMajStats }) {
  const [inscriptions, setInscriptions] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [selection, setSelection] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      setInscriptions(await api('/admin/inscriptions/', { auth: true }));
    } catch (err) {
      if (err instanceof ErreurApi && err.status === 401) return onDeconnexion();
      setErreur('Impossible de charger les groupes.');
    } finally {
      setChargement(false);
    }
  }, [onDeconnexion]);

  useEffect(() => { charger(); }, [charger]);

  const surEnregistre = (maj, fermer) => {
    setInscriptions((liste) => liste.map((x) => (x.id === maj.id ? maj : x)));
    onMajStats?.();
    const libelle = BADGES_STATUT[maj.statut]?.libelle ?? maj.statut;
    setConfirmation(`${maj.nom_groupe} — ${fermer ? `statut mis à jour : ${libelle}` : 'notes enregistrées'}.`);
    if (fermer) setSelection(null);
    else setSelection(maj);
  };

  const filtrees = useMemo(
    () => inscriptions.filter((ins) => correspondRecherche(ins, recherche.trim())),
    [inscriptions, recherche],
  );

  const groupesParColonne = useMemo(
    () => COLONNES.map((col) => ({
      ...col,
      items: filtrees.filter((ins) => col.statuts.has(ins.statut)),
    })),
    [filtrees],
  );

  const totaux = useMemo(() => ({
    total: inscriptions.length,
    aPasser: inscriptions.filter((i) => i.statut === 'EN_ATTENTE' || i.statut === 'ENTRETIEN').length,
    acceptes: inscriptions.filter((i) => i.statut === 'ACCEPTE').length,
    rejetes: inscriptions.filter((i) => i.statut === 'REJETE').length,
  }), [inscriptions]);

  return (
    <div className="space-y-6">
      {/* Compteurs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Total groupes', totaux.total, 'text-brun-800'],
          ['À passer', totaux.aPasser, 'text-amber-700'],
          ['Acceptés', totaux.acceptes, 'text-emerald-700'],
          ['Rejetés', totaux.rejetes, 'text-red-600'],
        ].map(([libelle, valeur, couleur]) => (
          <div key={libelle} className="rounded-2xl border border-brun-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brun-500">{libelle}</p>
            <p className={`mt-1 text-3xl font-extrabold tabular-nums ${couleur}`}>{valeur}</p>
          </div>
        ))}
      </div>

      {/* Barre de recherche */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brun-400" />
          <input
            type="search"
            className="champ pl-10"
            placeholder="Rechercher un groupe, un projet, une référence ou un membre…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            aria-label="Rechercher un groupe"
          />
        </div>
        <button type="button" onClick={charger} className="btn-secondaire self-start sm:self-auto" aria-label="Actualiser">
          <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      {confirmation && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" /> {confirmation}</span>
          <button type="button" onClick={() => setConfirmation(null)} className="text-emerald-700 hover:text-emerald-900" aria-label="Fermer le message">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {erreur && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> {erreur}
        </p>
      )}

      {chargement && inscriptions.length === 0 ? (
        <div className="flex justify-center py-20 text-brun-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3 lg:items-start">
          {groupesParColonne.map((col) => (
            <section key={col.id} className={`rounded-2xl border border-brun-100 bg-white ${col.bordure}`}>
              <div className="flex items-center justify-between border-b border-brun-100 px-5 py-4">
                <h2 className="text-base font-extrabold text-brun-800">{col.titre}</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${col.badge}`}>
                  {col.items.length}
                </span>
              </div>

              {col.items.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-brun-400">{col.vide}</p>
              ) : (
                <ul className="divide-y divide-brun-100">
                  {col.items.map((ins) => {
                    const chef = ins.membres[0];
                    return (
                      <li key={ins.id}>
                        <button
                          type="button"
                          onClick={() => { setConfirmation(null); setSelection(ins); }}
                          className="w-full px-5 py-4 text-left transition hover:bg-caramel-100/30"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-brun-800">{ins.nom_groupe}</p>
                            {ins.statut === 'ENTRETIEN' && (
                              <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                                En cours
                              </span>
                            )}
                            {ins.statut === 'ACCEPTE' && ins.acceptation_envoyee_le && (
                              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                Mail envoyé
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm font-medium text-brun-600">{ins.nom_projet}</p>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-brun-400">
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" /> {ins.membres.length} membres
                              {chef && ` · ${chef.prenom} ${chef.nom}`}
                            </span>
                            <span className="font-mono">{ins.reference}</span>
                          </div>
                          {ins.notes_admin && (
                            <p className="mt-2 line-clamp-2 rounded-lg bg-brun-50 px-2.5 py-1.5 text-xs text-brun-600">
                              {ins.notes_admin}
                            </p>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {selection && (
        <FicheEntretien
          inscription={selection}
          onFermer={() => setSelection(null)}
          onEnregistre={surEnregistre}
        />
      )}
    </div>
  );
}

