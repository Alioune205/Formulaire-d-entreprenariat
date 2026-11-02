import { Link, NavLink } from 'react-router-dom';
import { FileSearch } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-brun-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center" aria-label="Accueil CIAT">
          <img src="/logo-ciat.png" alt="CIAT — ISEP Amadou Trawaré" className="h-9 w-auto sm:h-10" />
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold sm:gap-2">
          <a href="/#club" className="hidden rounded-lg px-3 py-2 text-brun-700 hover:bg-brun-50 md:block">Le club</a>
          <NavLink
            to="/suivi"
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-brun-50 ${isActive ? 'text-caramel-600' : 'text-brun-700'}`
            }
          >
            <FileSearch className="h-4 w-4" /> <span className="hidden sm:inline">Suivre mon dossier</span><span className="sm:hidden">Suivi</span>
          </NavLink>
          <a href="/#inscription" className="rounded-xl bg-caramel-500 px-4 py-2 text-white shadow-sm hover:bg-caramel-600">
            S'inscrire
          </a>
        </nav>
      </div>
    </header>
  );
}
