import { Link } from 'react-router-dom';
import { ArrowRight, Vote } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Hero from '../components/Hero.jsx';
import MiseEnAvantElections from '../components/MiseEnAvantElections.jsx';
import AfficheRencontre from '../components/AfficheRencontre.jsx';
import Annonce from '../components/Annonce.jsx';
import AboutClub from '../components/AboutClub.jsx';
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
            <span className="inline-flex items-center gap-1 rounded-full bg-caramel-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
              Nouveau
            </span>
            <span>
              <strong className="text-white">Élections du Club CIAT</strong> — Les candidatures aux 13 postes sont ouvertes en ligne sur la plateforme.
            </span>
          </p>
          <Link
            to="/elections"
            className="inline-flex items-center gap-1.5 font-bold text-caramel-300 transition hover:text-caramel-200"
          >
            <Vote className="h-4 w-4" /> Voir les postes et candidater <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
      <main>
        <Hero temps={temps} />
        <MiseEnAvantElections />
        <AfficheRencontre />
        <Annonce temps={temps} />
        <AboutClub />
        <FormulaireInscription temps={temps} />
      </main>
      <Footer />
    </>
  );
}
