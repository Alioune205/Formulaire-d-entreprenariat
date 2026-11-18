import { useState, useEffect } from 'react';
import { Award, Briefcase, Calendar, CheckCircle2, ChevronRight, Filter, ShieldCheck, Users, Vote } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import FormulaireCandidature from '../components/FormulaireCandidature.jsx';
import { POSTES } from '../lib/postes.js';

export default function Elections() {
  const [filtreCategorie, setFiltreCategorie] = useState('TOUS'); // 'TOUS', 'Bureau Exécutif', 'Cellules Thématiques'
  const [posteSelectionne, setPosteSelectionne] = useState(null);
  const [modalOuverte, setModalOuverte] = useState(false);
  const [postesApi, setPostesApi] = useState(POSTES);

  useEffect(() => {
    // Récupérer les stats de candidatures depuis l'API
    fetch('/api/candidatures/postes/')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data)) {
          setPostesApi(data);
        }
      })
      .catch(() => {});
  }, []);

  const postesFiltres = filtreCategorie === 'TOUS'
    ? postesApi
    : postesApi.filter((p) => p.categorie === filtreCategorie);

  const ouvrirFormulaire = (poste) => {
    setPosteSelectionne(poste);
    setModalOuverte(true);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-[#faf6f3] via-[#ffffff] to-[#faf6f3]">
        {/* Hero Section */}
        <section className="relative isolate overflow-hidden border-b border-brun-100 bg-[#2b170e] py-16 text-white sm:py-24">
          <img
            src="/hero-elections.jpeg"
            alt="Étudiants du CIAT lors des élections de gouvernance du club"
            className="absolute inset-0 -z-10 h-full w-full object-cover object-[72%_center] lg:object-right"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#2b170e]/95 via-[#2b170e]/80 to-[#2b170e]/20" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-caramel-400/40 bg-caramel-500/20 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-caramel-300 backdrop-blur-sm">
                <Vote className="h-4 w-4" /> Gouvernance & Élections · Cohorte 2026-2027
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                Rejoignez la gouvernance du Club d'Entrepreneuriat
              </h1>
              <p className="mt-4 text-base leading-relaxed text-brun-100 sm:text-lg">
                Prenez part à la direction du club en postulant à l’un des 13 postes à pourvoir :
                les 8 postes du Bureau Exécutif ou l’une des 5 Cellules Thématiques.
                Le vote officiel des étudiants aura lieu en ligne ce samedi.
              </p>

              {/* Rappel des étapes clés */}
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/15 bg-[#2b170e]/65 p-4 backdrop-blur-md">
                  <span className="text-xs font-bold uppercase tracking-wider text-caramel-300">1. Candidatures</span>
                  <p className="mt-1 text-sm font-semibold text-white">Ouvertes dès maintenant</p>
                  <p className="mt-0.5 text-xs text-brun-200">Dépôt avec photo et vidéo</p>
                </div>
                <div className="rounded-xl border border-white/15 bg-[#2b170e]/65 p-4 backdrop-blur-md">
                  <span className="text-xs font-bold uppercase tracking-wider text-caramel-300">2. Campagne</span>
                  <p className="mt-1 text-sm font-semibold text-white">Validation des listes</p>
                  <p className="mt-0.5 text-xs text-brun-200">Publication des fiches candidats</p>
                </div>
                <div className="rounded-xl border border-white/15 bg-[#2b170e]/65 p-4 backdrop-blur-md">
                  <span className="text-xs font-bold uppercase tracking-wider text-caramel-300">3. Scrutin</span>
                  <p className="mt-1 text-sm font-semibold text-white">Samedi en ligne</p>
                  <p className="mt-0.5 text-xs text-brun-200">Vote sécurisé par code e-mail</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section Liste des postes */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          {/* Barre de filtres */}
          <div className="flex flex-col items-start justify-between gap-4 border-b border-brun-100 pb-6 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-2xl font-extrabold text-brun-800 sm:text-3xl">
                Postes ouverts aux candidatures ({postesFiltres.length})
              </h2>
              <p className="mt-1 text-sm text-brun-500">
                Chaque étudiant peut postuler à un seul poste de son choix avec une photo nette obligatoire.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap rounded-xl border border-brun-200 bg-white p-1 text-xs font-bold sm:flex-nowrap sm:text-sm">
              <button
                type="button"
                onClick={() => setFiltreCategorie('TOUS')}
                className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 transition ${filtreCategorie === 'TOUS' ? 'bg-caramel-500 text-white shadow-sm' : 'text-brun-700 hover:text-brun-900'}`}
              >
                Tous les postes (13)
              </button>
              <button
                type="button"
                onClick={() => setFiltreCategorie('Bureau Exécutif')}
                className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 transition ${filtreCategorie === 'Bureau Exécutif' ? 'bg-caramel-500 text-white shadow-sm' : 'text-brun-700 hover:text-brun-900'}`}
              >
                Bureau Exécutif (8)
              </button>
              <button
                type="button"
                onClick={() => setFiltreCategorie('Cellules Thématiques')}
                className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 transition ${filtreCategorie === 'Cellules Thématiques' ? 'bg-caramel-500 text-white shadow-sm' : 'text-brun-700 hover:text-brun-900'}`}
              >
                Cellules Thématiques (5)
              </button>
            </div>
          </div>

          {/* Grille des fiches de postes */}
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {postesFiltres.map((poste) => (
              <div
                key={poste.code}
                className="flex flex-col justify-between rounded-3xl border border-brun-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-caramel-300 hover:shadow-xl hover:shadow-brun-900/5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-block rounded-full bg-caramel-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-caramel-800">
                      {poste.categorie}
                    </span>
                    {poste.candidats_valides > 0 && (
                      <span className="text-xs font-semibold text-emerald-700">
                        {poste.candidats_valides} candidat{poste.candidats_valides > 1 ? 's' : ''} validé{poste.candidats_valides > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 text-xl font-extrabold text-brun-800">
                    {poste.titre}
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed text-brun-600 sm:text-sm">
                    {poste.description}
                  </p>

                  {/* Missions principales */}
                  <div className="mt-4 border-t border-brun-50 pt-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-caramel-700">Missions clés :</p>
                    <ul className="mt-2 space-y-1.5 text-xs text-brun-600">
                      {poste.missions.slice(0, 3).map((m, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-caramel-600" />
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Profil recherché */}
                  <div className="mt-4 rounded-xl bg-[#faf6f3] p-3 text-xs">
                    <span className="font-bold text-brun-800">Profil : </span>
                    <span className="text-brun-600">{poste.profil}</span>
                  </div>
                </div>

                {/* Bouton d'action */}
                <div className="mt-6 pt-4 border-t border-brun-50">
                  <button
                    type="button"
                    onClick={() => ouvrirFormulaire(poste)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brun-800 py-3 text-xs font-bold text-white transition hover:bg-caramel-500"
                  >
                    Postuler à ce poste <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Modal du formulaire */}
        {modalOuverte && (
          <FormulaireCandidature
            posteInitial={posteSelectionne}
            onFermer={() => setModalOuverte(false)}
            onSucces={() => {
              // Rafraîchir les stats
              fetch('/api/candidatures/postes/')
                .then((r) => r.json())
                .then((d) => setPostesApi(d))
                .catch(() => {});
            }}
          />
        )}
      </main>
      <Footer />
    </>
  );
}
