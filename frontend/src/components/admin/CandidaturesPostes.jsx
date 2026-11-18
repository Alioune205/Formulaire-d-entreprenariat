import { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle, CheckCircle2, ChevronRight, Download, ExternalLink, Eye,
  Film, Filter, Loader2, RefreshCw, Search, Trash2, User, Video, XCircle, X,
} from 'lucide-react';
import { api, telechargerCsv, urlMedia } from '../../lib/api.js';
import { POSTES } from '../../lib/postes.js';

const STATUTS_CONFIG = {
  EN_ATTENTE: { libelle: 'En attente', classe: 'bg-amber-100 text-amber-800 border-amber-200' },
  VALIDE: { libelle: 'Validée (pour vote)', classe: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  REJETE: { libelle: 'Non retenue', classe: 'bg-red-100 text-red-700 border-red-200' },
  ELU: { libelle: 'Élu(e)', classe: 'bg-purple-100 text-purple-800 border-purple-200' },
};

function PhotoCandidat({ src, prenom, nom, classe }) {
  const [erreurImg, setErreurImg] = useState(false);
  const url = urlMedia(src);

  if (!url || erreurImg) {
    const initiales = `${(prenom || '').charAt(0)}${(nom || '').charAt(0)}`.toUpperCase() || '?';
    return (
      <div
        className={`flex shrink-0 items-center justify-center bg-caramel-100 font-bold text-caramel-800 ${classe}`}
        aria-label={`${prenom} ${nom}`}
      >
        {initiales}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={`${prenom} ${nom}`}
      onError={() => setErreurImg(true)}
      className={`shrink-0 object-cover ${classe}`}
    />
  );
}

export default function CandidaturesPostes({ onDeconnexion }) {
  const [candidatures, setCandidatures] = useState([]);
  const [stats, setStats] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const [filtrePoste, setFiltrePoste] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [recherche, setRecherche] = useState('');

  const [candidatSelectionne, setCandidatSelectionne] = useState(null);
  const [actionEnCours, setActionEnCours] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const params = new URLSearchParams();
      if (filtrePoste) params.set('poste', filtrePoste);
      if (filtreStatut) params.set('statut', filtreStatut);
      if (recherche.trim()) params.set('q', recherche.trim());

      const url = `/admin/candidatures/${params.toString() ? `?${params.toString()}` : ''}`;
      const data = await api(url, { auth: true });
      setCandidatures(data);

      const s = await api('/admin/candidatures/stats/', { auth: true });
      setStats(s);
    } catch (err) {
      if (err.status === 401 && onDeconnexion) {
        onDeconnexion();
      } else {
        setErreur('Impossible de charger les candidatures.');
      }
    } finally {
      setChargement(false);
    }
  }, [filtrePoste, filtreStatut, recherche, onDeconnexion]);

  useEffect(() => {
    charger();
  }, [charger]);

  const rafraichirStats = useCallback(async () => {
    const s = await api('/admin/candidatures/stats/', { auth: true });
    setStats(s);
  }, []);

  const changerStatut = async (id, nouveauStatut, notes = undefined) => {
    setActionEnCours(true);
    try {
      const body = { statut: nouveauStatut };
      if (notes !== undefined) body.notes_admin = notes;

      const maj = await api(`/admin/candidatures/${id}/changer-statut/`, {
        method: 'POST',
        auth: true,
        body,
      });

      setCandidatures((prev) => prev.map((c) => (c.id === id ? maj : c)));
      if (candidatSelectionne && candidatSelectionne.id === id) {
        setCandidatSelectionne(maj);
      }
      await rafraichirStats();
    } catch (err) {
      setErreur('Erreur lors du changement de statut : ' + err.message);
    } finally {
      setActionEnCours(false);
    }
  };

  const supprimerCandidature = async (candidat) => {
    const nomComplet = `${candidat.prenom} ${candidat.nom}`;
    if (!window.confirm(`Supprimer définitivement la candidature de « ${nomComplet} » (${candidat.poste_libelle}) ?`)) {
      return;
    }
    setActionEnCours(true);
    setErreur(null);
    try {
      await api(`/admin/candidatures/${candidat.id}/`, {
        method: 'DELETE',
        auth: true,
      });
      setCandidatures((prev) => prev.filter((c) => c.id !== candidat.id));
      if (candidatSelectionne && candidatSelectionne.id === candidat.id) {
        setCandidatSelectionne(null);
      }
      await rafraichirStats();
    } catch (err) {
      setErreur('Impossible de supprimer la candidature : ' + err.message);
    } finally {
      setActionEnCours(false);
    }
  };

  const exporterCsv = async () => {
    try {
      await telechargerCsv('/admin/candidatures/export-csv/', 'candidatures_gouvernance_ciat.csv');
    } catch (err) {
      alert('Erreur lors du téléchargement : ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPIs & Résumé */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-brun-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brun-500">Total Candidatures</p>
          <p className="mt-1 text-3xl font-extrabold text-brun-800">{stats?.total ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Validées pour vote</p>
          <p className="mt-1 text-3xl font-extrabold text-emerald-700">{stats?.par_statut?.VALIDE ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">En attente revue</p>
          <p className="mt-1 text-3xl font-extrabold text-amber-700">{stats?.par_statut?.EN_ATTENTE ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Non retenues</p>
          <p className="mt-1 text-3xl font-extrabold text-red-700">{stats?.par_statut?.REJETE ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-purple-100 bg-white p-4 col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Élu(e)s</p>
          <p className="mt-1 text-3xl font-extrabold text-purple-700">{stats?.par_statut?.ELU ?? 0}</p>
        </div>
      </div>

      {/* Barre d'outils & Filtres */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brun-400" />
          <input
            type="search"
            className="champ pl-10"
            placeholder="Rechercher par nom, prénom, e-mail, filière..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            className="champ sm:w-56"
            value={filtrePoste}
            onChange={(e) => setFiltrePoste(e.target.value)}
          >
            <option value="">Tous les 13 postes</option>
            <optgroup label="Bureau Exécutif">
              {POSTES.filter((p) => p.categorie === 'Bureau Exécutif').map((p) => (
                <option key={p.code} value={p.code}>{p.titre}</option>
              ))}
            </optgroup>
            <optgroup label="Cellules Thématiques">
              {POSTES.filter((p) => p.categorie === 'Cellules Thématiques').map((p) => (
                <option key={p.code} value={p.code}>{p.titre}</option>
              ))}
            </optgroup>
          </select>

          <select
            className="champ sm:w-44"
            value={filtreStatut}
            onChange={(e) => setFiltreStatut(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUTS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.libelle}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={charger}
            className="btn-secondaire"
            title="Actualiser"
          >
            <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={exporterCsv}
            className="btn-primaire whitespace-nowrap"
          >
            <Download className="h-4 w-4" /> Exporter CSV
          </button>
        </div>
      </div>

      {erreur && (
        <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {erreur}
        </div>
      )}

      {/* Tableau des candidatures */}
      <div className="overflow-hidden rounded-2xl border border-brun-100 bg-white shadow-sm">
        {!chargement && candidatures.length === 0 ? (
          <div className="px-6 py-16 text-center text-brun-500">
            <User className="mx-auto h-10 w-10 text-brun-300" />
            <p className="mt-3 font-semibold">Aucune candidature ne correspond aux critères.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-brun-50 text-xs uppercase tracking-wide text-brun-500">
                <tr>
                  <th className="px-4 py-3">Candidat (Photo)</th>
                  <th className="px-4 py-3">Poste visé</th>
                  <th className="px-4 py-3">Filière / Dép.</th>
                  <th className="px-4 py-3">Vidéo</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brun-100">
                {candidatures.map((c) => {
                  const s = STATUTS_CONFIG[c.statut] || { libelle: c.statut, classe: 'bg-gray-100' };
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setCandidatSelectionne(c)}
                      className="cursor-pointer hover:bg-caramel-50/40"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <PhotoCandidat
                            src={c.photo}
                            prenom={c.prenom}
                            nom={c.nom}
                            classe="h-11 w-11 rounded-full border border-caramel-300 shadow-sm text-xs"
                          />
                          <div>
                            <p className="font-bold text-brun-800">{c.prenom} {c.nom}</p>
                            <p className="text-xs text-brun-500">{c.email} • {c.telephone}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-block rounded-lg bg-brun-50 px-2.5 py-1 text-xs font-bold text-brun-800 border border-brun-100">
                          {c.poste_libelle}
                        </span>
                        {c.nom_projet && (
                          <p className="mt-0.5 text-[11px] text-brun-500">Projet : {c.nom_projet}</p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-brun-700">
                        <p className="font-semibold">{c.departement}</p>
                        <p className="text-xs text-brun-500">{c.metier}</p>
                      </td>

                      <td className="px-4 py-3">
                        {c.lien_video ? (
                          <a
                            href={c.lien_video}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Lien vidéo
                          </a>
                        ) : c.fichier_video ? (
                          <a
                            href={urlMedia(c.fichier_video)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                          >
                            <Film className="h-3.5 w-3.5" /> Fichier MP4
                          </a>
                        ) : (
                          <span className="text-xs text-brun-400">Aucune</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.classe}`}>
                          {s.libelle}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-caramel-700">
                            Consulter <ChevronRight className="h-4 w-4" />
                          </span>
                          <button
                            type="button"
                            disabled={actionEnCours}
                            onClick={(e) => {
                              e.stopPropagation();
                              supprimerCandidature(c);
                            }}
                            title="Supprimer ce candidat"
                            aria-label={`Supprimer la candidature de ${c.prenom} ${c.nom}`}
                            className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Fiche Détail Candidat */}
      {candidatSelectionne && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setCandidatSelectionne(null)}
        >
          <div
            className="relative my-8 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setCandidatSelectionne(null)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-brun-100 text-brun-600 hover:bg-brun-200"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col sm:flex-row items-start gap-5 border-b border-brun-100 pb-6">
              <PhotoCandidat
                src={candidatSelectionne.photo}
                prenom={candidatSelectionne.prenom}
                nom={candidatSelectionne.nom}
                classe="h-24 w-24 rounded-2xl border-2 border-caramel-300 shadow-md text-xl"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-caramel-100 px-3 py-0.5 text-xs font-bold text-caramel-800">
                    {candidatSelectionne.poste_libelle}
                  </span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUTS_CONFIG[candidatSelectionne.statut]?.classe}`}>
                    {STATUTS_CONFIG[candidatSelectionne.statut]?.libelle}
                  </span>
                </div>
                <h3 className="mt-2 text-2xl font-extrabold text-brun-800">
                  {candidatSelectionne.prenom} {candidatSelectionne.nom}
                </h3>
                <p className="mt-1 text-sm text-brun-600">
                  {candidatSelectionne.departement} • {candidatSelectionne.metier} ({candidatSelectionne.niveau || 'Année non précisée'})
                </p>
                <p className="mt-1 text-xs text-brun-500">
                  E-mail : <strong>{candidatSelectionne.email}</strong> • Tél : <strong>{candidatSelectionne.telephone}</strong>
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-5 max-h-[60vh] overflow-y-auto pr-1">
              {/* Vidéo */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-caramel-700">Vidéo de campagne</h4>
                {candidatSelectionne.lien_video ? (
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-3">
                    <span className="text-xs text-blue-800 font-mono truncate max-w-sm">{candidatSelectionne.lien_video}</span>
                    <a
                      href={candidatSelectionne.lien_video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shrink-0 ml-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Ouvrir la vidéo
                    </a>
                  </div>
                ) : candidatSelectionne.fichier_video ? (
                  <div className="mt-2">
                    <video controls className="w-full max-h-56 rounded-xl bg-black">
                      <source src={urlMedia(candidatSelectionne.fichier_video)} />
                      Votre navigateur ne supporte pas la lecture vidéo.
                    </video>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-brun-500">Aucune vidéo fournie pour cette candidature.</p>
                )}
              </div>

              {/* Profession de foi */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-caramel-700">Profession de foi / Vision</h4>
                <div className="mt-2 rounded-2xl border border-brun-100 bg-[#faf6f3] p-4 text-sm leading-relaxed text-brun-800 whitespace-pre-wrap">
                  {candidatSelectionne.profession_de_foi}
                </div>
              </div>

              {/* Actions du jury / commission */}
              <div className="rounded-2xl border border-brun-200 bg-brun-50/80 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brun-800">
                  Décision de la commission électorale :
                </h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actionEnCours || candidatSelectionne.statut === 'VALIDE'}
                    onClick={() => changerStatut(candidatSelectionne.id, 'VALIDE')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Valider pour le vote
                  </button>

                  <button
                    type="button"
                    disabled={actionEnCours || candidatSelectionne.statut === 'REJETE'}
                    onClick={() => changerStatut(candidatSelectionne.id, 'REJETE')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-40"
                  >
                    <XCircle className="h-4 w-4" /> Rejeter
                  </button>

                  <button
                    type="button"
                    disabled={actionEnCours || candidatSelectionne.statut === 'ELU'}
                    onClick={() => changerStatut(candidatSelectionne.id, 'ELU')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-purple-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-800 disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Proclamer Élu(e)
                  </button>

                  {candidatSelectionne.statut !== 'EN_ATTENTE' && (
                    <button
                      type="button"
                      disabled={actionEnCours}
                      onClick={() => changerStatut(candidatSelectionne.id, 'EN_ATTENTE')}
                      className="rounded-xl border border-brun-200 bg-white px-3 py-2 text-xs font-semibold text-brun-700 hover:bg-brun-50"
                    >
                      Remettre en attente
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={actionEnCours}
                    onClick={() => supprimerCandidature(candidatSelectionne)}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" /> Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
