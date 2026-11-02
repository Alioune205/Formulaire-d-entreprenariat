import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, FileSearch, FileText, Handshake, Loader2, Lock, Plus, Send, Trash2, UserRound, Users,
} from 'lucide-react';
import { api, ErreurApi } from '../lib/api.js';
import CompteARebours from './CompteARebours.jsx';
import { FILIERES, LIBELLES_DEPARTEMENTS, MAX_MEMBRES } from '../lib/filieres.js';

const MIN_DESCRIPTION = 30;

const ENGAGEMENTS = [
  'Participer activement aux ateliers et réunions du club.',
  'Faire avancer le projet et rendre compte de sa progression.',
  'Respecter la charte du club et les autres membres.',
];

const membreVide = () => ({ nom: '', prenom: '', departement: '', metier: '' });
const etatInitial = () => ({
  nom_groupe: '',
  nom_projet: '',
  email: '',
  description_projet: '',
  membres: [membreVide()],
  engagement: false,
});

function valider(f) {
  const e = {};
  if (f.nom_groupe.trim().length < 2) e.nom_groupe = 'Indiquez le nom du groupe.';
  if (f.nom_projet.trim().length < 2) e.nom_projet = 'Indiquez le nom du projet.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Indiquez une adresse e-mail valide.';
  if (f.description_projet.trim().length < MIN_DESCRIPTION) {
    e.description_projet = `Décrivez le projet en au moins ${MIN_DESCRIPTION} caractères.`;
  }
  const em = f.membres.map((m) => {
    const x = {};
    if (!m.nom.trim()) x.nom = 'Obligatoire';
    if (!m.prenom.trim()) x.prenom = 'Obligatoire';
    if (!m.departement.trim()) x.departement = 'Obligatoire';
    if (!m.metier.trim()) x.metier = 'Obligatoire';
    return x;
  });
  if (em.some((x) => Object.keys(x).length)) e.membres = em;
  if (!f.engagement) e.engagement = 'Le groupe doit s’engager avant d’envoyer l’inscription.';
  return e;
}

// Convertit les erreurs DRF ({champ: ["msg"]}) au format du formulaire.
function erreursServeur(data) {
  if (!data || typeof data !== 'object') return {};
  const e = {};
  for (const [cle, val] of Object.entries(data)) {
    if (cle === 'membres' && Array.isArray(val) && typeof val[0] === 'object') {
      e.membres = val.map((m) =>
        Object.fromEntries(Object.entries(m || {}).map(([k, v]) => [k, [].concat(v)[0]])),
      );
    } else {
      e[cle] = [].concat(val)[0];
    }
  }
  return e;
}

function Erreur({ children }) {
  if (!children) return null;
  return <p className="mt-1 text-xs font-medium text-red-600">{children}</p>;
}

function TitreBloc({ icone: Icone, numero, children }) {
  return (
    <h3 className="mb-5 flex items-center gap-2.5 text-sm font-bold uppercase tracking-wider text-brun-700">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-caramel-100 text-caramel-600">
        <Icone className="h-4 w-4" />
      </span>
      {numero}. {children}
    </h3>
  );
}

export default function FormulaireInscription({ temps }) {
  const [form, setForm] = useState(etatInitial);
  const [erreurs, setErreurs] = useState({});
  const [envoi, setEnvoi] = useState(false);
  const [messageGlobal, setMessageGlobal] = useState(null);
  const [succes, setSucces] = useState(null);

  const maj = (champ, valeur) => {
    setForm((f) => ({ ...f, [champ]: valeur }));
    setErreurs((e) => ({ ...e, [champ]: undefined }));
  };

  const majMembre = (i, champ, valeur) => {
    setForm((f) => ({
      ...f,
      membres: f.membres.map((m, j) => {
        if (j !== i) return m;
        // Changer de département vide la filière, qui dépend du département.
        return champ === 'departement' ? { ...m, departement: valeur, metier: '' } : { ...m, [champ]: valeur };
      }),
    }));
    setErreurs((e) => {
      if (!Array.isArray(e.membres) || !e.membres[i]) return e;
      const membres = e.membres.map((m, j) => (j === i ? { ...m, [champ]: undefined } : m));
      return { ...e, membres };
    });
  };

  const ajouterMembre = () => setForm((f) => ({ ...f, membres: [...f.membres, membreVide()] }));
  const retirerMembre = (i) => {
    setForm((f) => ({ ...f, membres: f.membres.filter((_, j) => j !== i) }));
    setErreurs((e) => ({ ...e, membres: Array.isArray(e.membres) ? e.membres.filter((_, j) => j !== i) : e.membres }));
  };

  const soumettre = async (ev) => {
    ev.preventDefault();
    setMessageGlobal(null);
    const e = valider(form);
    setErreurs(e);
    if (Object.keys(e).length) {
      setMessageGlobal('Certains champs sont à compléter. Vérifiez les zones en rouge.');
      return;
    }
    setEnvoi(true);
    try {
      const res = await api('/inscriptions/', { method: 'POST', body: form });
      setSucces({ ...res, nom_groupe: form.nom_groupe.trim(), email: form.email.trim().toLowerCase() });
      window.scrollTo({ top: document.getElementById('inscription').offsetTop - 70, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof ErreurApi && err.status === 403) {
        setMessageGlobal(err.message); // inscriptions closes côté serveur
      } else if (err instanceof ErreurApi && err.status === 400) {
        setErreurs(erreursServeur(err.data));
        setMessageGlobal(err.message);
      } else if (err instanceof ErreurApi && err.status === 429) {
        setMessageGlobal('Trop de tentatives. Réessayez dans quelques minutes.');
      } else {
        setMessageGlobal('Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.');
      }
    } finally {
      setEnvoi(false);
    }
  };

  const recommencer = () => {
    setForm(etatInitial());
    setErreurs({});
    setSucces(null);
    setMessageGlobal(null);
  };

  const errMembre = (i, champ) => (Array.isArray(erreurs.membres) ? erreurs.membres[i]?.[champ] : undefined);

  return (
    <section id="inscription" className="scroll-mt-16 py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-caramel-600">Formulaire d'inscription</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-brun-800 sm:text-4xl">
            Inscrivez votre groupe au club
          </h2>
          <p className="mt-3 text-brun-600">Tous les champs sont obligatoires.</p>
          {!succes && temps.ouvert && (
            <div className="mt-8 flex justify-center">
              <CompteARebours temps={temps} variante="clair" />
            </div>
          )}
        </div>

        {!succes && !temps.ouvert ? (
          <div className="mx-auto max-w-2xl rounded-3xl border border-brun-100 bg-white p-8 text-center shadow-xl sm:p-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brun-100 text-brun-700">
              <Lock className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold text-brun-800">Les inscriptions sont closes</h3>
            <p className="mt-3 leading-relaxed text-brun-600">
              La période d’inscription de cette cohorte est terminée. Les groupes déjà inscrits peuvent suivre l’avancement de leur dossier.
            </p>
            <Link to="/suivi" className="btn-primaire mt-8">
              <FileSearch className="h-4 w-4" /> Suivre mon dossier
            </Link>
          </div>
        ) : succes ? (
          <div className="mx-auto max-w-2xl rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-xl sm:p-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold text-brun-800">Inscription enregistrée !</h3>
            <p className="mt-3 leading-relaxed text-brun-600">{succes.message}</p>
            <p className="mt-6 inline-block rounded-xl border border-brun-100 bg-brun-50 px-4 py-3 font-mono text-sm text-brun-600">
              Référence : <span className="font-bold text-caramel-600">{succes.reference}</span>
            </p>
            <p className="mt-3 text-sm text-brun-500">
              Conservez cette référence : avec le nom du groupe, elle permet de suivre votre dossier.
              Une copie vient d’être envoyée à <strong className="text-brun-700">{succes.email}</strong>.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to={`/suivi?ref=${encodeURIComponent(succes.reference)}&groupe=${encodeURIComponent(succes.nom_groupe)}`}
                className="btn-primaire"
              >
                <FileSearch className="h-4 w-4" /> Suivre mon dossier
              </Link>
              <button type="button" onClick={recommencer} className="btn-secondaire">
                Inscrire un autre groupe
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={soumettre} noValidate className="overflow-hidden rounded-3xl border border-brun-100 bg-white shadow-xl shadow-brun-900/5">
            <div className="bg-brun-800 px-6 py-6 text-white sm:px-10">
              <p className="text-lg font-bold">Dossier d'inscription • Cohorte 2026-2027</p>
              <p className="mt-1 text-sm text-brun-200">Comptez environ 5 minutes pour un groupe de 3 à 5 personnes.</p>
            </div>

            <div className="space-y-10 p-6 sm:p-10">
              {messageGlobal && (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{messageGlobal}</span>
                </div>
              )}

              {/* 1. Groupe & projet */}
              <div>
                <TitreBloc icone={Users} numero={1}>Le groupe et le projet</TitreBloc>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="nom_groupe" className="label">Nom du groupe</label>
                    <input
                      id="nom_groupe"
                      className={`champ ${erreurs.nom_groupe ? 'champ-erreur' : ''}`}
                      placeholder="Ex : Les Bâtisseurs"
                      maxLength={120}
                      value={form.nom_groupe}
                      onChange={(e) => maj('nom_groupe', e.target.value)}
                    />
                    <Erreur>{erreurs.nom_groupe}</Erreur>
                  </div>
                  <div>
                    <label htmlFor="nom_projet" className="label">Nom du projet</label>
                    <input
                      id="nom_projet"
                      className={`champ ${erreurs.nom_projet ? 'champ-erreur' : ''}`}
                      placeholder="Ex : AgriCollect"
                      maxLength={150}
                      value={form.nom_projet}
                      onChange={(e) => maj('nom_projet', e.target.value)}
                    />
                    <Erreur>{erreurs.nom_projet}</Erreur>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="email" className="label">Adresse e-mail du responsable</label>
                    <input
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      className={`champ ${erreurs.email ? 'champ-erreur' : ''}`}
                      placeholder="Ex : awa.diop@gmail.com"
                      maxLength={254}
                      value={form.email}
                      onChange={(e) => maj('email', e.target.value)}
                    />
                    {erreurs.email ? (
                      <Erreur>{erreurs.email}</Erreur>
                    ) : (
                      <p className="mt-1 text-xs text-brun-500">
                        Vous y recevrez votre référence de dossier. Elle servira aussi à la récupérer en cas d’oubli.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Membres */}
              <div className="border-t border-brun-100 pt-8">
                <TitreBloc icone={UserRound} numero={2}>
                  Les membres <span className="font-semibold normal-case tracking-normal text-brun-400">({form.membres.length}/{MAX_MEMBRES})</span>
                </TitreBloc>

                <div className="space-y-4">
                  {form.membres.map((m, i) => (
                    <fieldset key={i} className="rounded-2xl border border-brun-100 bg-brun-50/60 p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <legend className="text-sm font-bold text-brun-700">
                          Membre {i + 1}{i === 0 && <span className="ml-2 rounded-md bg-caramel-100 px-2 py-0.5 text-xs font-semibold text-caramel-600">Responsable</span>}
                        </legend>
                        {form.membres.length > 1 && (
                          <button
                            type="button"
                            onClick={() => retirerMembre(i)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                            aria-label={`Retirer le membre ${i + 1}`}
                          >
                            <Trash2 className="h-4 w-4" /> Retirer
                          </button>
                        )}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {[
                          ['nom', 'Nom', 'Ex : Diop'],
                          ['prenom', 'Prénom', 'Ex : Awa'],
                        ].map(([champ, libelle, ph]) => (
                          <div key={champ}>
                            <label htmlFor={`m${i}-${champ}`} className="label">{libelle}</label>
                            <input
                              id={`m${i}-${champ}`}
                              className={`champ ${errMembre(i, champ) ? 'champ-erreur' : ''}`}
                              placeholder={ph}
                              maxLength={80}
                              value={m[champ]}
                              onChange={(e) => majMembre(i, champ, e.target.value)}
                            />
                            <Erreur>{errMembre(i, champ)}</Erreur>
                          </div>
                        ))}

                        <div>
                          <label htmlFor={`m${i}-departement`} className="label">Département</label>
                          <select
                            id={`m${i}-departement`}
                            className={`champ ${errMembre(i, 'departement') ? 'champ-erreur' : ''} ${m.departement ? '' : 'text-brun-300'}`}
                            value={m.departement}
                            onChange={(e) => majMembre(i, 'departement', e.target.value)}
                          >
                            <option value="" disabled>Choisir le département…</option>
                            {Object.keys(FILIERES).map((d) => (
                              <option key={d} value={d} className="text-brun-900">{LIBELLES_DEPARTEMENTS[d]}</option>
                            ))}
                          </select>
                          <Erreur>{errMembre(i, 'departement')}</Erreur>
                        </div>

                        <div>
                          <label htmlFor={`m${i}-metier`} className="label">Filière (métier)</label>
                          <select
                            id={`m${i}-metier`}
                            className={`champ disabled:cursor-not-allowed disabled:bg-brun-50 ${errMembre(i, 'metier') ? 'champ-erreur' : ''} ${m.metier ? '' : 'text-brun-300'}`}
                            value={m.metier}
                            disabled={!m.departement}
                            onChange={(e) => majMembre(i, 'metier', e.target.value)}
                          >
                            <option value="" disabled>
                              {m.departement ? 'Choisir la filière…' : 'Choisissez d’abord le département'}
                            </option>
                            {(FILIERES[m.departement] ?? []).map((f) => (
                              <option key={f} value={f} className="text-brun-900">{f}</option>
                            ))}
                          </select>
                          <Erreur>{errMembre(i, 'metier')}</Erreur>
                        </div>
                      </div>
                    </fieldset>
                  ))}
                </div>
                {typeof erreurs.membres === 'string' && <Erreur>{erreurs.membres}</Erreur>}

                {form.membres.length < MAX_MEMBRES && (
                  <button type="button" onClick={ajouterMembre} className="btn-secondaire mt-4 w-full border-dashed sm:w-auto">
                    <Plus className="h-4 w-4" /> Ajouter un membre
                  </button>
                )}
              </div>

              {/* 3. Description */}
              <div className="border-t border-brun-100 pt-8">
                <TitreBloc icone={FileText} numero={3}>Description du projet</TitreBloc>
                <label htmlFor="description_projet" className="label">
                  Quel problème votre projet résout-il, pour qui, et comment ?
                </label>
                <textarea
                  id="description_projet"
                  rows={6}
                  className={`champ resize-y ${erreurs.description_projet ? 'champ-erreur' : ''}`}
                  placeholder="Décrivez le problème, votre solution, les bénéficiaires et ce que vous attendez du club…"
                  value={form.description_projet}
                  onChange={(e) => maj('description_projet', e.target.value)}
                />
                <div className="mt-1 flex justify-between">
                  <Erreur>{erreurs.description_projet}</Erreur>
                  <span className={`ml-auto text-xs ${form.description_projet.trim().length < MIN_DESCRIPTION ? 'text-brun-400' : 'text-emerald-600'}`}>
                    {form.description_projet.trim().length} / {MIN_DESCRIPTION} min.
                  </span>
                </div>
              </div>

              {/* 4. Engagement */}
              <div className="border-t border-brun-100 pt-8">
                <TitreBloc icone={Handshake} numero={4}>Engagement du groupe</TitreBloc>
                <div className={`rounded-2xl border-2 p-6 transition ${form.engagement ? 'border-emerald-300 bg-emerald-50/60' : erreurs.engagement ? 'border-red-300 bg-red-50/40' : 'border-caramel-200 bg-caramel-100/40'}`}>
                  <p className="text-sm font-semibold text-brun-800">En rejoignant le club, notre groupe s'engage à :</p>
                  <ul className="mt-3 space-y-2">
                    {ENGAGEMENTS.map((t) => (
                      <li key={t} className="flex gap-2 text-sm text-brun-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-caramel-500" /> {t}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.engagement}
                    onClick={() => maj('engagement', !form.engagement)}
                    className={`mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-xl px-6 py-4 text-base font-bold transition sm:w-auto ${
                      form.engagement
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700'
                        : 'border-2 border-brun-800 bg-white text-brun-800 hover:bg-brun-800 hover:text-white'
                    }`}
                  >
                    {form.engagement ? <CheckCircle2 className="h-5 w-5" /> : <Handshake className="h-5 w-5" />}
                    {form.engagement ? 'Notre groupe est engagé' : 'Je m’engage au nom du groupe'}
                  </button>
                  <Erreur>{erreurs.engagement}</Erreur>
                </div>
              </div>

              {/* Envoi */}
              <div className="flex flex-col items-center justify-between gap-4 border-t border-brun-100 pt-8 sm:flex-row">
                <p className="text-xs text-brun-500">
                  {form.engagement ? 'Tout est prêt, vous pouvez envoyer.' : 'Le bouton d’envoi s’active après l’engagement du groupe.'}
                </p>
                <button type="submit" disabled={envoi || !form.engagement} className="btn-primaire w-full px-8 py-4 sm:w-auto">
                  {envoi ? <><Loader2 className="h-4 w-4 animate-spin" /> Envoi…</> : <><Send className="h-4 w-4" /> Envoyer l'inscription</>}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
