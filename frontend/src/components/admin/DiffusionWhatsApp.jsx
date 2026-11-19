import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle, CheckCircle2, ExternalLink, Loader2, Mail, MessageSquare, RefreshCw, Send, Users,
} from 'lucide-react';
import { api, ErreurApi } from '../../lib/api.js';
import { ApercuEmail } from './EnvoiFelicitations.jsx';

const LOT = 10;

export default function DiffusionWhatsApp({ onDeconnexion }) {
  const [donnees, setDonnees] = useState(null);
  const [lienWhatsapp, setLienWhatsapp] = useState('');
  const [apercu, setApercu] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const [confirme, setConfirme] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [envoyes, setEnvoyes] = useState([]);
  const [echecs, setEchecs] = useState([]);
  const [termine, setTermine] = useState(false);

  const chargerApercu = useCallback(async (lien) => {
    try {
      const a = await api('/admin/diffusion-whatsapp/apercu/', {
        method: 'POST',
        body: { lien_whatsapp: lien },
        auth: true,
      });
      setApercu(a);
    } catch (err) {
      if (err instanceof ErreurApi && err.status === 401) onDeconnexion();
    }
  }, [onDeconnexion]);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const res = await api('/admin/diffusion-whatsapp/', { auth: true });
      setDonnees(res);
      const lienInitial = lienWhatsapp || res.lien_defaut || '';
      if (!lienWhatsapp && res.lien_defaut) {
        setLienWhatsapp(res.lien_defaut);
      }
      await chargerApercu(lienInitial);
    } catch (err) {
      if (err instanceof ErreurApi && err.status === 401) return onDeconnexion();
      setErreur('Impossible de charger les données de diffusion WhatsApp.');
    } finally {
      setChargement(false);
    }
  }, [lienWhatsapp, chargerApercu, onDeconnexion]);

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lancerEnvoi = async () => {
    if (!lienWhatsapp.trim().startsWith('https://')) {
      setErreur('Veuillez saisir un lien d’invitation WhatsApp valide commençant par https://');
      return;
    }
    setEnvoi(true);
    setErreur(null);
    setTermine(false);
    const totalAttendu = donnees?.restants || 0;

    try {
      let restant = totalAttendu;
      for (;;) {
        const r = await api('/admin/diffusion-whatsapp/', {
          method: 'POST',
          body: { lien_whatsapp: lienWhatsapp.trim(), limite: LOT },
          auth: true,
        });
        setEnvoyes((prev) => [...prev, ...r.envoyes]);
        setEchecs((prev) => [...prev, ...r.echecs]);
        restant = r.restants;
        if (restant === 0 || (r.envoyes.length === 0 && r.echecs.length === 0)) {
          break;
        }
        // Si tout le lot a échoué sans avancer, on évite une boucle infinie.
        if (r.envoyes.length === 0 && r.echecs.length > 0) {
          break;
        }
      }
      setTermine(true);
      setConfirme(false);
      await charger();
    } catch (err) {
      if (err instanceof ErreurApi && err.status === 401) return onDeconnexion();
      setErreur(err instanceof ErreurApi ? err.message : 'Serveur injoignable. Relancez : aucun doublon ne sera envoyé.');
    } finally {
      setEnvoi(false);
    }
  };

  const totalRestants = donnees?.restants ?? 0;
  const totalUniques = donnees?.total_uniques ?? 0;
  const dejaEnvoyes = donnees?.deja_envoyes ?? 0;
  const progression = Math.min(100, Math.round((100 * envoyes.length) / Math.max(1, totalRestants || envoyes.length)));

  return (
    <div className="space-y-6">
      {/* KPIs de dédoublonnage */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-brun-100 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brun-500">
            Destinataires uniques (sans doublon)
          </p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-brun-800">{totalUniques}</p>
          <p className="mt-1 text-xs text-brun-500">Responsables de groupes & candidats dédoublonnés</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">E-mails déjà envoyés</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-emerald-700">{dejaEnvoyes}</p>
          <p className="mt-1 text-xs text-brun-500">Protégés contre tout second envoi</p>
        </div>

        <div className="rounded-2xl border border-caramel-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-caramel-700">Restants à envoyer</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-caramel-600">{totalRestants}</p>
          <p className="mt-1 text-xs text-brun-500">Prêts pour la prochaine vague</p>
        </div>
      </div>

      {erreur && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{erreur}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr] lg:items-start">
        {/* Colonne gauche : paramétrage, destinataires et lancement */}
        <div className="space-y-5 rounded-3xl border border-brun-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-brun-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brun-800 text-caramel-300">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-brun-900">Diffusion du lien WhatsApp</h2>
                <p className="text-xs text-brun-500">Template HTML officiel CIAT · Zéro doublon garanti</p>
              </div>
            </div>
            <button
              type="button"
              onClick={charger}
              disabled={chargement || envoi}
              className="btn-secondaire"
              title="Actualiser"
            >
              <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div>
            <label htmlFor="lien-wa" className="label">Lien d'invitation du groupe WhatsApp</label>
            <div className="flex gap-2">
              <input
                id="lien-wa"
                type="url"
                value={lienWhatsapp}
                onChange={(e) => setLienWhatsapp(e.target.value)}
                disabled={envoi}
                className="champ font-mono text-xs"
                placeholder="https://chat.whatsapp.com/..."
              />
              <button
                type="button"
                onClick={() => chargerApercu(lienWhatsapp)}
                disabled={envoi}
                className="btn-secondaire shrink-0 text-xs"
              >
                Prévisualiser
              </button>
            </div>
            {lienWhatsapp && (
              <a
                href={lienWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-caramel-700 hover:underline"
              >
                Tester le lien <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* Destinataires en attente d'envoi */}
          {donnees?.destinataires_restants?.length > 0 && (
            <div className="rounded-2xl border border-brun-100 bg-[#faf6f3] p-4">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brun-700">
                <Users className="h-3.5 w-3.5 text-caramel-600" />
                Prochains destinataires ({donnees.destinataires_restants.length})
              </p>
              <ul className="mt-2.5 max-h-44 space-y-1.5 overflow-y-auto text-xs">
                {donnees.destinataires_restants.map((d) => (
                  <li key={d.email} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5 border border-brun-100">
                    <span className="font-semibold text-brun-800 truncate">{d.nom}</span>
                    <span className="font-mono text-[11px] text-brun-500 truncate">{d.email}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Progression / Résultats */}
          {(envoi || envoyes.length > 0 || termine) && (
            <div className="rounded-2xl border border-brun-100 bg-brun-50/70 p-4">
              <div className="mb-2 flex justify-between text-xs font-bold text-brun-800">
                <span>{termine ? 'Envoi terminé' : 'Envoi en cours par lots… ne fermez pas la page'}</span>
                <span className="tabular-nums">{envoyes.length} envoyé(s)</span>
              </div>
              <div className="h-2 w-full rounded bg-white">
                <div className="h-full rounded bg-caramel-500 transition-all" style={{ width: `${progression}%` }} />
              </div>
              {envoyes.length > 0 && (
                <ul className="mt-3 max-h-36 space-y-1 overflow-y-auto text-xs">
                  {envoyes.map((e) => (
                    <li key={e.email} className="flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-semibold">{e.nom}</span>
                      <span className="text-brun-500">({e.email})</span>
                    </li>
                  ))}
                  {echecs.map((e) => (
                    <li key={`err-${e.email}`} className="flex items-center gap-1.5 text-red-700">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{e.nom} ({e.email}) — échec ({e.erreur})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Confirmation & Bouton d'envoi */}
          {totalRestants > 0 ? (
            <div className="space-y-4 border-t border-brun-100 pt-4">
              <label className="flex items-start gap-3 rounded-xl border border-caramel-200 bg-caramel-50/50 p-3.5 text-xs leading-relaxed text-brun-800">
                <input
                  type="checkbox"
                  checked={confirme}
                  onChange={(e) => setConfirme(e.target.checked)}
                  disabled={envoi}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span>
                  J’ai vérifié l’aperçu ci-contre et je confirme l’envoi de ce lien WhatsApp aux{' '}
                  <strong>{totalRestants} destinataire(s) unique(s)</strong> (les personnes déjà notifiées et les doublons sont automatiquement ignorés).
                </span>
              </label>

              <button
                type="button"
                disabled={!confirme || envoi}
                onClick={lancerEnvoi}
                className="btn-primaire w-full justify-center py-3.5"
              >
                {envoi ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Envoyer à {totalRestants} destinataire{totalRestants > 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          ) : (
            !chargement && (
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                <span>
                  Tous les responsables et candidats uniques actuels ont déjà reçu l’e-mail. Si de nouveaux étudiants s’inscrivent plus tard, actualisez pour n’envoyer qu’aux nouveaux.
                </span>
              </div>
            )
          )}
        </div>

        {/* Colonne droite : Aperçu réel du template HTML */}
        <div className="rounded-3xl border border-brun-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brun-600">
            <Mail className="h-4 w-4 text-caramel-600" /> Aperçu du template e-mail (HTML CIAT)
          </div>
          {apercu ? (
            <ApercuEmail apercu={apercu} />
          ) : (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brun-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
