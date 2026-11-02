import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Circle, Loader2, Search, XCircle } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { api, ErreurApi } from '../lib/api.js';

const formatDate = (iso) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

// Position de chaque statut sur la frise : 0 = reçu, 1 = entretien, 2 = décision.
const RANG = { EN_ATTENTE: 0, ENTRETIEN: 1, ACCEPTE: 2, REJETE: 2 };

function Frise({ statut }) {
  const rang = RANG[statut] ?? 0;
  const decision = statut === 'ACCEPTE' ? 'Accepté' : statut === 'REJETE' ? 'Non retenu' : 'Décision';
  const etapes = [
    ['Dossier reçu', 'Inscription enregistrée'],
    ['Entretien', 'Rencontre avec l’équipe du club'],
    [decision, 'Résultat de la sélection'],
  ];

  return (
    <ol className="relative space-y-6 border-l-2 border-brun-100 pl-8">
      {etapes.map(([titre, sous], i) => {
        const fait = i < rang || (i === rang && i === 2);
        const encours = i === rang && i !== 2;
        const rejet = i === 2 && statut === 'REJETE';
        let Icone = Circle;
        let couleur = 'text-brun-200 bg-white';
        if (rejet) { Icone = XCircle; couleur = 'text-red-500 bg-white'; }
        else if (fait) { Icone = CheckCircle2; couleur = 'text-emerald-600 bg-white'; }
        else if (encours) { Icone = Loader2; couleur = 'text-caramel-500 bg-white'; }
        return (
          <li key={titre} className="relative">
            <span className={`absolute -left-[2.6rem] top-0 rounded-full ${couleur}`}>
              <Icone className={`h-6 w-6 ${encours ? 'animate-spin [animation-duration:3s]' : ''}`} />
            </span>
            <p className={`font-bold ${fait || encours ? 'text-brun-800' : 'text-brun-300'}`}>
              {titre}{encours && <span className="ml-2 rounded-md bg-caramel-100 px-2 py-0.5 text-xs font-semibold text-caramel-600">En cours</span>}
            </p>
            <p className={`text-sm ${fait || encours ? 'text-brun-500' : 'text-brun-300'}`}>{sous}</p>
          </li>
        );
      })}
    </ol>
  );
}

export default function Suivi() {
  const [params] = useSearchParams();
  const [reference, setReference] = useState(params.get('ref') ?? '');
  const [nomGroupe, setNomGroupe] = useState(params.get('groupe') ?? '');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [dossier, setDossier] = useState(null);

  const rechercher = async (e) => {
    e?.preventDefault();
    setErreur(null);
    setDossier(null);
    if (!reference.trim() || !nomGroupe.trim()) {
      setErreur('Renseignez la référence et le nom du groupe.');
      return;
    }
    setChargement(true);
    try {
      setDossier(await api('/suivi/', { method: 'POST', body: { reference, nom_groupe: nomGroupe } }));
    } catch (err) {
      if (err instanceof ErreurApi && err.status === 404) setErreur(err.message);
      else if (err instanceof ErreurApi && err.status === 429) setErreur('Trop de tentatives. Réessayez dans une minute.');
      else setErreur('Impossible de joindre le serveur. Réessayez plus tard.');
    } finally {
      setChargement(false);
    }
  };

  // Lien direct depuis l'écran de confirmation : recherche automatique.
  useEffect(() => {
    if (params.get('ref') && params.get('groupe')) rechercher();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const couleurStatut = {
    EN_ATTENTE: 'border-amber-200 bg-amber-50 text-amber-800',
    ENTRETIEN: 'border-sky-200 bg-sky-50 text-sky-800',
    ACCEPTE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    REJETE: 'border-red-200 bg-red-50 text-red-700',
  };

  return (
    <>
      <Navbar />
      <main className="min-h-[70vh] py-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <p className="text-sm font-bold uppercase tracking-wider text-caramel-600">Suivi de dossier</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brun-800 sm:text-4xl">Où en est notre inscription ?</h1>
          <p className="mt-3 text-brun-600">
            Saisissez la référence reçue après l’inscription (ex. <span className="font-mono">CIAT-2026-7KQ4MZ</span>) et le nom exact de votre groupe.
          </p>

          <form onSubmit={rechercher} className="mt-8 grid gap-4 rounded-2xl border border-brun-100 bg-white p-6 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <label htmlFor="ref" className="label">Référence</label>
              <input id="ref" className="champ font-mono uppercase" placeholder="CIAT-2026-7KQ4MZ" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div>
              <label htmlFor="grp" className="label">Nom du groupe</label>
              <input id="grp" className="champ" placeholder="Les Bâtisseurs" value={nomGroupe} onChange={(e) => setNomGroupe(e.target.value)} />
            </div>
            <button type="submit" disabled={chargement} className="btn-primaire h-[46px]">
              {chargement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Rechercher
            </button>
          </form>
          <p className="mt-3 text-sm text-brun-600">
            Référence oubliée ?{' '}
            <Link to="/recuperation" className="font-bold text-caramel-600 underline-offset-2 hover:underline">
              La récupérer avec votre adresse e-mail
            </Link>
          </p>

          {erreur && (
            <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {erreur}
            </p>
          )}

          {dossier && (
            <section className="mt-8 overflow-hidden rounded-3xl border border-brun-100 bg-white shadow-xl shadow-brun-900/5" aria-live="polite">
              <div className="bg-brun-800 px-6 py-5 text-white">
                <p className="font-mono text-xs text-caramel-200">{dossier.reference}</p>
                <h2 className="text-xl font-extrabold">{dossier.nom_groupe}</h2>
                <p className="text-sm text-brun-200">Projet : {dossier.nom_projet}</p>
              </div>
              <div className="space-y-7 p-6">
                <div className={`rounded-xl border p-4 ${couleurStatut[dossier.statut]}`}>
                  <p className="text-xs font-bold uppercase tracking-wider">Statut : {dossier.statut_libelle}</p>
                  <p className="mt-1 text-sm">{dossier.message}</p>
                </div>
                <Frise statut={dossier.statut} />
                <dl className="grid gap-4 border-t border-brun-100 pt-5 text-sm sm:grid-cols-2">
                  <div><dt className="text-brun-500">Inscrit le</dt><dd className="font-semibold text-brun-800">{formatDate(dossier.cree_le)}</dd></div>
                  <div><dt className="text-brun-500">Dernière mise à jour</dt><dd className="font-semibold text-brun-800">{formatDate(dossier.mis_a_jour_le)}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-brun-500">Membres ({dossier.membres.length})</dt><dd className="font-semibold text-brun-800">{dossier.membres.join(', ')}</dd></div>
                </dl>
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
