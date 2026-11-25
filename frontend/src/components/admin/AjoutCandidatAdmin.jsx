import { useState } from 'react';
import { AlertCircle, ImagePlus, Loader2, UserPlus, X } from 'lucide-react';
import { api, ErreurApi } from '../../lib/api.js';
import { POSTES } from '../../lib/postes.js';
import { FILIERES, LIBELLES_DEPARTEMENTS } from '../../lib/filieres.js';

const VIDE = {
  poste: '', prenom: '', nom: '', email: '', telephone: '',
  departement: 'TIC', metier: FILIERES.TIC[0], niveau: 'Première année',
  nom_projet: '', profession_de_foi: '', lien_video: '', statut: 'VALIDE',
};

const LIBELLES_CHAMPS = {
  poste: 'Poste', prenom: 'Prénom', nom: 'Nom', email: 'E-mail', telephone: 'Téléphone',
  departement: 'Département', metier: 'Filière', profession_de_foi: 'Profession de foi',
  photo: 'Photo', lien_video: 'Lien vidéo',
};

function messageErreur(err) {
  if (!(err instanceof ErreurApi)) return 'Impossible de joindre le serveur. Réessayez.';
  if (err.data && typeof err.data === 'object' && !err.data.detail) {
    const [cle, val] = Object.entries(err.data)[0] ?? [];
    if (cle) return `${LIBELLES_CHAMPS[cle] ?? cle} : ${Array.isArray(val) ? val[0] : val}`;
  }
  return err.message;
}

/**
 * Ajout manuel d'un candidat par l'admin (candidature reçue hors formulaire, sur décision de la commission).
 * La vidéo s'ajoute ensuite depuis la fiche du candidat (bouton « Ajouter la vidéo »).
 */
export default function AjoutCandidatAdmin({ onFermer, onCree, onDeconnexion }) {
  const [f, setF] = useState(VIDE);
  const [photo, setPhoto] = useState(null);
  const [apercu, setApercu] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  const maj = (champ) => (e) => setF((x) => ({ ...x, [champ]: e.target.value }));

  const choisirPhoto = async (e) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    if (fichier.size > 6 * 1024 * 1024) {
      setErreur('La photo ne doit pas dépasser 6 Mo.');
      return;
    }
    // Copie en mémoire (évite les erreurs de lecture des fichiers Android/Drive au moment de l'envoi).
    const copie = new File([await fichier.arrayBuffer()], fichier.name, { type: fichier.type });
    setPhoto(copie);
    setApercu(URL.createObjectURL(copie));
    setErreur(null);
  };

  const envoyer = async (e) => {
    e.preventDefault();
    setErreur(null);
    const manquants = ['poste', 'prenom', 'nom', 'email', 'telephone', 'profession_de_foi'].filter((k) => !f[k].trim());
    if (manquants.length) {
      setErreur(`Champ obligatoire : ${manquants.map((k) => LIBELLES_CHAMPS[k]).join(', ')}.`);
      return;
    }
    const donnees = new FormData();
    Object.entries(f).forEach(([k, v]) => donnees.append(k, typeof v === 'string' ? v.trim() : v));
    if (photo) donnees.append('photo', photo);
    setEnvoi(true);
    try {
      const cree = await api('/admin/candidatures/', { method: 'POST', body: donnees, auth: true });
      onCree(cree);
    } catch (err) {
      if (err instanceof ErreurApi && err.status === 401 && onDeconnexion) return onDeconnexion();
      setErreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
    return undefined;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" onClick={onFermer}>
      <form
        onSubmit={envoyer} noValidate onClick={(e) => e.stopPropagation()}
        className="relative my-8 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <button type="button" onClick={onFermer} aria-label="Fermer"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-brun-100 text-brun-600 hover:bg-brun-200">
          <X className="h-5 w-5" />
        </button>
        <h3 className="flex items-center gap-2 text-2xl font-extrabold text-brun-800">
          <UserPlus className="h-6 w-6 text-caramel-500" /> Ajouter un candidat
        </h3>
        <p className="mt-1 text-sm text-brun-500">
          Pour une candidature reçue hors du formulaire. La vidéo pourra être ajoutée juste après, depuis la fiche du candidat.
        </p>

        {erreur && (
          <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {erreur}
          </p>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="aj_poste" className="label">Poste <span className="text-red-600">*</span></label>
            <select id="aj_poste" className="champ" value={f.poste} onChange={maj('poste')}>
              <option value="">— Choisir le poste —</option>
              {['Bureau Exécutif', 'Cellules Thématiques'].map((cat) => (
                <optgroup key={cat} label={cat}>
                  {POSTES.filter((p) => p.categorie === cat).map((p) => <option key={p.code} value={p.code}>{p.titre}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="aj_prenom" className="label">Prénom <span className="text-red-600">*</span></label>
            <input id="aj_prenom" className="champ" value={f.prenom} onChange={maj('prenom')} />
          </div>
          <div>
            <label htmlFor="aj_nom" className="label">Nom <span className="text-red-600">*</span></label>
            <input id="aj_nom" className="champ" value={f.nom} onChange={maj('nom')} />
          </div>
          <div>
            <label htmlFor="aj_email" className="label">E-mail <span className="text-red-600">*</span></label>
            <input id="aj_email" type="email" className="champ" value={f.email} onChange={maj('email')} />
            <p className="mt-1 text-xs text-brun-500">Il pourra voter avec cette adresse.</p>
          </div>
          <div>
            <label htmlFor="aj_tel" className="label">Téléphone <span className="text-red-600">*</span></label>
            <input id="aj_tel" type="tel" className="champ" value={f.telephone} onChange={maj('telephone')} />
          </div>

          <div>
            <label htmlFor="aj_dep" className="label">Département</label>
            <select id="aj_dep" className="champ" value={f.departement}
              onChange={(e) => setF((x) => ({ ...x, departement: e.target.value, metier: FILIERES[e.target.value][0] }))}>
              {Object.keys(FILIERES).map((d) => <option key={d} value={d}>{LIBELLES_DEPARTEMENTS[d]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="aj_metier" className="label">Filière</label>
            <select id="aj_metier" className="champ" value={f.metier} onChange={maj('metier')}>
              {FILIERES[f.departement].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="aj_niveau" className="label">Niveau d'études</label>
            <select id="aj_niveau" className="champ" value={f.niveau} onChange={maj('niveau')}>
              <option>Première année</option>
              <option>Deuxième année</option>
            </select>
          </div>
          <div>
            <label htmlFor="aj_statut" className="label">Statut</label>
            <select id="aj_statut" className="champ" value={f.statut} onChange={maj('statut')}>
              <option value="VALIDE">Validée pour l'élection</option>
              <option value="EN_ATTENTE">En attente de validation</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="aj_pdf" className="label">Profession de foi / vision <span className="text-red-600">*</span></label>
            <textarea id="aj_pdf" rows={5} className="champ" value={f.profession_de_foi} onChange={maj('profession_de_foi')} />
          </div>

          <div>
            <span className="label">Photo (facultative)</span>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-brun-200 p-3 hover:border-caramel-400">
              {apercu
                ? <img src={apercu} alt="Aperçu" className="h-14 w-14 rounded-xl object-cover" />
                : <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-brun-50 text-brun-400"><ImagePlus className="h-6 w-6" /></span>}
              <span className="text-sm text-brun-600">{photo ? photo.name : 'Choisir une photo (6 Mo max)'}</span>
              <input type="file" accept="image/*" className="sr-only" onChange={choisirPhoto} />
            </label>
          </div>
          <div>
            <label htmlFor="aj_lien" className="label">Lien vidéo (facultatif)</label>
            <input id="aj_lien" type="url" className="champ" placeholder="https://…" value={f.lien_video} onChange={maj('lien_video')} />
            <p className="mt-1 text-xs text-brun-500">Ou envoyez le fichier vidéo après l'ajout.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onFermer} className="btn-secondaire">Annuler</button>
          <button type="submit" disabled={envoi} className="btn-primaire">
            {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Ajouter le candidat
          </button>
        </div>
      </form>
    </div>
  );
}
