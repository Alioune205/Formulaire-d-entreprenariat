import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, ArrowRight, Ban, Check, CheckCircle2, ChevronDown, Loader2, Lock, Mail, PlayCircle,
  ShieldCheck, ThumbsDown, ThumbsUp, Vote as IconeVote,
} from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { api, ErreurApi, urlMedia } from '../lib/api.js';

const DELAI_RENVOI = 60;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function messageErreur(err) {
  if (err instanceof ErreurApi && err.status === 429) return err.message.startsWith('Trop') ? err.message : 'Trop de tentatives. Patientez quelques minutes avant de réessayer.';
  if (err instanceof ErreurApi && err.status < 500) return err.message;
  if (err instanceof ErreurApi) return 'Le serveur a rencontré une erreur temporaire. Réessayez dans un instant.';
  return 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.';
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar',
  });
}

function Etapes({ actuelle }) {
  const etapes = ['Identification', 'Code', 'Bulletin', 'Vérification', 'A voté'];
  return (
    <ol className="mb-8 flex items-center gap-1.5 text-[11px] font-semibold sm:gap-2 sm:text-xs">
      {etapes.map((e, i) => (
        <li key={e} className="flex flex-1 items-center gap-1.5">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            i < actuelle ? 'bg-emerald-600 text-white' : i === actuelle ? 'bg-brun-800 text-white' : 'bg-brun-100 text-brun-400'
          }`}>
            {i < actuelle ? <Check className="h-4 w-4" /> : i + 1}
          </span>
          <span className={`hidden sm:inline ${i === actuelle ? 'text-brun-800' : 'text-brun-400'}`}>{e}</span>
          {i < etapes.length - 1 && <span className="h-px flex-1 bg-brun-200" />}
        </li>
      ))}
    </ol>
  );
}

function Alerte({ children }) {
  return (
    <p role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{children}</span>
    </p>
  );
}

function Photo({ candidat, taille = 'h-16 w-16' }) {
  const [erreur, setErreur] = useState(false);
  if (!candidat.photo || erreur) {
    return (
      <span className={`${taille} flex shrink-0 items-center justify-center rounded-2xl bg-brun-100 text-lg font-extrabold text-brun-500`}>
        {candidat.prenom[0]}{candidat.nom[0]}
      </span>
    );
  }
  return (
    <img
      src={urlMedia(candidat.photo)} alt={`${candidat.prenom} ${candidat.nom}`} onError={() => setErreur(true)}
      className={`${taille} shrink-0 rounded-2xl object-cover`}
    />
  );
}

function CarteCandidat({ candidat, choisi, onChoisir, unique }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className={`rounded-2xl border-2 bg-white transition ${choisi ? 'border-caramel-500 shadow-lg shadow-caramel-500/10' : 'border-brun-100'}`}>
      <button type="button" onClick={unique ? undefined : onChoisir} className={`flex w-full items-center gap-4 p-4 text-left ${unique ? 'cursor-default' : ''}`}>
        <Photo candidat={candidat} />
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-extrabold text-brun-900">{candidat.prenom} {candidat.nom}</span>
          <span className="block text-sm text-brun-500">{[candidat.metier, candidat.niveau].filter(Boolean).join(' · ')}</span>
        </span>
        {!unique && (
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${choisi ? 'border-caramel-500 bg-caramel-500 text-white' : 'border-brun-200'}`}>
            {choisi && <Check className="h-4 w-4" />}
          </span>
        )}
      </button>
      <div className="flex flex-wrap gap-2 border-t border-brun-50 px-4 py-2.5">
        <button type="button" onClick={() => setOuvert((o) => !o)} className="inline-flex items-center gap-1 text-xs font-bold text-brun-600 hover:text-brun-800">
          <ChevronDown className={`h-4 w-4 transition ${ouvert ? 'rotate-180' : ''}`} /> Programme
        </button>
        {candidat.video && (
          <a href={candidat.video} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-caramel-600 hover:text-caramel-500">
            <PlayCircle className="h-4 w-4" /> Voir la vidéo
          </a>
        )}
      </div>
      {ouvert && (
        <p className="whitespace-pre-line border-t border-brun-50 px-4 py-3 text-sm leading-relaxed text-brun-700">{candidat.profession_de_foi}</p>
      )}
    </div>
  );
}

function BoutonChoix({ actif, onClick, icone: Icone, children, couleur }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${
        actif ? couleur : 'border-brun-100 bg-white text-brun-600 hover:border-brun-200'
      }`}
    >
      <Icone className="h-4 w-4" /> {children}
    </button>
  );
}

function libelleChoix(poste, valeur) {
  if (!valeur || valeur === 'BLANC') return 'Vote blanc';
  if (valeur === 'POUR') return `Pour ${poste.candidats[0].prenom} ${poste.candidats[0].nom}`;
  if (valeur === 'CONTRE') return `Contre ${poste.candidats[0].prenom} ${poste.candidats[0].nom}`;
  const c = poste.candidats.find((x) => String(x.id) === valeur);
  return c ? `${c.prenom} ${c.nom}` : 'Vote blanc';
}

export default function Vote() {
  const [infos, setInfos] = useState(null);
  const [erreurChargement, setErreurChargement] = useState(null);
  const [etape, setEtape] = useState(0);
  const [email, setEmail] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [info, setInfo] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [attente, setAttente] = useState(0);
  const [jeton, setJeton] = useState(null);
  const [electeur, setElecteur] = useState('');
  const [index, setIndex] = useState(0);
  const [choix, setChoix] = useState({});
  const [confirmation, setConfirmation] = useState(false);
  const [recu, setRecu] = useState(null);

  const charger = () => {
    setErreurChargement(null);
    api('/vote/bulletin/').then(setInfos).catch((err) => setErreurChargement(messageErreur(err)));
  };
  useEffect(charger, []);

  useEffect(() => {
    if (attente <= 0) return undefined;
    const t = setTimeout(() => setAttente((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [attente]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [etape, index]);

  const postes = useMemo(() => infos?.postes ?? [], [infos]);
  const poste = postes[index];

  const demanderCode = async (e) => {
    e?.preventDefault();
    setErreur(null);
    if (!prenom.trim() || !nom.trim()) return setErreur('Indiquez votre prénom et votre nom.');
    if (!RE_EMAIL.test(email.trim())) return setErreur('Indiquez une adresse e-mail valide.');
    setChargement(true);
    try {
      const res = await api('/vote/demande/', { method: 'POST', body: { email: email.trim(), prenom: prenom.trim(), nom: nom.trim() } });
      setInfo(res.message);
      setElecteur(res.electeur);
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
    if (!/^\d{6}$/.test(code)) return setErreur('Le code contient 6 chiffres.');
    setChargement(true);
    try {
      const res = await api('/vote/verification/', { method: 'POST', body: { email: email.trim(), code } });
      setJeton(res.jeton);
      setElecteur(res.electeur);
      setIndex(0);
      setEtape(2);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setChargement(false);
    }
  };

  const choisir = (valeur) => setChoix((c) => ({ ...c, [poste.code]: valeur }));

  const suivant = () => {
    setErreur(null);
    if (!choix[poste.code]) return setErreur('Faites un choix pour ce poste (ou choisissez « Vote blanc »).');
    if (index < postes.length - 1) setIndex(index + 1);
    else setEtape(3);
  };

  const envoyerVote = async () => {
    setErreur(null);
    setChargement(true);
    try {
      const res = await api('/vote/voter/', { method: 'POST', body: { jeton, choix } });
      setRecu(res.recu);
      setConfirmation(false);
      setEtape(4);
    } catch (err) {
      setConfirmation(false);
      setErreur(messageErreur(err));
    } finally {
      setChargement(false);
    }
  };

  const partage = `https://wa.me/?text=${encodeURIComponent(
    `J'ai voté aux élections du Club d'Entrepreneuriat CIAT ! 🗳️ Vote ouvert jusqu'au ${infos ? formatDate(infos.vote_fin) : ''} : ${window.location.origin}/vote`,
  )}`;

  let contenu;
  if (erreurChargement) {
    contenu = (
      <div className="text-center">
        <Alerte>{erreurChargement}</Alerte>
        <button type="button" onClick={charger} className="btn-primaire">Réessayer</button>
      </div>
    );
  } else if (!infos) {
    contenu = <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-caramel-500" /></div>;
  } else if (infos.vote_etat !== 'ouvert' && etape < 3) {
    const avant = infos.vote_etat === 'avant';
    contenu = (
      <div className="py-6 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brun-100 text-brun-600"><Lock className="h-8 w-8" /></span>
        <h2 className="mt-5 text-2xl font-extrabold text-brun-900">{avant ? 'Le vote n’est pas encore ouvert' : 'Le vote est clos'}</h2>
        <p className="mt-2 text-brun-600">
          {avant
            ? <>Ouverture le <strong>{formatDate(infos.vote_debut)}</strong>, clôture le <strong>{formatDate(infos.vote_fin)}</strong>.</>
            : 'Merci à toutes et à tous pour votre participation. Les résultats seront annoncés par la commission électorale.'}
        </p>
        <Link to={{ pathname: '/', hash: '#candidats' }} className="btn-secondaire mt-6 inline-flex">Découvrir les candidats</Link>
      </div>
    );
  } else if (etape === 0) {
    contenu = (
      <form onSubmit={demanderCode} noValidate>
        <div className="mb-6 grid gap-2 rounded-2xl bg-brun-50 p-4 text-sm text-brun-700 sm:grid-cols-3">
          <p><strong className="text-brun-900">1 bulletin</strong> par électeur</p>
          <p><strong className="text-brun-900">Code par e-mail</strong> pour vérifier votre identité</p>
          <p><strong className="text-brun-900">Définitif</strong> après confirmation</p>
        </div>
        <p className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          ℹ️ Vos choix sont enregistrés avec votre nom et consultables par l’administration de l’ISEP.
        </p>
        {erreur && <Alerte>{erreur}</Alerte>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="prenom" className="label">Prénom</label>
            <input id="prenom" autoComplete="given-name" className="champ" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
          </div>
          <div>
            <label htmlFor="nom" className="label">Nom</label>
            <input id="nom" autoComplete="family-name" className="champ" value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
        </div>
        <p className="mt-1.5 text-xs text-brun-500">Comme lors de l’inscription de votre groupe au club.</p>
        <label htmlFor="email" className="label mt-4">Votre adresse e-mail</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brun-400" />
          <input
            id="email" type="email" inputMode="email" autoComplete="email" className="champ pl-10"
            placeholder="awa.diop@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <p className="mt-1.5 text-xs text-brun-500">Vous y recevrez un code à 6 chiffres. Une adresse ne peut servir qu’une seule fois.</p>
        <button type="submit" disabled={chargement} className="btn-primaire mt-6 w-full">
          {chargement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Recevoir mon code de vote
        </button>
      </form>
    );
  } else if (etape === 1) {
    contenu = (
      <form onSubmit={verifierCode} noValidate>
        {erreur && <Alerte>{erreur}</Alerte>}
        {info && <p className="mb-5 rounded-xl bg-brun-50 p-4 text-sm leading-relaxed text-brun-700">{info}</p>}
        <label htmlFor="code" className="label">Code de vote (6 chiffres)</label>
        <input
          id="code" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6}
          className="champ text-center font-mono text-2xl font-bold tracking-[0.5em]" placeholder="••••••"
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        <button type="submit" disabled={chargement || code.length !== 6} className="btn-primaire mt-5 w-full">
          {chargement ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Ouvrir mon bulletin
        </button>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <button type="button" onClick={() => { setEtape(0); setErreur(null); }} className="font-semibold text-brun-500 hover:text-brun-700">
            Modifier mes informations
          </button>
          <button type="button" onClick={() => demanderCode()} disabled={attente > 0 || chargement} className="font-semibold text-caramel-600 hover:text-caramel-500 disabled:text-brun-300">
            {attente > 0 ? `Renvoyer le code (${attente} s)` : 'Renvoyer le code'}
          </button>
        </div>
      </form>
    );
  } else if (etape === 2 && poste) {
    const valeur = choix[poste.code];
    contenu = (
      <div>
        <div className="mb-1 flex items-center justify-between text-xs font-bold text-brun-500">
          <span>Poste {index + 1} sur {postes.length}</span>
          <span>{poste.categorie}</span>
        </div>
        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-brun-100">
          <div className="h-full rounded-full bg-caramel-500 transition-all" style={{ width: `${((index + 1) / postes.length) * 100}%` }} />
        </div>
        <h2 className="text-2xl font-extrabold text-brun-900">{poste.titre}</h2>
        <p className="mt-1 text-sm text-brun-500">
          {poste.candidat_unique ? 'Candidat unique : votez pour ou contre son élection.' : 'Choisissez un candidat, ou votez blanc.'}
        </p>
        {erreur && <div className="mt-4"><Alerte>{erreur}</Alerte></div>}
        <div className="mt-5 space-y-3">
          {poste.candidats.map((c) => (
            <CarteCandidat
              key={c.id} candidat={c} unique={poste.candidat_unique}
              choisi={!poste.candidat_unique && valeur === String(c.id)} onChoisir={() => choisir(String(c.id))}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {poste.candidat_unique && (
            <>
              <BoutonChoix actif={valeur === 'POUR'} onClick={() => choisir('POUR')} icone={ThumbsUp} couleur="border-emerald-500 bg-emerald-50 text-emerald-700">Pour</BoutonChoix>
              <BoutonChoix actif={valeur === 'CONTRE'} onClick={() => choisir('CONTRE')} icone={ThumbsDown} couleur="border-red-400 bg-red-50 text-red-700">Contre</BoutonChoix>
            </>
          )}
          <BoutonChoix actif={valeur === 'BLANC'} onClick={() => choisir('BLANC')} icone={Ban} couleur="border-brun-500 bg-brun-50 text-brun-800">Vote blanc</BoutonChoix>
        </div>
        <div className="mt-8 flex justify-between gap-3">
          <button type="button" disabled={index === 0} onClick={() => { setErreur(null); setIndex(index - 1); }} className="btn-secondaire disabled:opacity-40">
            <ArrowLeft className="h-4 w-4" /> Précédent
          </button>
          <button type="button" onClick={suivant} className="btn-primaire">
            {index < postes.length - 1 ? 'Suivant' : 'Vérifier mon bulletin'} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  } else if (etape === 3) {
    contenu = (
      <div>
        <h2 className="text-2xl font-extrabold text-brun-900">Vérifiez votre bulletin</h2>
        <p className="mt-1 text-sm text-brun-500">Une fois confirmé, votre vote ne pourra plus être modifié.</p>
        {erreur && <div className="mt-4"><Alerte>{erreur}</Alerte></div>}
        <ul className="mt-5 divide-y divide-brun-100 rounded-2xl border border-brun-100">
          {postes.map((p, i) => (
            <li key={p.code} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="block text-xs font-bold uppercase tracking-wide text-brun-400">{p.titre}</span>
                <span className="block font-bold text-brun-900">{libelleChoix(p, choix[p.code])}</span>
              </span>
              <button type="button" onClick={() => { setIndex(i); setEtape(2); }} className="shrink-0 text-sm font-bold text-caramel-600 hover:text-caramel-500">
                Modifier
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setConfirmation(true)} className="btn-primaire mt-6 w-full">
          <IconeVote className="h-4 w-4" /> Confirmer mon vote
        </button>
      </div>
    );
  } else if (etape === 4) {
    contenu = (
      <div className="py-4 text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-11 w-11" /></span>
        <h2 className="mt-5 text-3xl font-extrabold text-brun-900">A voté !</h2>
        <p className="mt-2 text-brun-600">Merci {electeur.split(' ')[0]}, votre vote a bien été enregistré.</p>
        <div className="mx-auto mt-6 max-w-xs rounded-2xl border-2 border-dashed border-caramel-300 bg-caramel-100/30 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-caramel-600">Numéro de reçu</p>
          <p className="mt-1 select-all font-mono text-2xl font-extrabold tracking-wider text-brun-900">{recu}</p>
          <p className="mt-2 text-xs text-brun-500">Il prouve que votre vote a bien été enregistré.</p>
        </div>
        <a href={partage} target="_blank" rel="noreferrer" className="btn-primaire mt-6 inline-flex">
          Inviter mes amis à voter sur WhatsApp
        </a>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-[70vh] py-12 sm:py-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <p className="text-sm font-bold uppercase tracking-wider text-caramel-600">Élections 2026-2027</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brun-800 sm:text-4xl">Votez pour le Bureau et les Cellules</h1>
          {infos && (
            <p className="mt-3 text-brun-600">
              Vote ouvert du <strong>{formatDate(infos.vote_debut)}</strong> au <strong>{formatDate(infos.vote_fin)}</strong>.
            </p>
          )}
          {electeur && etape >= 2 && etape < 4 && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" /> Électeur vérifié : {electeur}
            </p>
          )}
          <div className="mt-8 rounded-3xl border border-brun-100 bg-white p-5 shadow-xl shadow-brun-900/5 sm:p-8">
            {infos && infos.vote_etat === 'ouvert' && <Etapes actuelle={etape} />}
            {contenu}
          </div>
        </div>
      </main>
      <Footer />

      {confirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brun-900/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <IconeVote className="mx-auto h-10 w-10 text-caramel-500" />
            <h3 className="mt-3 text-xl font-extrabold text-brun-900">Confirmer définitivement ?</h3>
            <p className="mt-2 text-sm text-brun-600">Votre vote sera déposé dans l’urne et ne pourra plus être modifié.</p>
            <p className="mt-3 rounded-xl bg-amber-50 p-2.5 text-xs font-semibold text-amber-900">Vos choix sont enregistrés avec votre nom et consultables par l’administration de l’ISEP.</p>
            <div className="mt-6 flex gap-3">
              <button type="button" disabled={chargement} onClick={() => setConfirmation(false)} className="btn-secondaire flex-1">Annuler</button>
              <button type="button" disabled={chargement} onClick={envoyerVote} className="btn-primaire flex-1">
                {chargement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Oui, je vote
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
