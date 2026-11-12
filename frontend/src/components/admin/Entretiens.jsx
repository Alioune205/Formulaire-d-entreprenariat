import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowRight, CheckCircle2, Clock, Columns3, FileText, Loader2, RefreshCw, Search, Users, X, XCircle,
} from 'lucide-react';
import { api, ErreurApi } from '../../lib/api.js';

const COLONNES = [
  {
    id: 'a_passer',
    filtre: 'A_PASSER',
    titre: 'À passer en entretien',
    vide: 'Tous les groupes ont été évalués.',
    point: 'bg-caramel-500',
    entete: 'bg-caramel-100/50',
    badge: 'bg-white text-brun-800 border border-caramel-200',
    statuts: new Set(['EN_ATTENTE', 'ENTRETIEN']),
  },
  {
    id: 'acceptes',
    filtre: 'ACCEPTE',
    titre: 'Acceptés',
    vide: 'Aucun groupe accepté pour le moment.',
    point: 'bg-emerald-600',
    entete: 'bg-emerald-50/80',
    badge: 'bg-white text-emerald-800 border border-emerald-200',
    statuts: new Set(['ACCEPTE']),
  },
  {
    id: 'rejetes',
    filtre: 'REJETE',
    titre: 'Rejetés',
    vide: 'Aucun groupe rejeté.',
    point: 'bg-red-500',
    entete: 'bg-red-50/80',
    badge: 'bg-white text-red-700 border border-red-200',
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

function resumeDepartements(membres) {
  const deps = [...new Set(membres.map((m) => m.departement).filter(Boolean))];
  if (deps.length > 1) return { libelle: 'Mixte TIC + Auto', classe: 'bg-caramel-100 text-caramel-600' };
  if (deps[0] === 'Automobile') return { libelle: 'Automobile', classe: 'bg-brun-100 text-brun-700' };
  if (deps[0] === 'TIC') return { libelle: 'TIC', classe: 'bg-sky-50 text-sky-700' };
  return null;
}

function CarteGroupe({ ins, onClick }) {
  const chef = ins.membres[0];
  const dep = resumeDepartements(ins.membres);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-xl border border-brun-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-caramel-400 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-brun-900 group-hover:text-caramel-600">
            {ins.nom_groupe}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-relaxed text-brun-600">
            {ins.nom_projet}
          </p>
        </div>
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

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md bg-brun-50 px-2 py-0.5 text-[11px] font-semibold text-brun-700">
          <Users className="h-3 w-3 text-brun-400" /> {ins.membres.length} membres
        </span>
        {dep && (
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${dep.classe}`}>
            {dep.libelle}
          </span>
        )}
        <span className="ml-auto font-mono text-[11px] text-brun-400">{ins.reference}</span>
      </div>

      {ins.notes_admin && (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-brun-50 px-2.5 py-2 text-xs text-brun-600">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-caramel-500" />
          <span className="line-clamp-2">{ins.notes_admin}</span>
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-brun-50 pt-2.5 text-xs">
        <span className="truncate text-brun-500">
          {chef ? `Resp. : ${chef.prenom} ${chef.nom}` : 'Aucun membre'}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-caramel-600 opacity-80 transition group-hover:translate-x-0.5 group-hover:opacity-100">
          Ouvrir <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
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
  const dep = resumeDepartements(inscription.membres);
  const enCours = enregistrement !== null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-brun-900/50 backdrop-blur-[1px]" onClick={onFermer}>
      <aside
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        aria-label={`Entretien du groupe ${inscription.nom_groupe}`}
      >
        {/* En-tête institutionnel */}
        <div className="bg-brun-800 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-caramel-200">{inscription.reference}</span>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${badge.classe}`}>
                  {badge.libelle}
                </span>
                {dep && (
                  <span className="inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
                    {dep.libelle}
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-2xl font-extrabold">{inscription.nom_groupe}</h2>
              <p className="mt-0.5 text-sm text-caramel-200">
                Projet : <span className="font-semibold text-white">{inscription.nom_projet}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onFermer}
              className="rounded-xl p-2 text-brun-200 transition hover:bg-white/10 hover:text-white"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-brun-500">Présentation du projet</h3>
            <p className="whitespace-pre-line rounded-2xl border border-brun-100 bg-brun-50 p-4 text-sm leading-relaxed text-brun-800">
              {inscription.description_projet}
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-brun-500">
              Membres du groupe ({inscription.membres.length})
            </h3>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {inscription.membres.map((m, i) => (
                <div key={m.id} className="rounded-xl border border-brun-100 bg-white p-3.5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-brun-900">{m.prenom} {m.nom}</p>
                    {i === 0 && (
                      <span className="shrink-0 rounded-md bg-caramel-100 px-2 py-0.5 text-[11px] font-bold text-caramel-600">
                        Responsable
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-caramel-600">{m.departement}</p>
                  <p className="mt-0.5 text-xs text-brun-500">{m.metier}</p>
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
              placeholder="Impressions du jury, points forts, remarques…"
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

        {/* Décision en un clic */}
        <div className="border-t border-brun-100 bg-brun-50 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
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
                  {enregistrement === 'ENTRETIEN' && <Loader2 className="h-4 w-4 animate-spin" />}
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
  const [filtreVue, setFiltreVue] = useState('TOUS'); // TOUS (3 colonnes) | A_PASSER | ACCEPTE | REJETE
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

  const totaux = useMemo(() => {
    const total = inscriptions.length;
    const acceptes = inscriptions.filter((i) => i.statut === 'ACCEPTE').length;
    const rejetes = inscriptions.filter((i) => i.statut === 'REJETE').length;
    const aPasser = total - acceptes - rejetes;
    const evalues = acceptes + rejetes;
    return {
      total,
      aPasser,
      acceptes,
      rejetes,
      evalues,
      pctAcceptes: total ? (100 * acceptes) / total : 0,
      pctRejetes: total ? (100 * rejetes) / total : 0,
      pctEvalues: total ? Math.round((100 * evalues) / total) : 0,
    };
  }, [inscriptions]);

  const tuiles = [
    ['TOUS', 'Vue globale', totaux.total, 'text-brun-800', 'Toutes les colonnes'],
    ['A_PASSER', 'À passer', totaux.aPasser, 'text-amber-700', 'En attente de passage'],
    ['ACCEPTE', 'Acceptés', totaux.acceptes, 'text-emerald-700', 'Groupes retenus'],
    ['REJETE', 'Rejetés', totaux.rejetes, 'text-red-600', 'Non retenus'],
  ];

  const colonneActive = COLONNES.find((c) => c.filtre === filtreVue);
  const itemsVueFocus = colonneActive ? filtrees.filter((ins) => colonneActive.statuts.has(ins.statut)) : [];

  return (
    <div className="space-y-5">
      {/* Progression & Compteurs cliquables */}
      <div className="rounded-2xl border border-brun-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-bold text-brun-800">
            Avancement des entretiens : {totaux.evalues} / {totaux.total} groupe{totaux.total > 1 ? 's' : ''} évalué{totaux.evalues > 1 ? 's' : ''}
          </span>
          <span className="font-extrabold tabular-nums text-caramel-600">{totaux.pctEvalues} %</span>
        </div>
        <div className="mt-2.5 flex h-2.5 w-full overflow-hidden rounded-full bg-brun-100">
          {totaux.pctAcceptes > 0 && (
            <div className="h-full bg-emerald-600 transition-all" style={{ width: `${totaux.pctAcceptes}%` }} />
          )}
          {totaux.pctRejetes > 0 && (
            <div className="h-full bg-red-500 transition-all" style={{ width: `${totaux.pctRejetes}%` }} />
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tuiles.map(([id, libelle, valeur, couleur, sous]) => {
            const actif = filtreVue === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFiltreVue((courant) => (courant === id && id !== 'TOUS' ? 'TOUS' : id))}
                className={`rounded-xl border p-3.5 text-left transition ${
                  actif
                    ? 'border-brun-800 bg-brun-50 ring-1 ring-brun-800'
                    : 'border-brun-100 bg-white hover:border-caramel-300 hover:bg-brun-50/50'
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-brun-500">{libelle}</p>
                <p className={`mt-1 text-2xl font-extrabold tabular-nums sm:text-3xl ${couleur}`}>{valeur}</p>
                <p className="mt-0.5 text-xs text-brun-400">{sous}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barre de recherche & mode d'affichage */}
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
        <div className="flex items-center gap-2">
          {filtreVue !== 'TOUS' && (
            <button type="button" onClick={() => setFiltreVue('TOUS')} className="btn-secondaire">
              <Columns3 className="h-4 w-4" /> Voir les 3 colonnes
            </button>
          )}
          <button type="button" onClick={charger} className="btn-secondaire" aria-label="Actualiser">
            <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} /> Actualiser
          </button>
        </div>
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
      ) : filtreVue !== 'TOUS' && colonneActive ? (
        /* Vue concentrée sur une catégorie (grille spacieuse multi-colonnes) */
        <section className="overflow-hidden rounded-2xl border border-brun-100 bg-white shadow-sm">
          <div className={`flex items-center justify-between border-b border-brun-100 px-5 py-4 ${colonneActive.entete}`}>
            <div className="flex items-center gap-2.5">
              <span className={`h-2.5 w-2.5 rounded-full ${colonneActive.point}`} />
              <h2 className="text-base font-extrabold text-brun-900">{colonneActive.titre}</h2>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${colonneActive.badge}`}>
              {itemsVueFocus.length}
            </span>
          </div>
          {itemsVueFocus.length === 0 ? (
            <p className="px-6 py-14 text-center text-sm text-brun-400">{colonneActive.vide}</p>
          ) : (
            <div className="grid gap-3 bg-brun-50/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {itemsVueFocus.map((ins) => (
                <CarteGroupe key={ins.id} ins={ins} onClick={() => { setConfirmation(null); setSelection(ins); }} />
              ))}
            </div>
          )}
        </section>
      ) : (
        /* Vue globale 3 colonnes de même hauteur avec défilement interne */
        <div className="grid gap-5 lg:grid-cols-3">
          {groupesParColonne.map((col) => (
            <section
              key={col.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-brun-100 bg-white shadow-sm lg:h-[calc(100vh-22rem)] lg:min-h-[440px] lg:max-h-[680px]"
            >
              <div className={`flex shrink-0 items-center justify-between border-b border-brun-100 px-5 py-3.5 ${col.entete}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.point}`} />
                  <h2 className="text-sm font-extrabold uppercase tracking-wide text-brun-900">{col.titre}</h2>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${col.badge}`}>
                  {col.items.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto bg-brun-50/50 p-3">
                {col.items.length === 0 ? (
                  <div className="flex h-full min-h-[140px] items-center justify-center rounded-xl border border-dashed border-brun-200 bg-white/60 px-4 text-center text-sm text-brun-400">
                    {col.vide}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {col.items.map((ins) => (
                      <CarteGroupe
                        key={ins.id}
                        ins={ins}
                        onClick={() => { setConfirmation(null); setSelection(ins); }}
                      />
                    ))}
                  </div>
                )}
              </div>
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
