import React from 'react';
import Link from 'next/link';
import { Rocket, ShieldCheck, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <Rocket className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">
                Club d’Entrepreneuriat
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              La communauté étudiante dédiée à l’innovation, à l’incubation de startups et au développement des compétences d’avenir.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-2">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-indigo-400" /> Campus Universitaire
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-400" /> contact@entrepreneuriat-club.org
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Navigation
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#apropos" className="hover:text-white transition-colors">À propos</a>
              </li>
              <li>
                <a href="#piliers" className="hover:text-white transition-colors">Programmes</a>
              </li>
              <li>
                <a href="#formulaire" className="hover:text-white transition-colors">Postuler</a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Administration
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Connexion Back-Office
                </Link>
              </li>
              <li className="text-xs text-slate-500 pt-2">
                Accès réservé au bureau du club et aux encadrants.
              </li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <div>
            © {new Date().getFullYear()} Club d’Entrepreneuriat. Tous droits réservés.
          </div>
          <div className="text-slate-400">
            Projet étudiant conçu pour la sélection et l&apos;incubation.
          </div>
        </div>

      </div>
    </footer>
  );
}

