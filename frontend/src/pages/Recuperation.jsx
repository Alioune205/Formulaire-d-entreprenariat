import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, ArrowLeft, Check, Copy, FileSearch, KeyRound, Loader2, Mail, ShieldCheck,
} from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { api, ErreurApi } from '../lib/api.js';

const DELAI_RENVOI = 60; // secondes avant de pouvoir redemander un code

function messageErreur(err) {
  if (err instanceof ErreurApi && err.status === 429) return 'Trop de tentatives. Patientez avant de réessayer.';
  if (err instanceof ErreurApi && err.status < 500) return err.message;
  if (err instanceof ErreurApi && err.status === 503) return err.message;
  return 'Impossible de joindre le serveur. Réessayez plus tard.';
}

function Etapes({ actuelle }) {
  const etapes = ['E-mail', 'Code', 'Nouvelle référence'];
  return (
    <ol className="mb-8 flex items-center gap-2 text-xs font-semibold sm:text-sm">
      {etapes.map((e, i) => (
        <li key={e} className="flex flex-1 items-center gap-2">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            i < actuelle ? 'bg-emerald-600 text-white' : i === actuelle ? 'bg-brun-800 text-white' : 'bg-brun-100 text-brun-400'
          }`}>
            {i < actuelle ? <Check className="h-4 w-4" /> : i + 1}
          </span>
          <span className={i === actuelle ? 'text-brun-800' : 'text-brun-400'}>{e}</span>
          {i < etapes.length - 1 && <span className="h-px flex-1 bg-brun-200" />}
        </li>
      ))}
    </ol>
  );
}

function CarteReference({ dossier }) {
  const [copie, setCopie] = useState(false);
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(dossier.reference);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch { /* presse-papiers indisponible : l'utilisateur peut sélectionner le texte */ }
  };
  return (
    <div className="rounded-2xl border-2 border-caramel-300 bg-caramel-100/40 p-5">
      <p className="text-sm text-brun-600">
        <span className="font-bold text-brun-800">{dossier.nom_groupe}</span> · projet {dossier.nom_projet}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="select-all rounded-xl bg-white px-4 py-3 font-mono text-xl font-extrabold tracking-wider text-brun-900 sm:text-2xl">
          {dossier.reference}
        </span>
        <button type="button" onClick={copier} className="btn-secondaire">
          {copie ? <><Check className="h-4 w-4 text-emerald-600" /> Copiée</> : <><Copy className="h-4 w-4" /> Copier</>}
        </button>
      </div>
      <Link
        to={`/suivi?ref=${encodeURIComponent(dossier.reference)}&groupe=${encodeURIComponent(dossier.nom_groupe)}`}
        className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-caramel-600 hover:text-caramel-500"
      >
        <FileSearch className="h-4 w-4" /> Suivre ce dossier
      </Link>
    </div>
  );
}

export default function Recuperation() {
  const [etape, setEtape] = useState(0);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [info, setInfo] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [attente, setAttente] = useState(0);
  const [dossiers, setDossiers] = useState([]);

  useEffect(() => {
    if (attente <= 0) return undefined;
    const t = setTimeout(() => setAttente((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [attente]);

  const demanderCode = async (e) => {
    e?.preventDefault();
    setErreur(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setErreur('Indiquez une adresse e-mail valide.');
      return;
    }
    setChargement(true);
    try {
      const res = await api('/recuperation/demande/', { method: 'POST', body: { email } });
      setInfo(res.message);
      setCode('');
      setEtape(1);
      setAttente(DELAI_RENVOI);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setChargement(false);
    }
  };

  const verifierCode = async (e) => {
    e.preventDefault();
    setErreur(null);
    if (!/^\d{6}$/.test(code)) {
      setErreur('Le code contient 6 chiffres.');
      return;
    }
    setChargement(true);
    try {
      const res = await api('/recuperation/verification/', { method: 'POST', body: { email, code } });
      setDossiers(res.dossiers);
      setEtape(2);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setChargement(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-[70vh] py-16">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <Link to="/suivi" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brun-500 hover:text-brun-700">
            <ArrowLeft className="h-4 w-4" /> Retour au suivi
          </Link>
          <p className="mt-6 text-sm font-bold uppercase tracking-wider text-caramel-600">Référence oubliée</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brun-800">Récupérer l’accès à votre dossier</h1>
          <p className="mt-3 text-brun-600">
            Nous vérifions votre identité avec l’adresse e-mail donnée lors de l’inscription, puis nous générons une nouvelle référence.
          </p>

          <div className="mt-8 rounded-3xl border border-brun-100 bg-white p-6 shadow-xl shadow-brun-900/5 sm:p-8">
            <Etapes actuelle={etape} />

            {erreur && (
              <p role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {erreur}
              </p>
            )}

            {etape === 0 && (
              <form onSubmit={demanderCode} noValidate>
                <label htmlFor="email" className="label">Adresse e-mail utilisée lors de l’inscription</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brun-400" />
                  <input
                    id="email" type="email" inputMode="email" autoComplete="email" autoFocus
                    className="champ pl-10" placeholder="awa.diop@gmail.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={chargement} className="btn-primaire mt-5 w-full">
                  {chargement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Recevoir un code
                </button>
              </form>
            )}

            {etape === 1 && (
              <form onSubmit={verifierCode} noValidate>
                {info && <p className="mb-5 rounded-xl bg-brun-50 p-4 text-sm leading-relaxed text-brun-700">{info}</p>}
                <label htmlFor="code" className="label">Code de vérification (6 chiffres)</label>
                <input
                  id="code" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6}
                  className="champ text-center font-mono text-2xl font-bold tracking-[0.5em]"
                  placeholder="••••••"
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <button type="submit" disabled={chargement || code.length !== 6} className="btn-primaire mt-5 w-full">
                  {chargement ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Vérifier le code
                </button>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <button type="button" onClick={() => { setEtape(0); setErreur(null); }} className="font-semibold text-brun-500 hover:text-brun-700">
                    Changer d’adresse
                  </button>
                  <button
                    type="button" onClick={() => demanderCode()} disabled={attente > 0 || chargement}
                    className="font-semibold text-caramel-600 hover:text-caramel-500 disabled:text-brun-300"
                  >
                    {attente > 0 ? `Renvoyer le code (${attente} s)` : 'Renvoyer le code'}
                  </button>
                </div>
              </form>
            )}

            {etape === 2 && (
              <div className="space-y-5">
                <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-900">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="text-sm leading-relaxed">
                    <p className="font-bold">Notez bien votre nouvelle référence, cette fois-ci !</p>
                    <p className="mt-1">
                      L’ancienne référence ne fonctionne plus. Copiez la nouvelle, faites une capture d’écran ou gardez
                      l’e-mail que nous venons de vous envoyer.
                    </p>
                  </div>
                </div>
                {dossiers.map((d) => <CarteReference key={d.reference} dossier={d} />)}
              </div>
            )}
          </div>

          {etape < 2 && (
            <p className="mt-6 flex items-start gap-2 text-xs text-brun-500">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
              Le code est valable 15 minutes et ne peut être utilisé qu’une fois. Après 5 essais incorrects, demandez-en un nouveau.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
