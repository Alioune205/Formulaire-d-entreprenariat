import { ArrowRight, CheckCircle2, Vote } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Hero from '../components/Hero.jsx';
import PresentationAujourdhui from '../components/PresentationAujourdhui.jsx';
import MiseEnAvantElections from '../components/MiseEnAvantElections.jsx';
import FormulaireInscription from '../components/FormulaireInscription.jsx';
import Footer from '../components/Footer.jsx';
import useDateLimite from '../lib/useDateLimite.js';

export default function Accueil() {
  const temps = useDateLimite();
  return (
    <>
      <Navbar />
      <div className="border-b border-caramel-500/30 bg-[#2b170e] px-4 py-2.5 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
          <p className="flex items-center gap-2 font-medium text-brun-100">
            <span className="inline-flex items-center gap-1 rounded-full bg-caramel-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
              <CheckCircle2 className="h-3 w-3" /> Réouvert
            </span>
            <span>
              <strong className="text-white">Suite à la présentation d'aujourd'hui</strong> — Inscriptions réouvertes dès 1 membre + Élections du Bureau.
            </span>
          </p>
          <div className="flex items-center gap-4">
            {temps.ouvert && (
              <a
                href="#inscription"
                className="inline-flex items-center gap-1 font-bold text-caramel-300 transition hover:text-caramel-200"
              >
                Inscrire un projet <ArrowRight className="h-3.5 w-3.5" />
              </a>
            )}
            <Link
              to="/elections"
              className="inline-flex items-center gap-1 font-bold text-white/90 transition hover:text-caramel-200"
            >
              <Vote className="h-3.5 w-3.5 text-caramel-300" /> Élections
            </Link>
          </div>
        </div>
      </div>
      <main>
        <Hero temps={temps} />
        <PresentationAujourdhui temps={temps} />
        <MiseEnAvantElections />
        <FormulaireInscription temps={temps} />
      </main>
      <Footer />
    </>
  );
}
