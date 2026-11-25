import { ArrowRight, CheckCircle2, Vote } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Hero from '../components/Hero.jsx';
import PresentationAujourdhui from '../components/PresentationAujourdhui.jsx';
import MiseEnAvantElections from '../components/MiseEnAvantElections.jsx';
import VitrineCandidats from '../components/VitrineCandidats.jsx';
import FormulaireInscription from '../components/FormulaireInscription.jsx';
import Footer from '../components/Footer.jsx';
import useDateLimite, { formatDateLimite, formatJourLimite } from '../lib/useDateLimite.js';

export default function Accueil() {
  const temps = useDateLimite();
  return (
    <>
      <Navbar />
      <div className="border-b border-caramel-500/30 bg-[#2b170e] px-4 py-2.5 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
          <p className="flex items-center gap-2 font-medium text-brun-100">
            <span className="inline-flex items-center gap-1 rounded-full bg-caramel-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
              <Vote className="h-3 w-3" /> Élections & Votes
            </span>
            <span>
              {temps.elections.ouvert ? (
                <>
                  <strong className="text-white">Candidatures prolongées jusqu'au {formatJourLimite(temps.elections.dateLimite)}</strong>
                  {' '}— 13 postes à pourvoir au Bureau et dans les Cellules.
                </>
              ) : temps.vote.etat === 'avant' ? (
                <><strong className="text-white">Vote en ligne à partir du {formatDateLimite(temps.vote.debut)}</strong>, jusqu'au {formatDateLimite(temps.vote.fin)}.</>
              ) : temps.vote.etat === 'ouvert' ? (
                <><strong className="text-white">Le vote est ouvert !</strong> Clôture le {formatDateLimite(temps.vote.fin)}.</>
              ) : (
                <strong className="text-white">Le vote est clos. Merci pour votre participation !</strong>
              )}
            </span>
          </p>
          <div className="flex items-center gap-4">
            <Link
              to={temps.elections.ouvert ? '/elections' : '/vote'}
              className="inline-flex items-center gap-1 font-bold text-caramel-300 transition hover:text-caramel-200"
            >
              {temps.elections.ouvert ? 'Je candidate' : temps.vote.etat === 'clos' ? 'Élections' : 'Je vote'} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            {temps.ouvert && (
              <a
                href="#inscription"
                className="inline-flex items-center gap-1 font-bold text-white/90 transition hover:text-caramel-200"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-caramel-300" /> Inscrire un projet
              </a>
            )}
          </div>
        </div>
      </div>
      <main>
        <Hero temps={temps} />
        {temps.elections.ouvert ? <MiseEnAvantElections temps={temps} /> : <VitrineCandidats vote={temps.vote} />}
        {/* Inscriptions des projets : affichées seulement tant qu'elles sont ouvertes */}
        {temps.ouvert && <PresentationAujourdhui temps={temps} />}
        {temps.ouvert && <FormulaireInscription temps={temps} />}
      </main>
      <Footer />
    </>
  );
}
