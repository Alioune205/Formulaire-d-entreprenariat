import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle, CheckCircle2, Eye, Loader2, RotateCcw, Save, Sparkles, X,
} from 'lucide-react';
import { api, ErreurApi } from '../../lib/api.js';
import { ApercuEmail } from './EnvoiFelicitations.jsx';

export default function EditeurModeleEmail({ onFermer, onDeconnexion, onEnregistre }) {
  const [form, setForm] = useState(null);
  const [apercu, setApercu] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [chargementApercu, setChargementApercu] = useState(false);
  const [reinitialisation, setReinitialisation] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);
  const [vueMobile, setVueMobile] = useState('editeur'); // 'editeur' | 'apercu'

  // 1. Chargement initial du modèle sauvegardé
  useEffect(() => {
    let actif = true;
    (async () => {
      try {
        const [modele, ap] = await Promise.all([
          api('/admin/inscriptions/modele-email/', { auth: true }),
          api('/admin/inscriptions/modele-acceptation/', { auth: true }),
        ]);
        if (!actif) return;
        setForm(modele);
        setApercu(ap);
      } catch (err) {
        if (!actif) return;
        if (err instanceof ErreurApi && err.status === 401) return onDeconnexion?.();
        setErreur('Impossible de charger le modèle d’e-mail.');
      } finally {
        if (actif) setChargement(false);
      }
    })();
    return () => { actif = false; };
  }, [onDeconnexion]);

  // 2. Mise à jour de l'aperçu en direct à chaque modification
  const actualiserApercu = useCallback(async (donnees) => {
    setChargementApercu(true);
    try {
      const res = await api('/admin/inscriptions/modele-email/apercu/', {
        method: 'POST',
        body: donnees,
        auth: true,
      });
      setApercu(res);
    } catch {
      // Échec silencieux de l'aperçu en direct
    } finally {
      setChargementApercu(false);
    }
  }, []);

  const changer = (champ, valeur) => {
    setSucces(null);
    setErreur(null);
    setForm((courant) => {
      const suivant = { ...courant, [champ]: valeur };
      // Déclenche l'aperçu dynamique
      clearTimeout(window._tApercuEmail);
      window._tApercuEmail = setTimeout(() => actualiserApercu(suivant), 350);
      return suivant;
    });
  };

  // 3. Sauvegarder dans la base de données
  const sauvegarder = async (e) => {
    e?.preventDefault();
    if (!form) return;
    setEnregistrement(true);
    setErreur(null);
    setSucces(null);
    try {
      const maj = await api('/admin/inscriptions/modele-email/', {
        method: 'PATCH',
        body: form,
        auth: true,
      });
      setForm(maj);
      setSucces('Modèle d’e-mail enregistré avec succès ! Tous les futurs e-mails utiliseront ce contenu.');
      onEnregistre?.(maj);
    } catch (err) {
      setErreur(err instanceof ErreurApi ? err.message : 'Échec de l’enregistrement.');
    } finally {
      setEnregistrement(false);
    }
  };

  // 4. Réinitialiser aux valeurs d'origine
  const reinitialiser = async () => {
    if (!window.confirm('Voulez-vous rétablir les textes et réglages par défaut du CIAT ?')) return;
    setReinitialisation(true);
    setErreur(null);
    setSucces(null);
    try {
      const defaut = await api('/admin/inscriptions/modele-email/reinitialiser/', {
        method: 'POST',
        auth: true,
      });
      setForm(defaut);
      setApercu(await api('/admin/inscriptions/modele-acceptation/', { auth: true }));
      setSucces('Textes d’origine rétablis.');
      onEnregistre?.(defaut);
    } catch (err) {
      setErreur(err instanceof ErreurApi ? err.message : 'Échec de la réinitialisation.');
    } finally {
      setReinitialisation(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brun-900/60 p-3 sm:p-4 backdrop-blur-[2px]" onClick={onFermer}>
      <div
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Personnaliser le modèle d'e-mail"
      >
        {/* En-tête */}
        <div className="flex items-start justify-between gap-4 border-b border-brun-100 bg-brun-50/60 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-caramel-100 text-caramel-600">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-extrabold text-brun-800">Personnaliser le modèle d’e-mail</h2>
            </div>
            <p className="mt-1 text-xs text-brun-500 sm:text-sm">
              Modifiez le texte, la date et le lieu de la rencontre. Vos modifications sont sauvegardées et appliquées à tous les e-mails.
            </p>
          </div>
          <button
            type="button"
            onClick={onFermer}
            className="rounded-xl p-2 text-brun-500 hover:bg-brun-100 hover:text-brun-800"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sélecteur mobile Editeur / Aperçu */}
        <div className="flex border-b border-brun-100 bg-white p-2 lg:hidden">
          <button
            type="button"
            onClick={() => setVueMobile('editeur')}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
              vueMobile === 'editeur' ? 'bg-brun-800 text-white' : 'text-brun-600 hover:bg-brun-50'
            }`}
          >
            Modifier le contenu
          </button>
          <button
            type="button"
            onClick={() => setVueMobile('apercu')}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
              vueMobile === 'apercu' ? 'bg-brun-800 text-white' : 'text-brun-600 hover:bg-brun-50'
            }`}
          >
            Aperçu en direct
          </button>
        </div>

        {/* Corps principal : 2 colonnes sur grand écran */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {chargement ? (
            <div className="flex h-96 items-center justify-center text-brun-400">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
              {/* Colonne gauche : Formulaire d'édition */}
              <form
                onSubmit={sauvegarder}
                className={`space-y-5 lg:col-span-6 lg:block ${vueMobile === 'editeur' ? 'block' : 'hidden'}`}
              >
                {succes && (
                  <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> {succes}
                  </p>
                )}
                {erreur && (
                  <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {erreur}
                  </p>
                )}

                {/* 1. Objet de l'e-mail */}
                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="ed-sujet" className="label text-xs uppercase tracking-wider text-brun-600">
                      Objet de l'e-mail
                    </label>
                    <span className="text-[11px] font-semibold text-caramel-600">
                      Variable : <code className="font-mono text-brun-700">&#123;nom_projet&#125;</code>
                    </span>
                  </div>
                  <input
                    id="ed-sujet"
                    className="champ"
                    value={form?.sujet || ''}
                    onChange={(e) => changer('sujet', e.target.value)}
                    placeholder="Objet de l'e-mail..."
                    required
                  />
                </div>

                {/* 2. Message d'introduction */}
                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="ed-intro" className="label text-xs uppercase tracking-wider text-brun-600">
                      Message d'introduction
                    </label>
                    <span className="text-[11px] font-semibold text-caramel-600">
                      Variables : <code className="font-mono text-brun-700">&#123;nom_projet&#125;</code>, <code className="font-mono text-brun-700">&#123;nom_groupe&#125;</code>
                    </span>
                  </div>
                  <textarea
                    id="ed-intro"
                    rows={4}
                    className="champ text-sm leading-relaxed"
                    value={form?.introduction || ''}
                    onChange={(e) => changer('introduction', e.target.value)}
                    placeholder="Paragraphe de félicitations..."
                    required
                  />
                </div>

                {/* 3. Bloc Rencontre & Lieu (encadré de couleur) */}
                <div className="rounded-2xl border-2 border-caramel-200 bg-caramel-100/30 p-4 sm:p-5">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-caramel-600">
                    Encadré Rencontre & Détails pratiques
                  </p>
                  <div className="space-y-3.5">
                    <div>
                      <label htmlFor="ed-titre-rencontre" className="mb-1 block text-xs font-semibold text-brun-700">
                        Titre de l'encadré
                      </label>
                      <input
                        id="ed-titre-rencontre"
                        className="champ bg-white"
                        value={form?.titre_rencontre || ''}
                        onChange={(e) => changer('titre_rencontre', e.target.value)}
                        placeholder="Ex : Rencontre avec les groupes"
                      />
                    </div>

                    <div>
                      <label htmlFor="ed-texte-rencontre" className="mb-1 block text-xs font-semibold text-brun-700">
                        Description de la rencontre
                      </label>
                      <textarea
                        id="ed-texte-rencontre"
                        rows={2}
                        className="champ bg-white text-sm"
                        value={form?.texte_rencontre || ''}
                        onChange={(e) => changer('texte_rencontre', e.target.value)}
                        placeholder="Ex : Cette rencontre réunira l'ensemble des groupes retenus..."
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor="ed-date-rencontre" className="mb-1 block text-xs font-semibold text-brun-700">
                          Date et heure
                        </label>
                        <input
                          id="ed-date-rencontre"
                          className="champ bg-white font-medium"
                          value={form?.date_rencontre || ''}
                          onChange={(e) => changer('date_rencontre', e.target.value)}
                          placeholder="Ex : Mercredi 18 novembre 2026 à 13h00"
                        />
                      </div>
                      <div>
                        <label htmlFor="ed-lieu-rencontre" className="mb-1 block text-xs font-semibold text-brun-700">
                          Lieu
                        </label>
                        <input
                          id="ed-lieu-rencontre"
                          className="champ bg-white font-medium"
                          value={form?.lieu_rencontre || ''}
                          onChange={(e) => changer('lieu_rencontre', e.target.value)}
                          placeholder="Ex : À l'Amphi (ISEP Amadou Trawaré)"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Consignes pour la présentation */}
                <div>
                  <label htmlFor="ed-consigne" className="label text-xs uppercase tracking-wider text-brun-600">
                    Consigne pour le groupe
                  </label>
                  <textarea
                    id="ed-consigne"
                    rows={2}
                    className="champ text-sm"
                    value={form?.consigne || ''}
                    onChange={(e) => changer('consigne', e.target.value)}
                    placeholder="Ex : Nous vous invitons à préparer une courte présentation de deux minutes..."
                  />
                </div>

                {/* Boutons d'action */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brun-100 pt-4">
                  <button
                    type="button"
                    onClick={reinitialiser}
                    disabled={reinitialisation || enregistrement}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-brun-500 transition hover:bg-brun-50 hover:text-brun-700 disabled:opacity-50"
                  >
                    <RotateCcw className={`h-3.5 w-3.5 ${reinitialisation ? 'animate-spin' : ''}`} />
                    Rétablir par défaut
                  </button>
                  <button
                    type="submit"
                    disabled={enregistrement}
                    className="btn-primaire"
                  >
                    {enregistrement ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
                    ) : (
                      <><Save className="h-4 w-4" /> Enregistrer ce modèle</>
                    )}
                  </button>
                </div>
              </form>

              {/* Colonne droite : Aperçu en direct */}
              <div className={`space-y-2 lg:col-span-6 lg:block ${vueMobile === 'apercu' ? 'block' : 'hidden'}`}>
                <div className="flex items-center justify-between px-1">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brun-500">
                    <Eye className="h-4 w-4 text-caramel-600" />
                    Aperçu en direct
                    {chargementApercu && <Loader2 className="h-3 w-3 animate-spin text-caramel-600" />}
                  </p>
                  <span className="text-xs text-brun-400">Exemple avec le groupe « Les Bâtisseurs »</span>
                </div>
                {apercu ? (
                  <ApercuEmail apercu={apercu} />
                ) : (
                  <div className="flex h-96 items-center justify-center rounded-2xl border border-brun-100 bg-brun-50/50 text-brun-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pied de page modal */}
        <div className="flex items-center justify-between border-t border-brun-100 bg-brun-50/70 px-6 py-3.5 text-xs text-brun-500">
          <span>Toute modification enregistrée ici sera appliquée à l'envoi groupé et aux envois individuels.</span>
          <button type="button" onClick={onFermer} className="btn-secondaire py-1.5 text-xs">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
