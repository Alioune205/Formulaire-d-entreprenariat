import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Mail, RefreshCw } from 'lucide-react';
import { api, ErreurApi } from '../../lib/api.js';
import EnvoiFelicitations from './EnvoiFelicitations.jsx';

// Palette validée (contrastes + daltonisme) : scripts/validate_palette.js, mode clair.
const COULEURS = { filles: '#b5651d', garcons: '#2f6fa3', non_renseigne: '#a8a29e' };
const LIBELLES = { filles: 'Filles', garcons: 'Garçons', non_renseigne: 'À vérifier' };
const BARRE = '#5f3b28'; // une seule teinte pour les grandeurs (filières, tailles, jours)

const STATUTS = [
  ['', 'Tous les dossiers'], ['EN_ATTENTE', 'En attente'], ['ENTRETIEN', 'Entretien'],
  ['ACCEPTE', 'Acceptés'], ['REJETE', 'Rejetés'],
];

const pct = (n, total) => (total ? Math.round((1000 * n) / total) / 10 : 0);

function Carte({ titre, sousTitre, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-brun-100 bg-white p-5 ${className}`}>
      <h3 className="text-sm font-bold text-brun-800">{titre}</h3>
      {sousTitre && <p className="mt-0.5 text-xs text-brun-500">{sousTitre}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Tuile({ libelle, valeur, detail }) {
  return (
    <div className="rounded-2xl border border-brun-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-brun-500">{libelle}</p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums text-brun-800">{valeur}</p>
      {detail && <p className="mt-0.5 text-xs text-brun-500">{detail}</p>}
    </div>
  );
}

/** Barre empilée Filles / Garçons / À vérifier, avec 2 px d'écart entre segments. */
function BarreGenre({ c, hauteur = 'h-4' }) {
  const total = c.total || 0;
  if (!total) return <div className={`${hauteur} rounded bg-brun-50`} />;
  return (
    <div className={`flex ${hauteur} w-full gap-[2px] overflow-hidden rounded`}>
      {['filles', 'garcons', 'non_renseigne'].map((k) => c[k] > 0 && (
        <div
          key={k}
          style={{ width: `${(100 * c[k]) / total}%`, backgroundColor: COULEURS[k] }}
          title={`${LIBELLES[k]} : ${c[k]} (${pct(c[k], total)} %)`}
          aria-label={`${LIBELLES[k]} : ${c[k]}`}
        />
      ))}
    </div>
  );
}

function Legende() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-brun-600">
      {Object.keys(LIBELLES).map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COULEURS[k] }} /> {LIBELLES[k]}
        </li>
      ))}
    </ul>
  );
}

/** Barre horizontale simple (une seule série) — longueur relative au maximum. */
function BarreSimple({ valeur, max, titre }) {
  return (
    <div className="h-2.5 w-full rounded bg-brun-50" title={titre}>
      {valeur > 0 && (
        <div className="h-full rounded" style={{ width: `${Math.max(2, (100 * valeur) / max)}%`, backgroundColor: BARRE }} />
      )}
    </div>
  );
}

export default function Recap({ onDeconnexion }) {
  const [statut, setStatut] = useState('');
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [envoiOuvert, setEnvoiOuvert] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      setDonnees(await api(`/admin/inscriptions/recap/${statut ? `?statut=${statut}` : ''}`, { auth: true }));
    } catch (err) {
      if (err instanceof ErreurApi && err.status === 401) return onDeconnexion();
      setErreur('Impossible de charger le récapitulatif.');
    } finally {
      setChargement(false);
    }
  }, [statut, onDeconnexion]);

  useEffect(() => { charger(); }, [charger]);

  if (!donnees) {
    return (
      <div className="flex justify-center py-20 text-brun-500">
        {erreur ? <p className="text-red-600">{erreur}</p> : <Loader2 className="h-6 w-6 animate-spin" />}
      </div>
    );
  }

  const d = donnees;
  const g = d.genre;
  const parDepartement = d.filieres.reduce((acc, f) => ({ ...acc, [f.departement]: [...(acc[f.departement] ?? []), f] }), {});
  const maxFiliere = Math.max(1, ...d.filieres.map((f) => f.total));
  const maxTaille = Math.max(1, ...d.tailles_groupes.map((t) => t.groupes));
  const maxJour = Math.max(1, ...d.par_jour.map((j) => j.groupes));
  const acc = d.acceptation;

  return (
    <div className="space-y-6">
      {/* Filtres — une seule rangée au-dessus des graphiques */}
      <div className="flex flex-wrap items-center gap-2">
        <select className="champ w-auto" value={statut} onChange={(e) => setStatut(e.target.value)} aria-label="Filtrer par statut">
          {STATUTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button type="button" onClick={charger} className="btn-secondaire" aria-label="Actualiser">
          <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} />
        </button>
        {erreur && <span className="flex items-center gap-1 text-sm text-red-600"><AlertCircle className="h-4 w-4" /> {erreur}</span>}
      </div>

      {/* Chiffres clés */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Tuile libelle="Groupes" valeur={d.groupes} />
        <Tuile libelle="Membres" valeur={d.membres} detail={`${d.moyenne_membres} par groupe en moyenne`} />
        <Tuile libelle="Filles" valeur={`${g.pct_filles} %`} detail={`${g.filles} membre${g.filles > 1 ? 's' : ''}`} />
        <Tuile libelle="Garçons" valeur={`${g.pct_garcons} %`} detail={`${g.garcons} membre${g.garcons > 1 ? 's' : ''}`} />
        <Tuile libelle="Groupes mixtes" valeur={d.groupes_mixtes} detail="TIC + Automobile" />
        <Tuile libelle="Cheffes de projet" valeur={d.chefs_de_projet_filles} detail={`${d.groupes_avec_fille} groupe(s) avec au moins une fille`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Filles / garçons */}
        <Carte
          titre="Filles et garçons"
          sousTitre={`Estimé à partir des prénoms · ${d.genre_corriges} correction(s) manuelle(s) · ${g.non_renseigne} prénom(s) à vérifier dans les fiches`}
        >
          <BarreGenre c={g} hauteur="h-6" />
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            {['filles', 'garcons', 'non_renseigne'].map((k) => (
              <div key={k}>
                <p className="flex items-center gap-1.5 text-xs text-brun-500">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COULEURS[k] }} /> {LIBELLES[k]}
                </p>
                <p className="font-bold tabular-nums text-brun-800">{g[k]} <span className="font-normal text-brun-500">({g[`pct_${k}`]} %)</span></p>
              </div>
            ))}
          </div>
        </Carte>

        {/* Départements */}
        <Carte titre="Départements" sousTitre="Nombre de membres et répartition filles / garçons">
          <div className="space-y-4">
            {d.departements.map((dep) => (
              <div key={dep.departement}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-semibold text-brun-800">{dep.departement}</span>
                  <span className="tabular-nums text-brun-600"><strong className="text-brun-800">{dep.total}</strong> membres · {dep.pct} %</span>
                </div>
                <BarreGenre c={dep} />
              </div>
            ))}
            <Legende />
          </div>
        </Carte>
      </div>

      {/* Filières */}
      <Carte titre="Filières" sousTitre="Part de chaque filière parmi tous les membres (survolez une barre pour le détail)">
        <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
          {Object.entries(parDepartement).map(([dep, liste]) => (
            <div key={dep}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-caramel-600">{dep}</p>
              <table className="w-full text-sm">
                <caption className="sr-only">Filières du département {dep}</caption>
                <thead className="sr-only"><tr><th>Filière</th><th>Barre</th><th>Membres</th><th>Pourcentage</th><th>Filles / garçons</th></tr></thead>
                <tbody>
                  {liste.map((f) => (
                    <tr key={f.filiere} className="align-middle">
                      <td className="w-[46%] py-1.5 pr-3 text-brun-700">{f.filiere.replace('Technicien Supérieur en ', 'TS ')}</td>
                      <td className="w-[30%] py-1.5 pr-3">
                        <BarreSimple valeur={f.total} max={maxFiliere}
                          titre={`${f.filiere} : ${f.total} membres (${f.pct} %) — ${f.filles} fille(s), ${f.garcons} garçon(s), ${f.non_renseigne} à vérifier`} />
                      </td>
                      <td className="py-1.5 text-right font-bold tabular-nums text-brun-800">{f.total}</td>
                      <td className="w-14 py-1.5 text-right tabular-nums text-brun-500">{f.pct} %</td>
                      <td className="hidden w-20 py-1.5 text-right text-xs tabular-nums text-brun-500 sm:table-cell" title="Filles / garçons">
                        {f.filles} F · {f.garcons} G
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </Carte>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Taille des groupes */}
        <Carte titre="Taille des groupes" sousTitre="Nombre de groupes selon leur nombre de membres">
          {d.tailles_groupes.length === 0 ? <p className="text-sm text-brun-500">Aucun groupe.</p> : (
            <table className="w-full text-sm">
              <tbody>
                {d.tailles_groupes.map((t) => (
                  <tr key={t.taille}>
                    <td className="w-28 py-1.5 text-brun-700">{t.taille} membres</td>
                    <td className="py-1.5 pr-3"><BarreSimple valeur={t.groupes} max={maxTaille} titre={`${t.groupes} groupe(s) de ${t.taille} membres`} /></td>
                    <td className="w-10 py-1.5 text-right font-bold tabular-nums text-brun-800">{t.groupes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Carte>

        {/* Inscriptions par jour */}
        <Carte titre="Inscriptions par jour" sousTitre="Nombre de groupes inscrits chaque jour (survolez une barre)">
          {d.par_jour.length === 0 ? <p className="text-sm text-brun-500">Aucune inscription.</p> : (
            <div className="flex h-40 items-end gap-1.5" role="img" aria-label={`Inscriptions par jour, maximum ${maxJour}`}>
              {d.par_jour.map((j) => {
                const date = new Date(`${j.jour}T12:00:00`);
                return (
                  <div key={j.jour} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                    <span className={`mb-1 text-xs font-bold tabular-nums text-brun-800 ${j.groupes === maxJour ? '' : 'opacity-0 group-hover:opacity-100'}`}>{j.groupes}</span>
                    <div
                      className="w-full max-w-10 rounded-t"
                      style={{ height: `${Math.max(4, (100 * j.groupes) / maxJour)}%`, backgroundColor: BARRE }}
                      title={`${date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} : ${j.groupes} groupe(s)`}
                    />
                    <span className="mt-1 truncate text-[10px] text-brun-500">{date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Carte>
      </div>

      {/* E-mails de félicitations */}
      <Carte titre="E-mails de félicitations" sousTitre="Envoyés aux chefs de projet des groupes au statut « Accepté » (tous statuts confondus)">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
            <div><dt className="text-brun-500">Groupes acceptés</dt><dd className="font-bold tabular-nums text-brun-800">{acc.acceptes}</dd></div>
            <div><dt className="text-brun-500">Déjà envoyés</dt><dd className="font-bold tabular-nums text-brun-800">{acc.envoyes}</dd></div>
            <div><dt className="text-brun-500">À envoyer</dt><dd className="font-bold tabular-nums text-brun-800">{acc.a_envoyer}</dd></div>
            <div><dt className="text-brun-500">Sans e-mail</dt><dd className="font-bold tabular-nums text-brun-800">{acc.sans_email}</dd></div>
          </dl>
          <button type="button" className="btn-primaire" disabled={acc.a_envoyer === 0} onClick={() => setEnvoiOuvert(true)}>
            <Mail className="h-4 w-4" /> Envoyer les félicitations ({acc.a_envoyer})
          </button>
        </div>
      </Carte>

      {envoiOuvert && (
        <EnvoiFelicitations
          aEnvoyer={acc.a_envoyer}
          onFermer={() => { setEnvoiOuvert(false); charger(); }}
          onDeconnexion={onDeconnexion}
        />
      )}
    </div>
  );
}
