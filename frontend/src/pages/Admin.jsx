import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, ChevronRight, Download, Loader2, Lock, LogOut, RefreshCw, Save, Search, Trash2, Users, X,
} from 'lucide-react';
import { api, ErreurApi, telechargerCsv, tokenAdmin } from '../lib/api.js';

const STATUTS = {
  EN_ATTENTE: { libelle: 'En attente', classe: 'bg-amber-100 text-amber-800' },
  ENTRETIEN: { libelle: 'Entretien', classe: 'bg-sky-100 text-sky-800' },
  ACCEPTE: { libelle: 'Accepté', classe: 'bg-emerald-100 text-emerald-800' },
  REJETE: { libelle: 'Rejeté', classe: 'bg-red-100 text-red-700' },
};

const formatDate = (iso) =>
  new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

function Badge({ statut }) {
  const s = STATUTS[statut] ?? { libelle: statut, classe: 'bg-brun-100 text-brun-700' };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.classe}`}>{s.libelle}</span>;
}

/* ---------------- Connexion ---------------- */
function Connexion({ onConnecte }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const { token } = await api('/admin/connexion/', { method: 'POST', body: { username, password } });
      tokenAdmin.ecrire(token);
      onConnecte();
    } catch (err) {
      setErreur(err instanceof ErreurApi && err.status === 401 ? 'Identifiants invalides.' : 'Serveur injoignable.');
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brun-50 px-4">
      <form onSubmit={soumettre} className="w-full max-w-sm rounded-3xl border border-brun-100 bg-white p-8 shadow-xl">
        <img src="/logo-ciat.png" alt="CIAT" className="mx-auto h-14 w-auto" />
        <h1 className="mt-6 text-center text-xl font-extrabold text-brun-800">Espace administrateur</h1>
        <p className="mt-1 text-center text-sm text-brun-500">Gestion des inscriptions au club</p>
        {erreur && (
          <p role="alert" className="mt-5 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" /> {erreur}
          </p>
        )}
        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="u" className="label">Identifiant</label>
            <input id="u" className="champ" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="p" className="label">Mot de passe</label>
            <input id="p" type="password" className="champ" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
        </div>
        <button type="submit" disabled={chargement} className="btn-primaire mt-6 w-full">
          {chargement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Se connecter
        </button>
        <Link to="/" className="mt-4 block text-center text-sm text-brun-500 hover:text-brun-700">← Retour au site</Link>
      </form>
    </div>
  );
}

/* ---------------- Fiche détaillée ---------------- */
function Fiche({ inscription, onFermer, onMaj, onSupprime }) {
  const [statut, setStatut] = useState(inscription.statut);
  const [notes, setNotes] = useState(inscription.notes_admin);
  const [enregistrement, setEnregistrement] = useState(false);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    setStatut(inscription.statut);
    setNotes(inscription.notes_admin);
    setInfo(null);
  }, [inscription]);

  useEffect(() => {
    const echap = (e) => e.key === 'Escape' && onFermer();
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [onFermer]);

  const enregistrer = async () => {
    setEnregistrement(true);
    try {
      const maj = await api(`/admin/inscriptions/${inscription.id}/`, {
        method: 'PATCH', body: { statut, notes_admin: notes }, auth: true,
      });
      onMaj(maj);
      setInfo('Modifications enregistrées.');
    } catch {
      setInfo('Échec de l’enregistrement.');
    } finally {
      setEnregistrement(false);
    }
  };

  const supprimer = async () => {
    if (!window.confirm(`Supprimer définitivement l’inscription « ${inscription.nom_groupe} » ?`)) return;
    try {
      await api(`/admin/inscriptions/${inscription.id}/`, { method: 'DELETE', auth: true });
      onSupprime(inscription.id);
    } catch {
      setInfo('Échec de la suppression.');
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-brun-900/40" onClick={onFermer}>
      <aside
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        aria-label={`Fiche du groupe ${inscription.nom_groupe}`}
      >
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-brun-100 bg-white px-6 py-5">
          <div>
            <p className="font-mono text-xs text-caramel-600">{inscription.reference}</p>
            <h2 className="text-xl font-extrabold text-brun-800">{inscription.nom_groupe}</h2>
            <p className="text-sm text-brun-500">Projet : <span className="font-semibold text-brun-700">{inscription.nom_projet}</span></p>
          </div>
          <button type="button" onClick={onFermer} className="rounded-lg p-2 text-brun-500 hover:bg-brun-50" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-7 px-6 py-6">
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-brun-500">Description du projet</h3>
            <p className="whitespace-pre-line rounded-xl bg-brun-50 p-4 text-sm leading-relaxed text-brun-800">{inscription.description_projet}</p>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-brun-500">
              Membres ({inscription.membres.length})
            </h3>
            <div className="overflow-x-auto rounded-xl border border-brun-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-brun-50 text-xs uppercase text-brun-500">
                  <tr><th className="px-3 py-2">Nom & prénom</th><th className="px-3 py-2">Département</th><th className="px-3 py-2">Métier</th></tr>
                </thead>
                <tbody className="divide-y divide-brun-100">
                  {inscription.membres.map((m) => (
                    <tr key={m.id}>
                      <td className="px-3 py-2 font-medium text-brun-800">{m.prenom} {m.nom}</td>
                      <td className="px-3 py-2 text-brun-600">{m.departement}</td>
                      <td className="px-3 py-2 text-brun-600">{m.metier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="text-sm text-brun-600">
            <p>
              E-mail :{' '}
              {inscription.email
                ? <a href={`mailto:${inscription.email}`} className="font-semibold text-caramel-600 hover:underline">{inscription.email}</a>
                : <span className="italic text-brun-400">non renseigné (inscription antérieure)</span>}
            </p>
            <p>Inscrit le <strong>{formatDate(inscription.cree_le)}</strong></p>
            <p>
              Engagement : {inscription.engagement
                ? <strong className="text-emerald-700">accepté{inscription.date_engagement && ` le ${formatDate(inscription.date_engagement)}`}</strong>
                : <strong className="text-red-600">non</strong>}
            </p>
          </section>

          <section className="space-y-4 rounded-2xl border border-brun-100 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brun-500">Traitement</h3>
            <div>
              <label htmlFor="statut" className="label">Statut</label>
              <select id="statut" className="champ" value={statut} onChange={(e) => setStatut(e.target.value)}>
                {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.libelle}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="notes" className="label">Notes internes</label>
              <textarea id="notes" rows={4} className="champ" placeholder="Remarques du jury, date d'entretien…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {info && <p className="text-sm font-medium text-brun-600">{info}</p>}
            <div className="flex flex-wrap justify-between gap-3">
              <button type="button" onClick={supprimer} className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" /> Supprimer
              </button>
              <button type="button" onClick={enregistrer} disabled={enregistrement} className="btn-primaire">
                {enregistrement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
              </button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

/* ---------------- Tableau de bord ---------------- */
function TableauDeBord({ onDeconnexion }) {
  const [inscriptions, setInscriptions] = useState([]);
  const [stats, setStats] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [selection, setSelection] = useState(null);

  const params = useCallback(() => {
    const p = new URLSearchParams();
    if (recherche.trim()) p.set('q', recherche.trim());
    if (filtre) p.set('statut', filtre);
    const s = p.toString();
    return s ? `?${s}` : '';
  }, [recherche, filtre]);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const [liste, st] = await Promise.all([
        api(`/admin/inscriptions/${params()}`, { auth: true }),
        api('/admin/inscriptions/stats/', { auth: true }),
      ]);
      setInscriptions(liste);
      setStats(st);
    } catch (err) {
      if (err instanceof ErreurApi && err.status === 401) return onDeconnexion();
      setErreur('Impossible de charger les inscriptions.');
    } finally {
      setChargement(false);
    }
  }, [params, onDeconnexion]);

  // Recherche avec un léger délai pour éviter une requête par frappe.
  useEffect(() => {
    const t = setTimeout(charger, 250);
    return () => clearTimeout(t);
  }, [charger]);

  const deconnexion = async () => {
    try { await api('/admin/deconnexion/', { method: 'POST', auth: true }); } catch { /* ignore */ }
    onDeconnexion();
  };

  const exporter = async () => {
    try { await telechargerCsv(params()); } catch { setErreur('Échec de l’export CSV.'); }
  };

  const surMaj = (maj) => {
    setInscriptions((l) => l.map((x) => (x.id === maj.id ? maj : x)));
    setSelection(maj);
    api('/admin/inscriptions/stats/', { auth: true }).then(setStats).catch(() => {});
  };

  const surSuppression = (id) => {
    setSelection(null);
    setInscriptions((l) => l.filter((x) => x.id !== id));
    api('/admin/inscriptions/stats/', { auth: true }).then(setStats).catch(() => {});
  };

  const KPIS = stats ? [
    ['Groupes inscrits', stats.total, 'text-brun-800'],
    ['Membres', stats.membres, 'text-brun-800'],
    ['En attente', stats.en_attente, 'text-amber-700'],
    ['Entretien', stats.entretien, 'text-sky-700'],
    ['Acceptés', stats.accepte, 'text-emerald-700'],
    ['Rejetés', stats.rejete, 'text-red-600'],
  ] : [];

  return (
    <div className="min-h-screen bg-brun-50">
      <header className="border-b border-brun-100 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/logo-ciat.png" alt="CIAT" className="h-9 w-auto" />
            <span className="hidden border-l border-brun-200 pl-3 text-sm font-bold text-brun-700 sm:block">Administration</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="hidden text-sm font-semibold text-brun-500 hover:text-brun-700 sm:block">Voir le site</Link>
            <button type="button" onClick={deconnexion} className="btn-secondaire">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-extrabold text-brun-800">Inscriptions au Club d'Entrepreneuriat</h1>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {KPIS.map(([libelle, valeur, couleur]) => (
            <div key={libelle} className="rounded-2xl border border-brun-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brun-500">{libelle}</p>
              <p className={`mt-1 text-3xl font-extrabold tabular-nums ${couleur}`}>{valeur}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brun-400" />
            <input
              type="search"
              className="champ pl-10"
              placeholder="Rechercher un groupe, une référence, un e-mail, un membre…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              aria-label="Rechercher"
            />
          </div>
          <div className="flex gap-2">
            <select className="champ lg:w-48" value={filtre} onChange={(e) => setFiltre(e.target.value)} aria-label="Filtrer par statut">
              <option value="">Tous les statuts</option>
              {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.libelle}</option>)}
            </select>
            <button type="button" onClick={charger} className="btn-secondaire" aria-label="Actualiser">
              <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={exporter} className="btn-primaire whitespace-nowrap">
              <Download className="h-4 w-4" /> CSV
            </button>
          </div>
        </div>

        {erreur && (
          <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" /> {erreur}
          </p>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl border border-brun-100 bg-white">
          {!chargement && inscriptions.length === 0 ? (
            <div className="px-6 py-16 text-center text-brun-500">
              <Users className="mx-auto h-10 w-10 text-brun-300" />
              <p className="mt-3 font-semibold">Aucune inscription{recherche || filtre ? ' ne correspond à ces critères' : ' pour le moment'}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-brun-50 text-xs uppercase tracking-wide text-brun-500">
                  <tr>
                    <th className="px-4 py-3">Groupe</th>
                    <th className="px-4 py-3">Projet</th>
                    <th className="px-4 py-3">Membres</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Inscrit le</th>
                    <th className="px-4 py-3"><span className="sr-only">Ouvrir</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brun-100">
                  {inscriptions.map((ins) => (
                    <tr key={ins.id} onClick={() => setSelection(ins)} className="cursor-pointer hover:bg-caramel-100/30">
                      <td className="px-4 py-3">
                        <p className="font-bold text-brun-800">{ins.nom_groupe}</p>
                        <p className="font-mono text-xs text-brun-400">{ins.reference}</p>
                      </td>
                      <td className="px-4 py-3 text-brun-700">{ins.nom_projet}</td>
                      <td className="px-4 py-3 text-brun-600">
                        <span className="font-semibold text-brun-800">{ins.membres.length}</span>
                        <span className="ml-1.5 text-xs">
                          {ins.membres.slice(0, 2).map((m) => `${m.prenom} ${m.nom}`).join(', ')}
                          {ins.membres.length > 2 && '…'}
                        </span>
                      </td>
                      <td className="px-4 py-3"><Badge statut={ins.statut} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-brun-500">{formatDate(ins.cree_le)}</td>
                      <td className="px-4 py-3 text-right"><ChevronRight className="inline h-4 w-4 text-brun-300" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {selection && (
        <Fiche inscription={selection} onFermer={() => setSelection(null)} onMaj={surMaj} onSupprime={surSuppression} />
      )}
    </div>
  );
}

export default function Admin() {
  const [connecte, setConnecte] = useState(() => Boolean(tokenAdmin.lire()));
  const deconnecter = useCallback(() => { tokenAdmin.effacer(); setConnecte(false); }, []);

  return connecte
    ? <TableauDeBord onDeconnexion={deconnecter} />
    : <Connexion onConnecte={() => setConnecte(true)} />;
}
