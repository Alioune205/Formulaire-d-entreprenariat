import { ArrowRight, Award, CalendarCheck, Camera, Users, Vote } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MiseEnAvantElections() {
  return (
    <section
      id="elections-une"
      className="relative overflow-hidden border-b border-brun-100 bg-gradient-to-b from-white via-[#faf6f3] to-white py-12 sm:py-16"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-caramel-200/80 bg-white shadow-xl shadow-brun-900/10">
          <div className="grid lg:grid-cols-[1.2fr_1fr] lg:items-stretch">
            {/* Visuel à gauche */}
            <div className="relative min-h-[260px] overflow-hidden bg-[#2b170e] sm:min-h-[340px]">
              <img
                src="/hero-elections.jpeg"
                alt="Élections et gouvernance du Club d'Entrepreneuriat CIAT"
                className="h-full w-full object-cover object-right transition-transform duration-700 hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2b170e]/90 via-[#2b170e]/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-caramel-500 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-white shadow">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  Candidatures ouvertes
                </span>
                <span className="rounded-full border border-white/25 bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  Vote en ligne ce samedi
                </span>
              </div>
            </div>

            {/* Contenu à droite */}
            <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-caramel-200 bg-caramel-50 px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-caramel-800">
                  <Vote className="h-3.5 w-3.5" /> À la une · Gouvernance 2026-2027
                </div>

                <h2 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-brun-900 sm:text-3xl">
                  Élections du Club : déposez votre candidature officielle
                </h2>

                <p className="mt-3 text-sm leading-relaxed text-brun-600 sm:text-base">
                  Suite au lancement officiel du Club d'Entrepreneuriat du CIAT, les étudiant(e)s peuvent dès
                  maintenant postuler aux instances dirigeantes avant le scrutin en ligne de ce samedi.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3 rounded-2xl border border-brun-100 bg-[#faf6f3] p-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brun-800 text-caramel-300">
                      <Award className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-brun-800">Bureau Exécutif</p>
                      <p className="mt-0.5 text-xs text-brun-600">8 postes de direction et coordination</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-brun-100 bg-[#faf6f3] p-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brun-800 text-caramel-300">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-brun-800">5 Cellules</p>
                      <p className="mt-0.5 text-xs text-brun-600">TIC, Auto, Énergie, Santé, Femmes</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-brun-100 bg-[#faf6f3] p-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brun-800 text-caramel-300">
                      <Camera className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-brun-800">Dossier complet</p>
                      <p className="mt-0.5 text-xs text-brun-600">Photo obligatoire + vidéo de campagne</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-brun-100 bg-[#faf6f3] p-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brun-800 text-caramel-300">
                      <CalendarCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-brun-800">Scrutin samedi</p>
                      <p className="mt-0.5 text-xs text-brun-600">Vote en ligne sécurisé sur ce site</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/elections"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-caramel-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-caramel-500/25 transition hover:-translate-y-0.5 hover:bg-caramel-600"
                >
                  <Vote className="h-4 w-4" />
                  Accéder aux 13 postes et candidater
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
