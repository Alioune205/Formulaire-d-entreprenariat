'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'Est-ce que l’adhésion au Club est payante ?',
    a: 'Non, l’accès aux programmes d’idéation, aux ateliers et au mentorat est 100% gratuit pour tous les étudiants inscrits.'
  },
  {
    q: 'Dois-je obligatoirement avoir une idée de startup pour postuler ?',
    a: 'Absolument pas ! Plus de la moitié des membres recrutés rejoignent le club en tant que talents complémentaires (développeurs, designers, marketeurs, juristes) pour intégrer une équipe existante.'
  },
  {
    q: 'Quel est l’investissement en temps demandé ?',
    a: 'Nous demandons en moyenne entre 2 et 5 heures par semaine. Les sessions et workshops ont lieu en fin d’après-midi ou le samedi matin pour ne pas empiéter sur vos cours obligatoires.'
  },
  {
    q: 'Comment se déroule la sélection des candidatures ?',
    a: 'Après examen du formulaire, les candidats pré-sélectionnés sont conviés à un bref échange informel (15 min) axé sur la motivation, l’esprit d’équipe et la curiosité.'
  },
  {
    q: 'Obtient-on une attestation ou un certificat ?',
    a: 'Oui, les membres actifs ayant complété le cycle d’ateliers et participé au Demo Day reçoivent un Certificat d’Innovation et d’Entrepreneuriat valorisable sur LinkedIn et CV.'
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <section id="faq" className="py-20 bg-white border-t border-slate-200/60">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            Questions Fréquentes
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Tout ce que vous devez savoir
          </h2>
          <p className="mt-3 text-slate-600 text-base">
            Vous avez encore des doutes ? Voici les réponses aux questions les plus posées par les postulants.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="border border-slate-200 rounded-2xl overflow-hidden transition-all duration-200 hover:border-slate-300"
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <span className="font-bold text-slate-900 text-base sm:text-lg">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-indigo-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="p-5 sm:p-6 pt-0 text-slate-600 text-sm sm:text-base leading-relaxed bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

