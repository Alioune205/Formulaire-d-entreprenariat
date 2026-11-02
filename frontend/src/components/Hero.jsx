import { useEffect, useState } from 'react';
import { ArrowRight, FileSearch, Lightbulb, Network, Target, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import CompteARebours from './CompteARebours.jsx';

const DIAPOS = [
  { src: '/hero.jpeg', alt: 'Étudiants du CIAT travaillant ensemble à l’incubateur', position: 'object-[30%_center]', legende: 'Incubateur CIAT' },
  { src: '/hero-atelier.jpeg', alt: 'Étudiants du CIAT en atelier automobile', position: 'object-[40%_center]', legende: 'Atelier automobile' },
];
const DUREE = 6000;

const PILIERS = [
  { icone: Lightbulb, texte: 'Innovation' },
  { icone: Users, texte: 'Accompagnement' },
  { icone: Network, texte: 'Réseau' },
  { icone: Target, texte: 'Impact' },
];

export default function Hero({ temps }) {
  const [diapos, setDiapos] = useState(DIAPOS);
  const [actif, setActif] = useState(0);

  // Défilement automatique (désactivé si l'utilisateur préfère réduire les animations).
  useEffect(() => {
    if (diapos.length < 2) return undefined;
    const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduit) return undefined;
    const t = setInterval(() => setActif((i) => (i + 1) % diapos.length), DUREE);
    return () => clearInterval(t);
  }, [diapos.length]);

  // Une image manquante est simplement retirée du diaporama.
  const retirer = (src) => {
    setDiapos((d) => d.filter((x) => x.src !== src));
    setActif(0);
  };

  return (
    <section className="relative isolate overflow-hidden bg-brun-900" aria-roledescription="carrousel">
      {diapos.map((d, i) => (
        <img
          key={d.src}
          src={d.src}
          alt={i === actif ? d.alt : ''}
          aria-hidden={i !== actif}
          onError={() => retirer(d.src)}
          className={`absolute inset-0 -z-10 h-full w-full object-cover ${d.position} transition-all duration-[1500ms] ease-out ${
            i === actif ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
          }`}
        />
      ))}
      {/* Voile dégradé pour la lisibilité du texte */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brun-900/95 via-brun-900/80 to-brun-900/30" />

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-caramel-300/40 bg-caramel-500/15 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-caramel-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-caramel-400" />
            {temps.ouvert ? 'Inscriptions ouvertes • 2026-2027' : 'Inscriptions closes • 2026-2027'}
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Club d'Entrepreneuriat
            <span className="block text-caramel-300">de l'idée au prototype, puis à l'impact.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-brun-100">
            Le Centre d'Innovation, d'Application et de Transfert de l'ISEP Amadou Trawaré accompagne les groupes
            d'étudiants qui veulent construire un projet concret.
          </p>

          <div className="mt-8">
            <CompteARebours temps={temps} variante="sombre" />
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {temps.ouvert ? (
              <a href="#inscription" className="inline-flex items-center justify-center gap-2 rounded-xl bg-caramel-500 px-7 py-4 font-bold text-white shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-caramel-400">
                Inscrire mon groupe <ArrowRight className="h-5 w-5" />
              </a>
            ) : null}
            <Link to="/suivi" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-7 py-4 font-semibold text-white transition hover:bg-white/10">
              <FileSearch className="h-5 w-5" /> Suivre mon dossier
            </Link>
          </div>

          <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PILIERS.map(({ icone: Icone, texte }) => (
              <li key={texte} className="flex items-center gap-2 text-sm font-medium text-brun-100">
                <Icone className="h-5 w-5 text-caramel-300" /> {texte}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {diapos.length > 1 && (
        <div className="absolute bottom-5 right-4 flex items-center gap-3 sm:right-6">
          <span className="hidden text-xs font-semibold text-white/80 sm:block">{diapos[actif]?.legende}</span>
          <div className="flex gap-2">
            {diapos.map((d, i) => (
              <button
                key={d.src}
                type="button"
                onClick={() => setActif(i)}
                aria-label={`Afficher : ${d.legende}`}
                aria-current={i === actif}
                className={`h-2.5 rounded-full transition-all ${i === actif ? 'w-8 bg-caramel-400' : 'w-2.5 bg-white/50 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
