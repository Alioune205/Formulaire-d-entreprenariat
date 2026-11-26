import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Award, Download, Loader2, Lock, Printer, RefreshCw, Search } from 'lucide-react';
import { api, ErreurApi } from '../../lib/api.js';
import HorairesVote from './HorairesVote.jsx';
import ElecteursAjoutes from './ElecteursAjoutes.jsx';

const BARRE = '#5f3b28';
const ETATS = {
  avant: ['Pas encore ouvert', 'bg-brun-100 text-brun-700'],
  ouvert: ['Vote en cours', 'bg-emerald-100 text-emerald-700'],
  clos: ['Vote clos', 'bg-red-100 text-red-700'],
};

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar',
  });
}

const texteChoix = (e) => (e.choix ? e.choix.map((c) => `${c.titre} : ${c.choix}`).join(' · ') : '');

// Export Excel (CSV ; séparateur « ; », BOM pour les accents).
function exporterEmargement(liste) {
  const cellule = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const postes = [...new Set(liste.flatMap((e) => (e.choix ?? []).map((c) => c.titre)))];
  const lignes = [
    ['Électeur', 'Type', 'E-mail', 'Reçu', 'A voté le', ...postes].map(cellule).join(';'),
    ...liste.map((e) => {
      const parPoste = Object.fromEntries((e.choix ?? []).map((c) => [c.titre, c.choix]));
      return [e.nom_complet, e.type, e.email, e.recu,
        new Date(e.vote_le).toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' }),
        ...postes.map((p) => (e.choix ? parPoste[p] ?? '' : 'Non enregistré'))].map(cellule).join(';');
    }),
  ];
  const blob = new Blob([`\ufeff${lignes.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'votants-et-choix.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

const pct = (n, total) => (total ? `${Math.round((1000 * n) / total) / 10} %` : '0 %');

function Barre({ valeur, total, couleur = BARRE }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded bg-brun-50">
      <div className="h-full rounded" style={{ width: total ? `${(100 * valeur) / total}%` : 0, backgroundColor: couleur }} />
    </div>
  );
}

function ResultatPoste({ r, provisoire }) {
  return (
    <section className="break-inside-avoid rounded-2xl border border-brun-100 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-lg font-extrabold text-brun-900">{r.titre}</h4>
        <span className="text-sm text-brun-500">{r.total} bulletin{r.total > 1 ? 's' : ''} · {r.blancs} blanc{r.blancs > 1 ? 's' : ''}</span>
      </div>
      {r.egalite && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          <AlertTriangle className="h-4 w-4" /> Égalité en tête{provisoire ? ' pour l’instant.' : ' : la commission électorale doit trancher.'}
        </p>
      )}
      {r.candidat_unique ? (
        <div className="mt-4 space-y-3">
          <p className="font-bold text-brun-800">
            {r.candidats[0].prenom} {r.candidats[0].nom} (candidat unique)
            {r.candidats[0].elu
              ? <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-extrabold text-emerald-700">{provisoire ? 'MAJORITÉ POUR' : 'ÉLU(E)'}</span>
              : <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-extrabold text-red-700">{provisoire ? 'PAS DE MAJORITÉ' : 'NON ÉLU(E)'}</span>}
          </p>
          {[['Pour', r.pour, '#15803d'], ['Contre', r.contre, '#b91c1c'], ['Blanc', r.blancs, '#a8a29e']].map(([lib, v, c]) => (
            <div key={lib} className="grid grid-cols-[70px_1fr_90px] items-center gap-3 text-sm">
              <span className="font-semibold text-brun-700">{lib}</span>
              <Barre valeur={v} total={r.total} couleur={c} />
              <span className="text-right tabular-nums text-brun-800">{v} · {pct(v, r.total)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {r.candidats.map((c) => (
            <div key={c.id} className="grid grid-cols-[minmax(0,160px)_1fr_90px] items-center gap-3 text-sm">
              <span className="truncate font-semibold text-brun-800">
                {c.prenom} {c.nom}
                {c.elu && <Award className="ml-1 inline h-4 w-4 text-emerald-600" aria-label="élu" />}
              </span>
              <Barre valeur={c.voix} total={r.total} couleur={c.elu ? '#15803d' : BARRE} />
              <span className="text-right tabular-nums text-brun-800">{c.voix} · {pct(c.voix, r.total)}</span>
            </div>
          ))}
          <div className="grid grid-cols-[minmax(0,160px)_1fr_90px] items-center gap-3 text-sm">
            <span className="font-semibold text-brun-500">Vote blanc</span>
            <Barre valeur={r.blancs} total={r.total} couleur="#a8a29e" />
            <span className="text-right tabular-nums text-brun-600">{r.blancs} · {pct(r.blancs, r.total)}</span>
          </div>
        </div>
      )}
    </section>
  );
}

export default function ResultatsVote({ onDeconnexion }) {
  const [donnees, setDonnees] = useState(null);
  const [emargement, setEmargement] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const [d, e] = await Promise.all([
        api('/admin/vote/', { auth: true }),
        api('/admin/vote/emargement/', { auth: true }),
      ]);
      setDonnees(d);
      setEmargement(e);
    } catch (err) {
      if (err instanceof ErreurApi && err.status === 401) return onDeconnexion();
      setErreur(err instanceof ErreurApi ? err.message : 'Impossible de joindre le serveur.');
    } finally {
      setChargement(false);
    }
    return undefined;
  }, [onDeconnexion]);

  useEffect(() => {
    charger();
    const t = setInterval(charger, 60000); // participation rafraîchie chaque minute
    return () => clearInterval(t);
  }, [charger]);

  if (!donnees) {
    return erreur
      ? <p className="flex items-center gap-2 text-red-700"><AlertCircle className="h-4 w-4" /> {erreur}</p>
      : <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-caramel-500" /></div>;
  }

  const [libEtat, classeEtat] = ETATS[donnees.vote_etat];
  const filtres = emargement.filter((e) => `${e.nom_complet} ${e.email} ${e.recu} ${texteChoix(e)}`.toLowerCase().includes(recherche.toLowerCase()));

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-brun-100 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase ${classeEtat}`}>{libEtat}</span>
            <p className="mt-3 text-sm text-brun-600">
              Du <strong>{formatDate(donnees.vote_debut)}</strong> au <strong>{formatDate(donnees.vote_fin)}</strong>
              {' '}· {donnees.postes_au_vote} postes soumis au vote
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button type="button" onClick={charger} disabled={chargement} className="btn-secondaire">
              <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            {donnees.resultats && !donnees.resultats_provisoires && (
              <button type="button" onClick={() => window.print()} className="btn-primaire">
                <Printer className="h-4 w-4" /> Imprimer le PV
              </button>
            )}
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div><p className="text-sm font-bold text-brun-700">Votants</p><p className="text-4xl font-extrabold tabular-nums text-brun-900">{donnees.votants}</p></div>
          <div><p className="text-sm font-bold text-brun-700">Électeurs inscrits</p><p className="text-4xl font-extrabold tabular-nums text-brun-900">{donnees.electeurs}</p></div>
          <div><p className="text-sm font-bold text-brun-700">Participation</p><p className="text-4xl font-extrabold tabular-nums text-brun-900">{pct(donnees.votants, donnees.electeurs)}</p></div>
        </div>
        <div className="mt-4"><Barre valeur={donnees.votants} total={donnees.electeurs} /></div>
      </section>

      <HorairesVote onMaj={charger} onDeconnexion={onDeconnexion} />
      <ElecteursAjoutes onMaj={charger} onDeconnexion={onDeconnexion} />

      {donnees.resultats ? (
        <div className="space-y-4">
          {donnees.resultats_provisoires ? (
            <div>
              <h3 className="text-xl font-extrabold text-brun-800">Résultats provisoires · vote en cours</h3>
              <p className="mt-1 text-sm text-brun-500">Mis à jour chaque minute. Ils peuvent encore changer : les résultats définitifs seront connus à la clôture.</p>
            </div>
          ) : (
            <h3 className="text-xl font-extrabold text-brun-800">Procès-verbal des résultats</h3>
          )}
          {donnees.resultats.map((r) => <ResultatPoste key={r.code} r={r} provisoire={donnees.resultats_provisoires} />)}
        </div>
      ) : (
        <section className="flex items-start gap-3 rounded-2xl border border-brun-100 bg-brun-50/60 p-6 text-brun-700">
          <Lock className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">
            <strong>Le vote n’a pas encore commencé.</strong> Les résultats s’afficheront ici en direct dès l’ouverture
            ({formatDate(donnees.vote_debut)}).
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-brun-100 bg-white p-6 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-brun-800">Liste d’émargement</h3>
            <p className="mt-1 text-sm text-brun-600">
              Qui a voté, quand, et pour qui. Les votes faits avant l’activation des bulletins nominatifs n’ont pas de choix
              enregistrés (« Non enregistré »). Recherche possible par nom de candidat.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondaire" onClick={() => exporterEmargement(emargement)} disabled={!emargement.length}>
            <Download className="h-4 w-4" /> Export Excel
          </button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brun-400" />
            <input className="champ pl-9" placeholder="Nom, e-mail, reçu, candidat…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          </div>
          </div>
        </div>
        <div className="mt-4 max-h-[480px] overflow-auto rounded-xl border border-brun-100">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-brun-50 text-xs uppercase text-brun-500">
              <tr><th className="px-3 py-2">Électeur</th><th className="px-3 py-2">E-mail</th><th className="px-3 py-2">Reçu</th><th className="px-3 py-2">A voté le</th><th className="px-3 py-2">Choix</th></tr>
            </thead>
            <tbody className="divide-y divide-brun-50">
              {filtres.map((e) => (
                <tr key={e.recu}>
                  <td className="px-3 py-2 font-semibold text-brun-800">{e.nom_complet} {e.type === 'Candidat' && <span className="text-xs text-caramel-600">(candidat)</span>}</td>
                  <td className="px-3 py-2 text-brun-600">{e.email}</td>
                  <td className="px-3 py-2 font-mono text-brun-700">{e.recu}</td>
                  <td className="px-3 py-2 text-brun-600">{new Date(e.vote_le).toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' })}</td>
                  <td className="px-3 py-2 text-xs text-brun-700">
                    {e.choix
                      ? e.choix.map((c) => <div key={c.poste}><span className="text-brun-400">{c.titre} :</span> <strong>{c.choix}</strong></div>)
                      : <span className="italic text-brun-400">Non enregistré</span>}
                  </td>
                </tr>
              ))}
              {!filtres.length && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-brun-400">Aucun votant pour l’instant.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
