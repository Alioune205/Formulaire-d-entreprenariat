import React from 'react';
import { ArrowRight, Users, Lightbulb, Trophy, CheckCircle2 } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32 bg-gradient-to-b from-indigo-50/60 via-white to-white">
      {/* Decorative ambient background blur */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-indigo-200/40 via-purple-100/40 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-100/80 border border-indigo-200 text-indigo-800 text-xs sm:text-sm font-semibold mb-6 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
            Campagne de Recrutement Officielle • Saison 2026-2027
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Passe de l’idée au <span className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 bg-clip-text text-transparent">projet concret</span> avec les meilleurs talents.
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed font-normal">
            Le Club d’Entrepreneuriat réunit étudiants visionnaires, développeurs, designers et gestionnaires pour co-créer, pitcher et lancer des projets à fort impact.
          </p>

          {/* CTAs */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#formulaire"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl font-bold text-base text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              Postuler en 2 minutes
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="#apropos"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-4 rounded-xl font-semibold text-base text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-sm transition-all"
            >
              En savoir plus sur nos programmes
            </a>
          </div>

          {/* Fast badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 100% Gratuit pour les étudiants
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Aucun prérequis de projet
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Certificat & Réseau Alumni
            </span>
          </div>

        </div>

        {/* Proof metrics row */}
        <div className="mt-16 sm:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/90 rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">+180</div>
            <div className="text-sm font-medium text-slate-500 mt-1">Étudiants accompagnés</div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/90 rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 mx-auto rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">32</div>
            <div className="text-sm font-medium text-slate-500 mt-1">Startups & Projets incubés</div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/90 rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">12M FCFA</div>
            <div className="text-sm font-medium text-slate-500 mt-1">Prix & financements remportés</div>
          </div>
        </div>

      </div>
    </section>
  );
}

