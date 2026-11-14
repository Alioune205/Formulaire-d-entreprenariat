import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, FileEdit, Loader2, Mail, X } from 'lucide-react';
import { api, ErreurApi } from '../../lib/api.js';
import EditeurModeleEmail from './EditeurModeleEmail.jsx';

/** Aperçu fidèle d'un e-mail (HTML rendu dans un cadre isolé). N'envoie rien. */
export function ApercuEmail({ apercu }) {
  if (!apercu) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-brun-100">
      <div className="space-y-0.5 border-b border-brun-100 bg-brun-50 px-4 py-3 text-xs text-brun-600">
        <p><span className="font-semibold text-brun-800">À :</span> {apercu.destinataire}</p>
        <p><span className="font-semibold text-brun-800">Objet :</span> {apercu.sujet}</p>
      </div>
      <iframe title="Aperçu de l'e-mail" srcDoc={apercu.html} sandbox="allow-same-origin" className="h-[520px] w-full bg-[#f2e9e2]" />
    </div>
  );
}

const LOT = 10;

export default function EnvoiFelicitations({ aEnvoyer, nonAcceptes = 0, onFermer, onDeconnexion }) {
  const [apercu, setApercu] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [confirme, setConfirme] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [envoyes, setEnvoyes] = useState([]);
  const [echecs, setEchecs] = useState([]);
  const [termine, setTermine] = useState(false);
  const [editeurOuvert, setEditeurOuvert] = useState(false);

  // Aperçu sur le premier groupe concerné
  const chargerApercu = useCallback(async () => {
    try {
      const dossiers = await api('/admin/inscriptions/', { auth: true });
      const premier = dossiers.find((i) => i.statut !== 'REJETE' && !i.acceptation_envoyee_le && i.email);
      if (premier) {
        setApercu(await api(`/admin/inscriptions/${premier.id}/apercu-acceptation/`, { auth: true }));
      } else {
        setApercu(await api('/admin/inscriptions/modele-acceptation/', { auth: true }));
      }
    } catch (err) {
      if (err instanceof ErreurApi && err.status === 401) onDeconnexion();
      else setErreur('Impossible de charger l’aperçu.');
    }
  }, [onDeconnexion]);

  useEffect(() => {
    chargerApercu();
  }, [chargerApercu]);

  const envoyer = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      // Envoi par lots : chaque appel traite au plus LOT groupes non encore notifiés.
      for (;;) {
        // accepter : les dossiers « En attente » / « Entretien » passent d'abord à « Accepté »
        const r = await api('/admin/inscriptions/envoyer-acceptations/', { method: 'POST', body: { limite: LOT, accepter: true }, auth: true });
        setEnvoyes((l) => [...l, ...r.envoyes]);
        setEchecs((l) => [...l, ...r.echecs]);
        if (r.restants === 0 || r.envoyes.length === 0) break; // fini, ou plus rien ne passe
      }
      setTermine(true);
    } catch (err) {
      setErreur(err instanceof ErreurApi ? err.message : 'Serveur injoignable. Relancez : rien ne sera envoyé en double.');
    } finally {
      setEnvoi(false);
    }
  };

  const progression = Math.min(100, Math.round((100 * envoyes.length) / Math.max(1, aEnvoyer)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brun-900/50 p-4" onClick={envoi ? undefined : onFermer}>
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Envoyer les e-mails de félicitations"
      >
        <div className="flex items-start justify-between gap-4 border-b border-brun-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-extrabold text-brun-800">Envoyer les e-mails de félicitations</h2>
            <p className="text-sm text-brun-500">
              {aEnvoyer} groupe{aEnvoyer > 1 ? 's' : ''} pas encore notifié{aEnvoyer > 1 ? 's' : ''} (dossiers rejetés exclus).
            </p>
          </div>
          {!envoi && (
            <button type="button" onClick={onFermer} className="rounded-lg p-2 text-brun-500 hover:bg-brun-50" aria-label="Fermer">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          {erreur && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {erreur}
            </p>
          )}

          {!termine && !envoi && envoyes.length === 0 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-brun-600">
                  Aperçu de l’e-mail que recevra le premier groupe.
                </p>
                <button
                  type="button"
                  onClick={() => setEditeurOuvert(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-caramel-200 bg-caramel-50 px-2.5 py-1 text-xs font-semibold text-caramel-800 transition-colors hover:bg-caramel-100"
                >
                  <FileEdit className="h-3.5 w-3.5" /> Modifier le modèle / la rencontre
                </button>
              </div>
              {apercu ? <ApercuEmail apercu={apercu} /> : !erreur && <Loader2 className="mx-auto h-6 w-6 animate-spin text-brun-400" />}
              <label className="flex items-start gap-3 rounded-xl border border-brun-100 bg-brun-50 p-4 text-sm text-brun-700">
                <input type="checkbox" className="mt-0.5 h-4 w-4" checked={confirme} onChange={(e) => setConfirme(e.target.checked)} />
                <span>
                  J’ai vérifié l’aperçu et je confirme l’envoi à <strong>{aEnvoyer} chef{aEnvoyer > 1 ? 's' : ''} de projet</strong>.
                  {nonAcceptes > 0 && <> Les {nonAcceptes} dossier(s) « En attente » ou « Entretien » passeront au statut « Accepté ».</>}
                  {' '}Les groupes déjà notifiés ne recevront pas de second e-mail.
                </span>
              </label>
            </>
          )}

          {(envoi || envoyes.length > 0 || termine) && (
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-semibold text-brun-800">
                  {termine ? 'Envoi terminé' : 'Envoi en cours… ne fermez pas cette fenêtre'}
                </span>
                <span className="tabular-nums text-brun-600">{envoyes.length} / {aEnvoyer}</span>
              </div>
              <div className="h-2.5 w-full rounded bg-brun-50" role="progressbar" aria-valuenow={progression} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded bg-emerald-600 transition-all" style={{ width: `${progression}%` }} />
              </div>
              <ul className="mt-4 max-h-56 space-y-1 overflow-y-auto text-sm">
                {envoyes.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-brun-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> {e.nom_groupe}
                    <span className="truncate text-xs text-brun-400">{e.email}</span>
                  </li>
                ))}
                {echecs.map((e) => (
                  <li key={`x${e.id}`} className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {e.nom_groupe} — échec, à relancer
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-brun-100 px-6 py-4">
          {termine || (envoyes.length > 0 && !envoi) ? (
            <button type="button" onClick={onFermer} className="btn-primaire">Fermer</button>
          ) : (
            <>
              <button type="button" onClick={onFermer} disabled={envoi} className="btn-secondaire">Annuler</button>
              <button type="button" onClick={envoyer} disabled={!confirme || envoi} className="btn-primaire">
                {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Envoyer {aEnvoyer} e-mail{aEnvoyer > 1 ? 's' : ''}
              </button>
            </>
          )}
        </div>
      </div>

      {editeurOuvert && (
        <EditeurModeleEmail
          onFermer={() => {
            setEditeurOuvert(false);
            chargerApercu();
          }}
          onDeconnexion={onDeconnexion}
        />
      )}
    </div>
  );
}
