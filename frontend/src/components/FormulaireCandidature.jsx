import { useEffect, useState, useRef } from 'react';
import { AlertCircle, Camera, CheckCircle2, Film, Link as LinkIcon, Loader2, RotateCcw, Upload, User, Video, X } from 'lucide-react';
import { POSTES } from '../lib/postes.js';
import { FILIERES } from '../lib/filieres.js';
import { api, envoyerVersR2, ErreurApi } from '../lib/api.js';

export default function FormulaireCandidature({ posteInitial, onFermer, onSucces }) {
  const [posteCode, setPosteCode] = useState(posteInitial?.code || 'PRESIDENT');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [departement, setDepartement] = useState('TIC');
  const [metier, setMetier] = useState(FILIERES.TIC[0]);
  const [niveau, setNiveau] = useState('Première année');
  const [nomProjet, setNomProjet] = useState('');
  const [professionDeFoi, setProfessionDeFoi] = useState('');

  // Photo obligatoire
  const [photoFichier, setPhotoFichier] = useState(null);
  const [photoApercu, setPhotoApercu] = useState(null);
  const photoInputRef = useRef(null);

  // Vidéo : mode lien ou mode fichier
  const [modeVideo, setModeVideo] = useState('lien'); // 'lien' ou 'fichier'
  const [lienVideo, setLienVideo] = useState('');
  const [videoFichier, setVideoFichier] = useState(null);
  const videoInputRef = useRef(null);

  // Envoi direct de la vidéo vers Cloudflare R2 (sans passer par le serveur), si configuré.
  const [configVideo, setConfigVideo] = useState({ direct: false, maxMo: 25 });
  const [envoiVideo, setEnvoiVideo] = useState({ etat: 'aucun', progression: 0, jeton: null, message: '' });
  const annulerEnvoiRef = useRef(null);

  useEffect(() => {
    api('/infos/')
      .then((d) => setConfigVideo({ direct: Boolean(d.video_envoi_direct), maxMo: d.video_taille_max_mo || 25 }))
      .catch(() => {});
    return () => annulerEnvoiRef.current?.(); // fermeture du formulaire : on interrompt l'envoi
  }, []);

  const demarrerEnvoiVideo = async (file) => {
    annulerEnvoiRef.current?.();
    setEnvoiVideo({ etat: 'envoi', progression: 0, jeton: null, message: '' });
    try {
      const autorisation = await api('/candidatures/video/autorisation/', {
        method: 'POST',
        body: { nom_fichier: file.name, type: file.type, taille: file.size },
      });
      const { promesse, annuler } = envoyerVersR2(file, autorisation, (p) =>
        setEnvoiVideo((e) => ({ ...e, progression: p })));
      annulerEnvoiRef.current = annuler;
      await promesse;
      annulerEnvoiRef.current = null;
      setEnvoiVideo({ etat: 'ok', progression: 100, jeton: autorisation.jeton, message: '' });
    } catch (err) {
      annulerEnvoiRef.current = null;
      if (err.annule) return;
      setEnvoiVideo({
        etat: 'erreur',
        progression: 0,
        jeton: null,
        message: err instanceof ErreurApi
          ? err.message
          : `${err.message} Vérifiez votre connexion puis réessayez, ou utilisez un lien vidéo.`,
      });
    }
  };

  const retirerVideo = () => {
    annulerEnvoiRef.current?.();
    annulerEnvoiRef.current = null;
    setVideoFichier(null);
    setEnvoiVideo({ etat: 'aucun', progression: 0, jeton: null, message: '' });
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [termine, setTermine] = useState(false);
  const formScrollRef = useRef(null);

  const posteSelectionne = POSTES.find((p) => p.code === posteCode) || POSTES[0];

  const handleDepartementChange = (nouveauDep) => {
    setDepartement(nouveauDep);
    if (FILIERES[nouveauDep] && FILIERES[nouveauDep].length > 0) {
      setMetier(FILIERES[nouveauDep][0]);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      setErreur('La photo ne doit pas dépasser 6 Mo.');
      return;
    }
    setPhotoFichier(file);
    setPhotoApercu(URL.createObjectURL(file));
    setErreur('');
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > configVideo.maxMo * 1024 * 1024) {
      setErreur(`Le fichier vidéo ne doit pas dépasser ${configVideo.maxMo} Mo.`);
      return;
    }
    setVideoFichier(file);
    setErreur('');
    if (configVideo.direct) demarrerEnvoiVideo(file);
  };

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur('');

    // Validations côté client
    if (!nom.trim() || !prenom.trim()) {
      setErreur('Veuillez renseigner votre nom et votre prénom.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setErreur('Veuillez renseigner une adresse e-mail valide.');
      return;
    }
    if (!telephone.trim()) {
      setErreur('Veuillez renseigner un numéro de téléphone de contact.');
      return;
    }
    if (!photoFichier) {
      setErreur('La photo est obligatoire pour que les électeurs puissent vous identifier.');
      return;
    }
    if (professionDeFoi.trim().length < 30) {
      setErreur('Votre profession de foi doit comporter au moins 30 caractères.');
      return;
    }
    if (modeVideo === 'fichier' && videoFichier && configVideo.direct) {
      if (envoiVideo.etat === 'envoi') {
        setErreur('Votre vidéo est en cours d’envoi. Patientez jusqu’à 100 % avant de valider.');
        return;
      }
      if (envoiVideo.etat === 'erreur') {
        setErreur('L’envoi de la vidéo a échoué. Relancez-le, retirez la vidéo ou utilisez un lien.');
        return;
      }
    }

    setChargement(true);
    try {
      const formData = new FormData();
      formData.append('poste', posteCode);
      formData.append('nom', nom.trim());
      formData.append('prenom', prenom.trim());
      formData.append('email', email.trim().toLowerCase());
      formData.append('telephone', telephone.trim());
      formData.append('departement', departement);
      formData.append('metier', metier);
      formData.append('niveau', niveau);
      formData.append('nom_projet', nomProjet.trim());
      formData.append('profession_de_foi', professionDeFoi.trim());
      formData.append('photo', photoFichier);

      if (modeVideo === 'lien' && lienVideo.trim()) {
        formData.append('lien_video', lienVideo.trim());
      } else if (modeVideo === 'fichier' && videoFichier) {
        if (configVideo.direct) {
          // La vidéo est déjà sur R2 : on n'envoie au serveur qu'un petit jeton signé.
          formData.append('video_jeton', envoiVideo.jeton);
        } else {
          formData.append('fichier_video', videoFichier); // ancien mode (R2 non configuré)
        }
      }

      await api('/candidatures/', {
        method: 'POST',
        body: formData,
      });

      setTermine(true);
      if (onSucces) onSucces();
    } catch (err) {
      setErreur(
        err instanceof ErreurApi
          ? err.status === 413
            ? 'Fichiers trop volumineux pour le serveur. Réduisez la taille de la vidéo ou utilisez un lien.'
            : err.status >= 500
              ? 'Le serveur a rencontré une erreur temporaire. Veuillez réessayer dans quelques instants.'
              : err.message || 'Vérifiez les informations saisies et réessayez.'
          : 'Impossible de joindre le serveur. Vérifiez votre connexion Internet.'
      );
      if (formScrollRef.current) {
        formScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative my-8 w-full max-w-2xl rounded-3xl bg-white shadow-2xl transition-all">
        {/* En-tête */}
        <div className="flex items-start justify-between border-b border-brun-100 bg-[#faf6f3] px-6 py-5 sm:px-8">
          <div>
            <span className="inline-block rounded-full bg-caramel-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-caramel-800">
              {posteSelectionne.categorie}
            </span>
            <h3 className="mt-1.5 text-xl font-extrabold text-brun-800 sm:text-2xl">
              Candidature : {posteSelectionne.titre}
            </h3>
            <p className="mt-1 text-xs text-brun-500 sm:text-sm">
              Remplissez ce formulaire pour valider votre candidature officielle aux élections du club.
            </p>
          </div>
          <button
            type="button"
            onClick={onFermer}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brun-100 text-brun-600 transition hover:bg-brun-200"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {termine ? (
          <div className="p-8 text-center sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h4 className="mt-4 text-2xl font-bold text-brun-800">Candidature enregistrée avec succès</h4>
            <p className="mt-3 text-sm leading-relaxed text-brun-600">
              Votre candidature pour le poste de <strong>{posteSelectionne.titre}</strong> a bien été transmise à la commission électorale.
              Un e-mail de confirmation a été envoyé à <strong>{email}</strong>.
            </p>
            <div className="mt-6 rounded-2xl border border-caramel-200 bg-caramel-50/70 p-4 text-left text-xs leading-relaxed text-brun-800 sm:text-sm">
              <p className="font-bold text-caramel-900">Prochaine étape :</p>
              <p className="mt-1 text-brun-700">
                La commission électorale vérifiera la conformité de votre dossier. Dès validation, votre fiche de campagne
                et votre photo apparaîtront sur l’isoloir numérique pour l’ouverture prochaine du scrutin en ligne.
              </p>
            </div>
            <button
              type="button"
              onClick={onFermer}
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-caramel-500 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-caramel-400"
            >
              Fermer cette fenêtre
            </button>
          </div>
        ) : (
          <form ref={formScrollRef} onSubmit={soumettre} className="max-h-[75vh] space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
            {erreur && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{erreur}</span>
              </div>
            )}

            {/* 1. Choix du poste */}
            <div>
              <label htmlFor="poste_choix" className="label">Poste brigué</label>
              <select
                id="poste_choix"
                value={posteCode}
                onChange={(e) => setPosteCode(e.target.value)}
                className="champ"
              >
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
            </div>

            {/* 2. Photo obligatoire avec prévisualisation */}
            <div>
              <label className="label">
                Photo officielle du candidat <span className="text-red-600 font-bold">*</span>
                <span className="ml-2 text-xs font-normal text-brun-500">(Obligatoire pour que les électeurs puissent vous identifier)</span>
              </label>

              <div className="mt-2 flex items-center gap-5">
                <div
                  onClick={() => photoInputRef.current?.click()}
                  className="group relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-caramel-300 bg-brun-50 transition hover:border-caramel-500"
                >
                  {photoApercu ? (
                    <img src={photoApercu} alt="Aperçu photo" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-brun-400 group-hover:text-caramel-600">
                      <Camera className="h-7 w-7" />
                      <span className="mt-1 text-[10px] font-bold">Ajouter</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 text-xs text-brun-600">
                  <p className="font-semibold text-brun-800">Importez un portrait net (face dégagée)</p>
                  <p className="mt-1">Format accepté : JPG, PNG (taille maximale : 6 Mo).</p>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-brun-200 bg-white px-3 py-1.5 text-xs font-bold text-brun-800 shadow-sm hover:bg-brun-50"
                  >
                    <Upload className="h-3.5 w-3.5 text-caramel-600" /> {photoFichier ? 'Changer la photo' : 'Sélectionner une photo'}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                </div>
              </div>
            </div>

            {/* 3. Identité du candidat */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="prenom_candidat" className="label">Prénom <span className="text-red-600">*</span></label>
                <input
                  id="prenom_candidat"
                  type="text"
                  required
                  placeholder="Ex : Ousmane"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  className="champ"
                />
              </div>
              <div>
                <label htmlFor="nom_candidat" className="label">Nom <span className="text-red-600">*</span></label>
                <input
                  id="nom_candidat"
                  type="text"
                  required
                  placeholder="Ex : Diallo"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="champ"
                />
              </div>
            </div>

            {/* 4. Filière & Département */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="dep_candidat" className="label">Département <span className="text-red-600">*</span></label>
                <select
                  id="dep_candidat"
                  value={departement}
                  onChange={(e) => handleDepartementChange(e.target.value)}
                  className="champ"
                >
                  <option value="TIC">TIC</option>
                  <option value="Automobile">Automobile</option>
                </select>
              </div>

              <div>
                <label htmlFor="metier_candidat" className="label">Filière / Métier <span className="text-red-600">*</span></label>
                <select
                  id="metier_candidat"
                  value={metier}
                  onChange={(e) => setMetier(e.target.value)}
                  className="champ"
                >
                  {(FILIERES[departement] || []).map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="niveau_candidat" className="label">Niveau d'études</label>
                <select
                  id="niveau_candidat"
                  value={niveau}
                  onChange={(e) => setNiveau(e.target.value)}
                  className="champ"
                >
                  <option value="Première année">Première année</option>
                  <option value="Deuxième année">Deuxième année</option>
                </select>
              </div>
            </div>

            {/* 5. Coordonnées */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email_candidat" className="label">
                  Adresse e-mail <span className="text-red-600">*</span>
                </label>
                <input
                  id="email_candidat"
                  type="email"
                  required
                  placeholder="nom.prenom@isep.sn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="champ"
                />
                <p className="mt-1 text-[11px] text-brun-500">Un étudiant ne peut postuler qu'à un seul poste avec son e-mail.</p>
              </div>

              <div>
                <label htmlFor="tel_candidat" className="label">
                  Numéro de téléphone <span className="text-red-600">*</span>
                </label>
                <input
                  id="tel_candidat"
                  type="tel"
                  required
                  placeholder="77 000 00 00"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="champ"
                />
              </div>
            </div>

            {/* 6. Groupe ou projet existant (optionnel) */}
            <div>
              <label htmlFor="projet_candidat" className="label">
                Groupe ou projet au club <span className="text-xs font-normal text-brun-500">(Facultatif si vous êtes déjà inscrit dans une équipe)</span>
              </label>
              <input
                id="projet_candidat"
                type="text"
                placeholder="Ex : EcoSolar - Les Bâtisseurs"
                value={nomProjet}
                onChange={(e) => setNomProjet(e.target.value)}
                className="champ"
              />
            </div>

            {/* 7. Profession de foi */}
            <div>
              <label htmlFor="profession_foi" className="label">
                Profession de foi / Vision pour ce poste <span className="text-red-600">*</span>
              </label>
              <textarea
                id="profession_foi"
                rows={4}
                required
                placeholder="Présentez votre vision, vos motivations et ce que vous comptez apporter au club pour ce mandat..."
                value={professionDeFoi}
                onChange={(e) => setProfessionDeFoi(e.target.value)}
                className="champ resize-y"
              />
              <div className="mt-1 flex justify-between text-[11px] text-brun-500">
                <span>Minimum 30 caractères</span>
                <span>{professionDeFoi.length} caractères</span>
              </div>
            </div>

            {/* 8. Vidéo de campagne (Double option) */}
            <div className="rounded-2xl border border-caramel-200 bg-[#faf6f3] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-sm font-extrabold text-brun-900">
                  <Video className="h-4 w-4 text-caramel-600" />
                  Vidéo de campagne électorale <span className="text-xs font-normal text-brun-500">(Recommandée)</span>
                </label>
                <div className="flex rounded-lg border border-brun-200 bg-white p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setModeVideo('lien')}
                    className={`rounded-md px-2.5 py-1 transition ${modeVideo === 'lien' ? 'bg-caramel-500 text-white' : 'text-brun-600 hover:text-brun-900'}`}
                  >
                    Lien vidéo
                  </button>
                  <button
                    type="button"
                    onClick={() => setModeVideo('fichier')}
                    className={`rounded-md px-2.5 py-1 transition ${modeVideo === 'fichier' ? 'bg-caramel-500 text-white' : 'text-brun-600 hover:text-brun-900'}`}
                  >
                    Fichier vidéo
                  </button>
                </div>
              </div>

              <div className="mt-2.5 rounded-xl border border-caramel-200/80 bg-white p-3.5 text-xs leading-relaxed text-brun-700">
                <p className="font-bold text-brun-900">
                  À quoi sert cette vidéo ? C’est votre vidéo officielle de campagne :
                </p>
                <p className="mt-1">
                  Elle sera consultée par les électeurs sur la plateforme avant le vote pour vous présenter et convaincre :
                </p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-brun-600">
                  <li><strong>Votre présentation</strong> : prénom, nom, département et filière.</li>
                  <li><strong>Vos motivations</strong> : pourquoi vous souhaitez occuper ce poste de responsabilité.</li>
                  <li><strong>Votre programme</strong> : vos idées concrètes et engagements pour faire avancer le club.</li>
                </ul>
                <p className="mt-1.5 text-[11px] font-semibold text-caramel-800">
                  Durée idéale : 1 à 2 minutes maximum (vous pouvez simplement vous filmer avec votre téléphone).
                </p>
              </div>

              {modeVideo === 'lien' ? (
                <div className="mt-3">
                  <div className="relative">
                    <LinkIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-brun-400" />
                    <input
                      type="url"
                      placeholder="https://drive.google.com/... ou https://youtu.be/..."
                      value={lienVideo}
                      onChange={(e) => setLienVideo(e.target.value)}
                      className="champ pl-9"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-brun-500">
                    Lien vers Google Drive (accès public), YouTube, TikTok, Loom ou LinkedIn.
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  {!videoFichier ? (
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-caramel-400 bg-white px-4 py-3 text-xs font-bold text-brun-800 hover:bg-caramel-50/50"
                    >
                      <Film className="h-4 w-4 text-caramel-600" />
                      Choisir un fichier vidéo (max {configVideo.maxMo} Mo)
                    </button>
                  ) : (
                    <div className="rounded-xl border border-brun-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="flex min-w-0 items-center gap-2 text-xs font-bold text-brun-800">
                          <Film className="h-4 w-4 shrink-0 text-caramel-600" />
                          <span className="truncate">{videoFichier.name}</span>
                          <span className="shrink-0 font-normal text-brun-500">({(videoFichier.size / 1024 / 1024).toFixed(1)} Mo)</span>
                        </p>
                        <button type="button" onClick={retirerVideo} className="shrink-0 rounded-lg p-1 text-brun-500 hover:bg-brun-50" aria-label="Retirer la vidéo">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {configVideo.direct && envoiVideo.etat === 'envoi' && (
                        <div className="mt-2.5">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-brun-100" role="progressbar"
                            aria-valuenow={envoiVideo.progression} aria-valuemin={0} aria-valuemax={100} aria-label="Envoi de la vidéo">
                            <div className="h-full rounded-full bg-caramel-500 transition-all" style={{ width: `${envoiVideo.progression}%` }} />
                          </div>
                          <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-brun-600">
                            <Loader2 className="h-3 w-3 animate-spin" /> Envoi de la vidéo… {envoiVideo.progression} %
                            <span className="font-normal text-brun-500">— vous pouvez continuer à remplir le formulaire.</span>
                          </p>
                        </div>
                      )}
                      {configVideo.direct && envoiVideo.etat === 'ok' && (
                        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Vidéo envoyée avec succès.
                        </p>
                      )}
                      {configVideo.direct && envoiVideo.etat === 'erreur' && (
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold text-red-700">{envoiVideo.message}</p>
                          <button type="button" onClick={() => demarrerEnvoiVideo(videoFichier)}
                            className="inline-flex items-center gap-1 rounded-lg border border-brun-200 px-2.5 py-1 text-[11px] font-bold text-brun-800 hover:bg-brun-50">
                            <RotateCcw className="h-3 w-3" /> Réessayer
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={handleVideoSelect}
                  />
                  <p className="mt-1 text-[11px] text-brun-500">
                    Formats acceptés : MP4, WebM, MOV ({configVideo.maxMo} Mo maximum).
                  </p>
                </div>
              )}
            </div>

            {/* Boutons d'action */}
            {erreur && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700 sm:text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{erreur}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 border-t border-brun-100 pt-5">
              <button
                type="button"
                onClick={onFermer}
                disabled={chargement}
                className="rounded-xl border border-brun-200 px-5 py-2.5 text-sm font-semibold text-brun-700 hover:bg-brun-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={chargement || (modeVideo === 'fichier' && envoiVideo.etat === 'envoi')}
                className="inline-flex items-center gap-2 rounded-xl bg-caramel-500 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-caramel-400 disabled:opacity-50"
              >
                {chargement ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Envoi de votre candidature...
                  </>
                ) : (
                  'Déposer ma candidature'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
