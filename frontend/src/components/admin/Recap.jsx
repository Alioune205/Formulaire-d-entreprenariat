import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, FileEdit, Loader2, Mail, RefreshCw, RotateCcw, UserCheck } from 'lucide-react';
import { api, ErreurApi } from '../../lib/api.js';
import EnvoiFelicitations from './EnvoiFelicitations.jsx';
import EditeurModeleEmail from './EditeurModeleEmail.jsx';

// Palette validée (contrastes + daltonisme) : scripts/validate_palette.js, mode clair.
const COULEURS = { filles: '#b5651d', garcons: '#2f6fa3', non_renseigne: '#a8a29e' };
const LIBELLES = { filles: 'Filles', garcons: 'Garçons', non_renseigne: 'À vérifier' };
const BARRE = '#5f3b28'; // une seule teinte pour les grandeurs (filières, tailles, jours)

const STATUTS = [
  ['', 'Tous les dossiers'], ['EN_ATTENTE', 'En attente'], ['ENTRETIEN', 'Entretien'],
  ['ACCEPTE', 'Acceptés'], ['REJETE', 'Rejetés'],
];

const pluriel = (n, mot, motPluriel = `${mot}s`) => `${n} ${n > 1 ? motPluriel : mot}`;

function Carte({ titre, sousTitre, action, children, className = '', id }) {
  return (
    <section id={id} className={`rounded-2xl border border-brun-100 bg-white p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-brun-800">{titre}</h3>
          {sousTitre && <p className="mt-1 text-sm text-brun-600">{sousTitre}</p>}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Tuile({ libelle, valeur, detail, couleur }) {
  return (
    <div className="rounded-2xl border border-brun-100 bg-white p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-brun-700">
        {couleur && <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: couleur }} />}
        {libelle}
      </p>
      <p className="mt-2 text-4xl font-extrabold tabular-nums text-brun-900">{valeur}</p>
      {detail && <p className="mt-1 text-sm text-brun-600">{detail}</p>}
    </div>
  );
}

/** Barre empilée Filles / Garçons / À vérifier, avec 2 px d'écart entre segments. */
function BarreGenre({ c, hauteur = 'h-5' }) {
  if (!c.total) return <div className={`${hauteur} rounded bg-brun-50`} />;
  return (
    <div className={`flex ${hauteur} w-full gap-[2px] overflow-hidden rounded`}>
      {['filles', 'garcons', 'non_renseigne'].map((k) => c[k] > 0 && (
        <div
          key={k}
          style={{ width: `${(100 * c[k]) / c.total}%`, backgroundColor: COULEURS[k] }}
          title={`${LIBELLES[k]} : ${c[k]}`}
        />
      ))}
    </div>
  );
}

function DetailGenre({ c }) {
  return (
    <p className="mt-1.5 text-sm text-brun-700">
      <strong>{c.filles}</strong> {c.filles > 1 ? 'filles' : 'fille'} · <strong>{c.garcons}</strong>{' '}
      {c.garcons > 1 ? 'garçons' : 'garçon'}
      {c.non_renseigne > 0 && <span className="text-brun-500"> · {c.non_renseigne} à vérifier</span>}
    </p>
  );
}

function Legende() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-brun-700">
      {Object.keys(LIBELLES).map((k) => (
        <li key={k} className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COULEURS[k] }} /> {LIBELLES[k]}
        </li>
      ))}
    </ul>
  );
}

function BarreSimple({ valeur, max, titre }) {
  return (
    <div className="h-3 w-full rounded bg-brun-50" title={titre}>
      {valeur > 0 && (
        <div className="h-full rounded" style={{ width: `${Math.max(2, (100 * valeur) / max)}%`, backgroundColor: BARRE }} />
      )}
    </div>
  );
}

/** Liste des membres dont le genre n'a pas pu être déduit du prénom, avec correction en un clic. */
function MembresAVerifier({ onCorrige, onDeconnexion }) {
  const [membres, setMembres] = useState(null);
  const [erreur, setErreur] = useState(null);

  const charger = useCallback(async () => {
    try {
      setMembres(await api('/admin/membres/?a_verifier=1', { auth: true }));
    } catch (err) {
      if (err instanceof ErreurApi && err.status === 401) onDeconnexion();
      else setErreur('Impossible de charger la liste.');
    }
  }, [onDeconnexion]);

  useEffect(() => { charger(); }, [charger]);

  const corriger = async (m, genre) => {
    try {
      await api(`/admin/membres/${m.id}/`, { method: 'PATCH', body: { genre }, auth: true });
      setMembres((l) => l.filter((x) => x.id !== m.id));
      onCorrige();
    } catch {
      setErreur(`Échec de la correction pour ${m.prenom} ${m.nom}.`);
    }
  };

  return (
    <Carte
      id="a-verifier"
      titre={`Membres à vérifier${membres ? ` (${membres.length})` : ''}`}
      sousTitre="Prénoms mixtes ou non reconnus : indiquez fille ou garçon, le récapitulatif se met à jour."
    >
      {erreur && <p className="mb-3 flex items-center gap-2 text-sm text-red-600"><AlertCircle className="h-4 w-4" /> {erreur}</p>}
      {!membres ? <Loader2 className="h-6 w-6 animate-spin text-brun-400" /> : membres.length === 0 ? (
        <p className="flex items-center gap-2 text-base font-semibold text-emerald-700">
          <UserCheck className="h-5 w-5" /> Tous les membres sont identifiés.
        </p>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto rounded-xl border border-brun-100">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-brun-50 text-xs font-bold uppercase tracking-wide text-brun-600">
              <tr>
                <th className="px-4 py-3">Membre</th>
                <th className="hidden px-4 py-3 sm:table-cell">Groupe</th>
                <th className="hidden px-4 py-3 md:table-cell">Filière</th>
                <th className="px-4 py-3 text-right">Genre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brun-100">
              {membres.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2.5 text-base font-semibold text-brun-900">{m.prenom} {m.nom}</td>
                  <td className="hidden px-4 py-2.5 text-brun-700 sm:table-cell">{m.nom_groupe}</td>
                  <td className="hidden px-4 py-2.5 text-brun-600 md:table-cell">{m.metier}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => corriger(m, 'F')}
                        className="rounded-lg border-2 px-3 py-1.5 text-sm font-bold transition hover:text-white"
                        style={{ borderColor: COULEURS.filles, color: COULEURS.filles }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = COULEURS.filles; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = COULEURS.filles; }}>
                        Fille
                      </button>
                      <button type="button" onClick={() => corriger(m, 'H')}
                        className="rounded-lg border-2 px-3 py-1.5 text-sm font-bold transition"
                        style={{ borderColor: COULEURS.garcons, color: COULEURS.garcons }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = COULEURS.garcons; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = COULEURS.garcons; }}>
                        Garçon
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Carte>
  );
}

export default function Recap({ onDeconnexion }) {
  const [statut, setStatut] = useState('');
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [envoiOuvert, setEnvoiOuvert] = useState(false);
  const [modeleOuvert, setModeleOuvert] = useState(false);

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
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="filtre-statut" className="text-sm font-bold text-brun-700">Afficher :</label>
        <select id="filtre-statut" className="champ w-auto" value={statut} onChange={(e) => setStatut(e.target.value)}>
          {STATUTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button type="button" onClick={charger} className="btn-secondaire" aria-label="Actualiser">
          <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} /> Actualiser
        </button>
        {erreur && <span className="flex items-center gap-1 text-sm text-red-600"><AlertCircle className="h-4 w-4" /> {erreur}</span>}
      </div>

      {/* Chiffres clés */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Tuile libelle="Groupes" valeur={d.groupes} detail={`dont ${pluriel(d.groupes_mixtes, 'mixte')} TIC + Automobile`} />
        <Tuile libelle="Membres" valeur={d.membres} detail={`${d.moyenne_membres} par groupe en moyenne`} />
        <Tuile libelle="Filles" couleur={COULEURS.filles} valeur={g.filles}
          detail={g.identifies ? `${g.pct_filles_identifies} % des membres identifiés` : '—'} />
        <Tuile libelle="Garçons" couleur={COULEURS.garcons} valeur={g.garcons}
          detail={g.identifies ? `${g.pct_garcons_identifies} % des membres identifiés` : '—'} />
        <Tuile libelle="À vérifier" couleur={COULEURS.non_renseigne} valeur={g.non_renseigne}
          detail={g.non_renseigne ? <a href="#a-verifier" className="font-semibold text-caramel-600 underline">Voir la liste ↓</a> : 'Tout est identifié'} />
        <Tuile libelle="Cheffes de projet" valeur={d.chefs_de_projet_filles}
          detail={`${pluriel(d.groupes_avec_fille, 'groupe')} avec au moins une fille`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Carte titre="Filles et garçons"
          sousTitre="Déduit des prénoms. Les pourcentages sont calculés sur les membres identifiés.">
          <BarreGenre c={g} hauteur="h-8" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[['filles', g.pct_filles_identifies], ['garcons', g.pct_garcons_identifies], ['non_renseigne', null]].map(([k, p]) => (
              <div key={k} className="rounded-xl bg-brun-50 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-brun-700">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COULEURS[k] }} /> {LIBELLES[k]}
                </p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-brun-900">{g[k]}</p>
                <p className="text-sm text-brun-600">{p !== null ? `${p} %` : 'à corriger ci-dessous'}</p>
              </div>
            ))}
          </div>
          {d.genre_corriges > 0 && <p className="mt-3 text-sm text-brun-600">{pluriel(d.genre_corriges, 'correction manuelle', 'corrections manuelles')} prise(s) en compte.</p>}
        </Carte>

        <Carte titre="Départements" sousTitre="Nombre de membres par département et répartition filles / garçons">
          <div className="space-y-6">
            {d.departements.map((dep) => (
              <div key={dep.departement}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <span className="text-base font-bold text-brun-900">{dep.departement}</span>
                  <span className="text-base tabular-nums text-brun-700"><strong className="text-brun-900">{dep.total}</strong> membres · {dep.pct} %</span>
                </div>
                <BarreGenre c={dep} />
                <DetailGenre c={dep} />
              </div>
            ))}
            <Legende />
          </div>
        </Carte>
      </div>

      <Carte titre="Filières" sousTitre="Nombre de membres par filière et part sur l’ensemble des membres">
        <div className="grid gap-x-12 gap-y-8 lg:grid-cols-2">
          {Object.entries(parDepartement).map(([dep, liste]) => (
            <div key={dep}>
              <p className="mb-3 border-b border-brun-100 pb-2 text-sm font-extrabold uppercase tracking-wider text-caramel-600">{dep}</p>
              <ul className="space-y-4">
                {liste.map((f) => (
                  <li key={f.filiere}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-brun-900">{f.filiere}</span>
                      <span className="shrink-0 text-sm tabular-nums text-brun-700">
                        <strong className="text-base text-brun-900">{f.total}</strong> · {f.pct} %
                      </span>
                    </div>
                    <BarreSimple valeur={f.total} max={maxFiliere} titre={`${f.filiere} : ${f.total} membres (${f.pct} %)`} />
                    {f.total > 0 && <DetailGenre c={f} />}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Carte>

      <div className="grid gap-6 lg:grid-cols-2">
        <Carte titre="Taille des groupes" sousTitre="Nombre de groupes selon leur nombre de membres">
          {d.tailles_groupes.length === 0 ? <p className="text-brun-600">Aucun groupe.</p> : (
            <ul className="space-y-3">
              {d.tailles_groupes.map((t) => (
                <li key={t.taille} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3">
                  <span className="text-sm font-semibold text-brun-800">{pluriel(t.taille, 'membre')}</span>
                  <BarreSimple valeur={t.groupes} max={maxTaille} titre={`${t.groupes} groupe(s)`} />
                  <span className="text-right text-base font-extrabold tabular-nums text-brun-900">{t.groupes}</span>
                </li>
              ))}
            </ul>
          )}
        </Carte>

        <Carte titre="Inscriptions par jour" sousTitre="Nombre de groupes inscrits chaque jour">
          {d.par_jour.length === 0 ? <p className="text-brun-600">Aucune inscription.</p> : (
            <div className="flex h-48 items-end gap-2" role="img" aria-label="Inscriptions par jour">
              {d.par_jour.map((j) => {
                const date = new Date(`${j.jour}T12:00:00`);
                return (
                  <div key={j.jour} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                    <span className="mb-1 text-sm font-extrabold tabular-nums text-brun-900">{j.groupes}</span>
                    <div className="w-full max-w-12 rounded-t" style={{ height: `${Math.max(4, (100 * j.groupes) / maxJour)}%`, backgroundColor: BARRE }}
                      title={`${date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} : ${j.groupes} groupe(s)`} />
                    <span className="mt-1.5 truncate text-xs font-semibold text-brun-700">{date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Carte>
      </div>

      <MembresAVerifier onCorrige={charger} onDeconnexion={onDeconnexion} />

      <Carte
        titre="E-mails de convocation à l’entretien"
        sousTitre="Envoyés aux chefs de projet de tous les groupes retenus pour l’entretien (les dossiers rejetés sont exclus)"
        action={(
          <div className="flex flex-wrap items-center gap-2">
            {acc.envoyes > 0 && (
              <button
                type="button"
                className="btn-secondaire text-amber-700 hover:border-amber-300 hover:text-amber-800"
                onClick={async () => {
                  if (window.confirm(`Voulez-vous réinitialiser les ${acc.envoyes} groupes pour les replacer dans « À passer en entretien » et autoriser un nouvel envoi ?`)) {
                    try {
                      await api('/admin/inscriptions/reinitialiser-acceptations/', { method: 'POST', auth: true });
                      await charger();
                    } catch {
                      alert('Échec de la réinitialisation.');
                    }
                  }
                }}
              >
                <RotateCcw className="h-4 w-4" /> Replacer en « À passer » ({acc.envoyes})
              </button>
            )}
            <button type="button" className="btn-secondaire" onClick={() => setModeleOuvert(true)}>
              <FileEdit className="h-4 w-4" /> Personnaliser l’e-mail
            </button>
            <button type="button" className="btn-primaire" disabled={acc.eligibles === 0} onClick={() => setEnvoiOuvert(true)}>
              <Mail className="h-4 w-4" /> Envoyer les convocations à tous les groupes ({acc.eligibles})
            </button>
          </div>
        )}
      >
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[['À envoyer', acc.eligibles], ['Déjà envoyés', acc.envoyes], ['Sans e-mail', acc.sans_email], ['Rejetés (exclus)', d.statuts.REJETE ?? 0]].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-brun-50 p-3">
              <dt className="text-sm font-semibold text-brun-700">{l}</dt>
              <dd className="mt-1 text-2xl font-extrabold tabular-nums text-brun-900">{v}</dd>
            </div>
          ))}
        </dl>
        {acc.non_acceptes > 0 && (
          <p className="mt-3 text-sm text-brun-600">
            Lors de l’envoi, les {acc.non_acceptes} dossier(s) encore « En attente » passeront au statut « Convoqué en entretien » (visibles dans l'onglet « Entretiens » pour l'évaluation du jury).
          </p>
        )}
      </Carte>

      {modeleOuvert && (
        <EditeurModeleEmail
          onFermer={() => setModeleOuvert(false)}
          onDeconnexion={onDeconnexion}
        />
      )}
      {envoiOuvert && (
        <EnvoiFelicitations aEnvoyer={acc.eligibles} nonAcceptes={acc.non_acceptes} onFermer={() => { setEnvoiOuvert(false); charger(); }} onDeconnexion={onDeconnexion} />
      )}
    </div>
  );
}
