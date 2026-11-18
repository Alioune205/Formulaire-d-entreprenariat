import { ArrowRight, CalendarDays, CheckCircle2, UserRound, Users, Vote } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PresentationAujourdhui({ temps }) {
  return (
    <section
      id="presentation"
      className="relative scroll-mt-16 overflow-hidden border-b border-brun-100 bg-gradient-to-b from-[#faf6f3] via-white to-[#faf6f3] py-14 sm:py-16"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-3xl border-2 border-caramel-300/80 bg-white p-6 shadow-xl shadow-brun-900/10 sm:p-10">
          <div className="flex flex-col justify-between gap-6 border-b border-brun-100 pb-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-caramel-300 bg-caramel-50 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-caramel-800">
                <CalendarDays className="h-3.5 w-3.5 text-caramel-600" />
                Suite à la présentation d'aujourd'hui · Mercredi 18 novembre 2026
              </span>
              <h2 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-brun-900 sm:text-4xl">
                La plateforme est réouverte : inscrivez votre projet dès 1 membre
              </h2>
              <p className="mt-3 text-base leading-relaxed text-brun-600">
                À l'issue de la présentation officielle d'aujourd'hui à l'ISEP Amadou Trawaré, la plateforme est
                immédiatement réouverte avec une nouvelle règle d'accessibilité : chaque étudiant(e) peut désormais
                s'inscrire seul(e) ou en équipe pour intégrer la cohorte 2026-2027.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
              {temps.ouvert && (
                <a
                  href="#inscription"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-caramel-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-caramel-500/25 transition hover:-translate-y-0.5 hover:bg-caramel-600"
                >
                  Déposer mon projet <ArrowRight className="h-4 w-4" />
                </a>
              )}
              <Link
                to="/elections"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-brun-200 bg-[#faf6f3] px-5 py-3 text-sm font-bold text-brun-800 transition hover:bg-brun-100"
              >
                <Vote className="h-4 w-4 text-caramel-600" /> Voir les Élections
              </Link>
            </div>
          </div>

          {/* 3 points clés annoncés aujourd'hui */}
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-base font-extrabold text-brun-900">1. Plateforme réouverte</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-brun-600">
                {temps.ouvert
                  ? "Le formulaire d'inscription en ligne est actif dès maintenant pour tous les étudiants de l'ISEP."
                  : "Les inscriptions viennent d'être clôturées par l'administration."}
              </p>
            </div>

            <div className="rounded-2xl border border-caramel-200 bg-[#faf6f3] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brun-800 text-caramel-300">
                <UserRound className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-base font-extrabold text-brun-900">2. Dès 1 seul membre</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-brun-600">
                Nouvelle souplesse : déposez un dossier en candidat individuel (1 personne) ou en équipe jusqu'à 6 membres.
              </p>
            </div>

            <div className="rounded-2xl border border-brun-100 bg-[#faf6f3] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brun-800 text-caramel-300">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-base font-extrabold text-brun-900">3. Gouvernance & Élections</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-brun-600">
                Les candidatures aux 13 postes du Bureau Exécutif et des 5 Cellules Thématiques sont également ouvertes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
