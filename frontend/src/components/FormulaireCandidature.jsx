import { useState, useRef } from 'react';
import { AlertCircle, Camera, CheckCircle2, Film, Link as LinkIcon, Loader2, Upload, User, Video, X } from 'lucide-react';
import { POSTES } from '../lib/postes.js';
import { FILIERES } from '../lib/filieres.js';

export default function FormulaireCandidature({ posteInitial, onFermer, onSucces }) {
  const [posteCode, setPosteCode] = useState(posteInitial?.code || 'PRESIDENT');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [departement, setDepartement] = useState('TIC');
  const [metier, setMetier] = useState(FILIERES.TIC[0]);
  const [niveau, setNiveau] = useState('1ère année');
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

  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [termine, setTermine] = useState(false);

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
    if (file.size > 25 * 1024 * 1024) {
      setErreur('Le fichier vidéo ne doit pas dépasser 25 Mo.');
      return;
    }
    setVideoFichier(file);
    setErreur('');
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
        formData.append('fichier_video', videoFichier);
      }

      const res = await fetch('/api/candidatures/', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.email) {
          throw new Error(Array.isArray(data.email) ? data.email[0] : data.email);
        }
        if (data.photo) {
          throw new Error(Array.isArray(data.photo) ? data.photo[0] : data.photo);
        }
        if (data.detail) {
          throw new Error(data.detail);
        }
        throw new Error('Une erreur est survenue lors de l’enregistrement de votre candidature.');
      }

      setTermine(true);
      if (onSucces) onSucces();
    } catch (err) {
      setErreur(err.message || 'Impossible de joindre le serveur. Veuillez réessayer.');
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
                et votre photo apparaîtront sur l’isoloir numérique pour l’ouverture du scrutin en ligne ce samedi.
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
          <form onSubmit={soumettre} className="max-h-[75vh] space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
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
                  <option value="1ère année">1ère année (Licence 1 / BTS 1)</option>
                  <option value="2ème année">2ème année (Licence 2 / BTS 2)</option>
                  <option value="3ème année">3ème année (Licence 3)</option>
                  <option value="Master / Autre">Autre</option>
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
            <div className="rounded-2xl border border-brun-200 bg-[#faf6f3] p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-brun-800">
                  Vidéo de présentation / Campagne <span className="text-xs font-normal text-brun-500">(Recommandée)</span>
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

              <p className="mt-1 text-xs text-brun-600">
                Une courte vidéo de 60 à 90 secondes où vous expliquez votre motivation et votre programme pour le poste.
              </p>

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
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-caramel-400 bg-white px-4 py-3 text-xs font-bold text-brun-800 hover:bg-caramel-50/50"
                  >
                    <Film className="h-4 w-4 text-caramel-600" />
                    {videoFichier ? videoFichier.name : 'Choisir un fichier vidéo court (max 25 Mo)'}
                  </button>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={handleVideoSelect}
                  />
                  <p className="mt-1 text-[11px] text-brun-500">
                    Formats acceptés : MP4, WebM (25 Mo maximum).
                  </p>
                </div>
              )}
            </div>

            {/* Boutons d'action */}
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
                disabled={chargement}
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
