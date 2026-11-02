import { CalendarDays, Megaphone, Users, Wrench } from 'lucide-react';
import { formatDateLimite } from '../lib/useDateLimite.js';

const POINTS = [
  { icone: Users, titre: 'Départements TIC et Automobile', texte: 'Développeurs, administrateurs systèmes, spécialistes réseaux et IoT, techniciens automobiles : des équipes de 3 à 6 membres, mixtes ou non.' },
  { icone: Wrench, titre: 'Des ateliers réels', texte: 'Incubateur numérique et atelier automobile : les projets se construisent avec les équipements du CIAT.' },
  { icone: CalendarDays, titre: 'Première cohorte 2026-2027', texte: 'Les groupes retenus démarrent l’accompagnement dès la fin des sélections.' },
];

export default function Annonce({ temps }) {
  return (
    <section className="relative overflow-hidden border-b border-brun-100 bg-white">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-caramel-500" aria-hidden />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brun-800 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-caramel-200">
            <Megaphone className="h-4 w-4" /> Annonce officielle
          </span>
          <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-brun-800 sm:text-4xl">
            L'ISEP Amadou Trawaré lance son <span className="text-caramel-600">Club d'Entrepreneuriat</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-brun-600">
            À travers son Centre d'Innovation, d'Application et de Transfert (CIAT), l'ISEP ouvre un club pour
            transformer les idées des étudiants en projets concrets. Formez votre équipe, présentez votre projet et
            rejoignez la première cohorte.
          </p>
          <p className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-xl bg-caramel-100/60 px-4 py-3 text-sm font-semibold text-brun-700">
            <CalendarDays className="h-4 w-4 text-caramel-600" />
            {temps.ouvert
              ? <>Inscriptions jusqu’au <span className="text-brun-900">{formatDateLimite(temps.dateLimite)}</span></>
              : 'Les inscriptions de cette cohorte sont closes.'}
          </p>
        </div>

        <ul className="space-y-4">
          {POINTS.map(({ icone: Icone, titre, texte }) => (
            <li key={titre} className="flex gap-4 rounded-2xl border border-brun-100 bg-brun-50 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brun-800 text-caramel-300">
                <Icone className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-brun-800">{titre}</p>
                <p className="mt-1 text-sm leading-relaxed text-brun-600">{texte}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
