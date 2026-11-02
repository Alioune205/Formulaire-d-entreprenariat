import React from 'react';
import { Target, Compass, Sparkles, Network, Code, Briefcase, Palette, TrendingUp } from 'lucide-react';

export default function AboutClub() {
  const pillars = [
    {
      icon: Target,
      title: '1. Idéation & Lean Startup',
      color: 'from-blue-500 to-indigo-600',
      description: 'Ateliers intensifs de Design Thinking et validation terrain de votre problème/solution avant même de dépenser un franc.'
    },
    {
      icon: Compass,
      title: '2. Mentorat & Prototypage',
      color: 'from-amber-500 to-orange-600',
      description: 'Chaque équipe est épaulée par un mentor expert (fondateur de startup ou alumni) pour concevoir un MVP fonctionnel.'
    },
    {
      icon: Network,
      title: '3. Demo Day & Accès Réseau',
      color: 'from-emerald-500 to-teal-600',
      description: 'Présentez vos prototypes devant un jury de chefs d’entreprises, d’investisseurs et gagnez des bourses d’amorçage.'
    }
  ];

  const profiles = [
    {
      role: 'Porteurs de projets',
      icon: Sparkles,
      desc: 'Tu as une idée brute ou un début de projet ? Viens le structurer et trouver ton équipe.'
    },
    {
      role: 'Profils Tech & Code',
      icon: Code,
      desc: 'Développeurs web, mobile, data ou ingénieurs qui veulent coder des produits à fort impact.'
    },
    {
      role: 'Design & Créatifs',
      icon: Palette,
      desc: 'UI/UX, graphistes, monteurs vidéo : donnez vie visuelle à des marques innovantes.'
    },
    {
      role: 'Business & Finance',
      icon: TrendingUp,
      desc: 'Étudiants en gestion, marketing, droit : structurez le business plan et la stratégie marché.'
    }
  ];

  return (
    <section id="apropos" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            Notre Méthodologie
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Pourquoi rejoindre le Club d’Entrepreneuriat ?
          </h2>
          <p className="mt-4 text-slate-600 text-lg">
            Nous transformons l’énergie étudiante en compétences d’élite et en entreprises viables grâce à un parcours éprouvé.
          </p>
        </div>

        {/* 3 Pillars */}
        <div id="piliers" className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {pillars.map((p, index) => {
            const Icon = p.icon;
            return (
              <div
                key={index}
                className="relative bg-slate-50 border border-slate-200/80 rounded-2xl p-8 hover:-translate-y-1 hover:shadow-xl hover:border-indigo-200 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${p.color} text-white flex items-center justify-center shadow-md mb-6`}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{p.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{p.description}</p>
              </div>
            );
          })}
        </div>

        {/* Who are we looking for? */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-12 text-white shadow-xl">
          <div className="max-w-2xl mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 bg-indigo-900/60 px-3 py-1 rounded-full border border-indigo-800">
              Profils recherchés
            </span>
            <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
              Tous les talents ont leur place au club
            </h3>
            <p className="mt-2 text-indigo-200/90 text-sm sm:text-base">
              L’entrepreneuriat est un sport collectif. Que vous ayez une idée ou simplement une soif d’apprendre, nous vous mettons en équipe.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {profiles.map((profile, i) => {
              const Icon = profile.icon;
              return (
                <div key={i} className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/15 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-base text-white mb-2">{profile.role}</h4>
                  <p className="text-xs text-indigo-200 leading-relaxed">{profile.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}

