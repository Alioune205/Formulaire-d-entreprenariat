import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Trash2, UserPlus } from 'lucide-react';
import { api, ErreurApi } from '../../lib/api.js';

/** Ajout à la liste électorale des nouveaux membres du club qui ne figurent dans aucun groupe inscrit. */
export default function ElecteursAjoutes({ onMaj, onDeconnexion }) {
  const [donnees, setDonnees] = useState(null);
  const [lignes, setLignes] = useState('');
  const [bilan, setBilan] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  const appel = useCallback(async (chemin, options = {}) => {
    setErreur(null);
    try {
      const d = await api(chemin, { ...options, auth: true });
      setDonnees(d);
      return d;
    } catch (err) {
      if (err instanceof ErreurApi && err.status === 401) onDeconnexion();
      else setErreur(err instanceof ErreurApi ? err.message : 'Impossible de joindre le serveur.');
      return null;
    }
  }, [onDeconnexion]);

  useEffect(() => { appel('/admin/vote/electeurs/'); }, [appel]);

  const ajouter = async (e) => {
    e.preventDefault();
    if (!lignes.trim()) return;
    setEnvoi(true);
    setBilan(null);
    const d = await appel('/admin/vote/electeurs/', { method: 'POST', body: { lignes } });
    setEnvoi(false);
    if (d) {
      setBilan({ ajoutes: d.ajoutes, ignores: d.ignores });
      setLignes(d.ignores.map((i) => i.ligne).join('\n')); // on garde seulement les lignes à corriger
      onMaj?.();
    }
  };

  const retirer = async (el) => {
    if (!window.confirm(`Retirer ${el.prenom} ${el.nom} de la liste électorale ?`)) return;
    setBilan(null);
    if (await appel(`/admin/vote/electeurs/${el.id}/`, { method: 'DELETE' })) onMaj?.();
  };

  return (
    <section className="rounded-2xl border border-brun-100 bg-white p-6 print:hidden">
      <h3 className="flex items-center gap-2 text-lg font-extrabold text-brun-800">
        <UserPlus className="h-5 w-5 text-caramel-500" /> Ajouter des électeurs
      </h3>
      <p className="mt-1 text-sm text-brun-600">
        Pour les nouveaux membres du club qui ne figurent dans aucun groupe inscrit. Écrivez <strong>un prénom et un nom par
        ligne</strong> (ex. « Mamadou Lamine Fall »). Ils pourront voter aussitôt avec ce prénom, ce nom et l’e-mail de leur choix.
      </p>

      {erreur && <p role="alert" className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /> {erreur}</p>}

      <form onSubmit={ajouter} className="mt-4">
        <textarea
          rows={4} className="champ font-mono text-sm" value={lignes} onChange={(e) => setLignes(e.target.value)}
          placeholder={'Awa Ndiaye\nMamadou Lamine Fall\nKhady Sarr'}
        />
        <button type="submit" disabled={envoi || !lignes.trim()} className="btn-primaire mt-3">
          {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Ajouter à la liste électorale
        </button>
      </form>

      {bilan && (
        <div className="mt-4 space-y-2 text-sm">
          {bilan.ajoutes.length > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              {bilan.ajoutes.length} ajouté{bilan.ajoutes.length > 1 ? 's' : ''} : {bilan.ajoutes.join(', ')}
            </p>
          )}
          {bilan.ignores.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-3 text-amber-900">
              <p className="font-bold">Non ajoutés (restés dans la zone de texte) :</p>
              <ul className="mt-1 list-inside list-disc">
                {bilan.ignores.map((i) => <li key={i.ligne}>{i.ligne} : {i.raison}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {donnees && (
        <div className="mt-6">
          <p className="text-sm font-bold text-brun-700">
            Électeurs ajoutés par la commission ({donnees.electeurs.length}) · {donnees.total_electeurs} électeurs au total
          </p>
          {donnees.electeurs.length ? (
            <ul className="mt-2 max-h-72 divide-y divide-brun-50 overflow-auto rounded-xl border border-brun-100 text-sm">
              {donnees.electeurs.map((el) => (
                <li key={el.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="font-semibold text-brun-800">{el.prenom} {el.nom}</span>
                  {el.a_vote ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">A voté</span>
                  ) : (
                    <button type="button" onClick={() => retirer(el)} className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700">
                      <Trash2 className="h-3.5 w-3.5" /> Retirer
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-brun-400">Personne n’a encore été ajouté.</p>
          )}
        </div>
      )}
    </section>
  );
}
