import { Link, NavLink } from 'react-router-dom';
import { FileSearch, Vote } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-brun-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center" aria-label="Accueil CIAT">
          <img src="/logo-ciat.png" alt="CIAT — ISEP Amadou Trawaré" className="h-9 w-auto sm:h-10" />
        </Link>
        <nav className="flex items-center gap-1.5 text-sm font-semibold sm:gap-2">
          <NavLink
            to="/elections"
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold shadow-sm transition sm:text-sm ${
                isActive
                  ? 'bg-brun-800 text-white ring-2 ring-caramel-400'
                  : 'bg-caramel-500 text-white hover:bg-caramel-600'
              }`
            }
          >
            <Vote className="h-4 w-4 shrink-0" />
            <span>Élections & Postes</span>
          </NavLink>
          <a href="/#rencontre" className="hidden rounded-lg border border-caramel-200/80 bg-caramel-50 px-2.5 py-1.5 text-xs font-bold text-caramel-700 transition hover:bg-caramel-100 lg:inline-block sm:text-sm">
            Rencontre 18 Nov.
          </a>
          <a href="/#club" className="hidden rounded-lg px-3 py-2 text-brun-700 hover:bg-brun-50 md:block">Le club</a>
          <NavLink
            to="/suivi"
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 hover:bg-brun-50 ${isActive ? 'text-caramel-600' : 'text-brun-700'}`
            }
          >
            <FileSearch className="h-4 w-4" /> <span className="hidden sm:inline">Suivre mon dossier</span><span className="sm:hidden">Suivi</span>
          </NavLink>
          <a href="/#inscription" className="hidden rounded-xl border border-brun-200 px-3.5 py-2 text-brun-700 hover:bg-brun-50 sm:inline-block">
            S'inscrire
          </a>
        </nav>
      </div>
    </header>
  );
}
