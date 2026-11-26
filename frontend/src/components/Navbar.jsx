import { Link } from 'react-router-dom';
import { Users, Vote } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-brun-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center" aria-label="Accueil CIAT">
          <img src="/logo-ciat.png" alt="CIAT — ISEP Amadou Trawaré" className="h-9 w-auto sm:h-10" />
        </Link>
        <nav className="flex items-center gap-1.5 text-sm font-semibold sm:gap-2">
          <Link
            to={{ pathname: '/', hash: '#candidats' }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brun-800 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brun-700 sm:text-sm"
          >
            <Users className="h-4 w-4 shrink-0 text-caramel-300" />
            <span>Candidats</span>
          </Link>
          <Link
            to="/vote"
            className="inline-flex items-center gap-1.5 rounded-xl bg-caramel-500 px-4 py-2 text-sm font-extrabold text-white shadow-md shadow-caramel-500/30 ring-2 ring-caramel-300 transition hover:bg-caramel-600 sm:px-5"
          >
            <Vote className="h-4 w-4" /> Voter
          </Link>
        </nav>
      </div>
    </header>
  );
}
