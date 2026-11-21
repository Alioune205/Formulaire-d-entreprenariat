import { ArrowRight, Camera, ChevronRight, Clock, FileText, Vote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { POSTES } from '../lib/postes.js';
import { formatDateLimite } from '../lib/useDateLimite.js';

const BUREAU = POSTES.filter((p) => p.categorie === 'Bureau Exécutif');
const CELLULES = POSTES.filter((p) => p.categorie !== 'Bureau Exécutif');

const ETAPES = [
  { icone: Vote, titre: 'Choisissez un poste', texte: 'Parmi les 13 postes ci-dessous.' },
  { icone: Camera, titre: 'Ajoutez une photo', texte: 'Pour que les électeurs vous reconnaissent.' },
  { icone: FileText, titre: 'Motivations et vidéo', texte: 'Quelques lignes et 1 à 2 min de vidéo au téléphone.' },
];

function TuilePoste({ poste, ouvert }) {
  return (
    <Link
      to={ouvert ? `/elections?poste=${poste.code}` : '/elections'}
      className="group flex items-center justify-between gap-2 rounded-xl border border-brun-100 bg-white px-3.5 py-3 text-sm font-bold text-brun-800 shadow-sm transition hover:-translate-y-0.5 hover:border-caramel-400 hover:shadow-md"
    >
      <span className="min-w-0">{poste.titre}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-caramel-500 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

export default function MiseEnAvantElections({ temps }) {
  const { elections } = temps;
  return (
    <section
      id="elections-une"
      className="relative scroll-mt-16 overflow-hidden border-b border-brun-100 bg-gradient-to-b from-white via-[#faf6f3] to-white py-12 sm:py-16"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-caramel-200 bg-caramel-50 px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-caramel-800">
              <Vote className="h-3.5 w-3.5" /> À la une · Élections 2026-2027
            </div>
            <h2 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-brun-900 sm:text-4xl">
              {elections.ouvert ? 'Choisissez votre poste et déposez votre candidature' : 'Les 13 postes des élections du club'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-brun-600 sm:text-base">
              Le club sera dirigé par les étudiant(e)s élu(e)s. Chaque étudiant(e) de l'ISEP peut se présenter à
              un poste. Cliquez sur un poste pour ouvrir directement le formulaire.
            </p>
          </div>
          {elections.ouvert && (
            <p className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-caramel-300 bg-caramel-50 px-4 py-3 text-sm font-bold text-brun-800">
              <Clock className="h-4 w-4 text-caramel-600" />
              Clôture : {formatDateLimite(elections.dateLimite)}
            </p>
          )}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-caramel-200/80 bg-[#faf6f3] p-5 sm:p-6">
            <p className="text-xs font-extrabold uppercase tracking-widest text-caramel-800">Bureau Exécutif · {BUREAU.length} postes</p>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {BUREAU.map((p) => <TuilePoste key={p.code} poste={p} ouvert={elections.ouvert} />)}
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-caramel-200/80 bg-[#faf6f3] p-5 sm:p-6">
              <p className="text-xs font-extrabold uppercase tracking-widest text-caramel-800">Cellules Thématiques · {CELLULES.length} postes</p>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {CELLULES.map((p) => <TuilePoste key={p.code} poste={p} ouvert={elections.ouvert} />)}
              </div>
            </div>

            <div className="rounded-3xl bg-[#2b170e] p-5 text-white sm:p-6">
              <p className="text-xs font-extrabold uppercase tracking-widest text-caramel-300">Candidater en 3 étapes</p>
              <ol className="mt-4 grid gap-3 sm:grid-cols-3">
                {ETAPES.map(({ icone: Icone, titre, texte }) => (
                  <li key={titre} className="flex items-start gap-3 sm:flex-col sm:gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-caramel-500">
                      <Icone className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold">{titre}</span>
                      <span className="mt-0.5 block text-xs text-brun-200">{texte}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            to="/elections"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-caramel-500 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-caramel-500/25 transition hover:-translate-y-0.5 hover:bg-caramel-600 sm:text-base"
          >
            <Vote className="h-5 w-5" />
            {elections.ouvert ? 'Voir les postes et candidater' : 'Voir la page des élections'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
