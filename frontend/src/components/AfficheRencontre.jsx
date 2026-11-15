import { useState } from 'react';
import { Calendar, Clock, Download, ExternalLink, Mail, MapPin, Maximize2, ShieldCheck, X } from 'lucide-react';

const MAILTO_HREF = "mailto:senepapealioune0@gmail.com?subject=Confirmation%20Presence%20Club%20Entrepreneuriat&body=Nom%20du%20Groupe%20%3A%0ANom%20du%20Projet%20%3A%0ANoms%20des%20Membres%20presents%20%3A";

export default function AfficheRencontre() {
  const [modalOuverte, setModalOuverte] = useState(false);

  return (
    <section id="rencontre" className="relative scroll-mt-16 border-b border-brun-100 bg-gradient-to-b from-[#faf6f3] via-[#ffffff] to-[#faf6f3] py-14 sm:py-20">
      {/* Lueur décorative subtile */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-caramel-100/30 to-transparent" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* En-tête de section */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-caramel-300 bg-caramel-50 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-caramel-800 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-caramel-500" /> Communiqué officiel · Candidats inscrits
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-brun-800 sm:text-4xl lg:text-5xl">
            Confirmation de présence à la rencontre
          </h2>
          <p className="mt-4 text-base leading-relaxed text-brun-600 sm:text-lg">
            Retrouvez ci-dessous l’affiche officielle avec toutes les consignes pour la rencontre de sélection avec le jury.
          </p>
        </div>

        {/* Grille principale : Affiche à gauche + Détails & Actions à droite */}
        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
          {/* Colonne gauche : Aperçu de l'affiche */}
          <div className="flex flex-col items-center">
            <div
              className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-caramel-300/80 bg-white shadow-2xl shadow-brun-900/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-brun-900/25"
              onClick={() => setModalOuverte(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setModalOuverte(true)}
              aria-label="Agrandir l'affiche officielle"
            >
              <img
                src="/affiche-confirmation-presence.jpg"
                alt="Affiche officielle de confirmation de présence - Club d'Entrepreneuriat CIAT"
                className="h-auto w-full max-w-[430px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-brun-900/0 opacity-0 backdrop-blur-[2px] transition-all duration-300 group-hover:bg-brun-900/35 group-hover:opacity-100">
                <span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-brun-800 shadow-lg">
                  <Maximize2 className="h-4 w-4 text-caramel-600" /> Cliquez pour agrandir
                </span>
              </div>
            </div>

            {/* Boutons sous l'affiche */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setModalOuverte(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-brun-200 bg-white px-4 py-2.5 text-xs font-bold text-brun-800 shadow-sm transition hover:bg-brun-50"
              >
                <Maximize2 className="h-4 w-4 text-caramel-600" /> Agrandir l’affiche
              </button>
              <a
                href="/affiche-confirmation-presence.png"
                download="Affiche-Confirmation-Presence-CIAT.png"
                className="inline-flex items-center gap-2 rounded-xl border border-brun-200 bg-white px-4 py-2.5 text-xs font-bold text-brun-800 shadow-sm transition hover:bg-brun-50"
              >
                <Download className="h-4 w-4 text-caramel-600" /> Télécharger en HD (PNG)
              </a>
            </div>
          </div>

          {/* Colonne droite : Encart d'information & Actions directes */}
          <div className="space-y-6">
            {/* 1. Alerte inscrits sans mail */}
            <div className="rounded-2xl border-2 border-caramel-300 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-caramel-100 text-caramel-700">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold uppercase tracking-wide text-brun-800">
                    Vous êtes inscrit mais vous n’avez pas reçu d’e-mail ?
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-brun-700">
                    <strong>Veuillez d'abord vérifier attentivement votre boîte de messagerie (y compris vos spams et courriers indésirables).</strong>
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-brun-600">
                    Si aucun e-mail n'a été reçu (en raison de boîtes saturées ou de fautes de frappe), rassurez-vous :{' '}
                    <strong className="text-brun-900">tous les candidats inscrits sur la plateforme sont retenus et attendus ce mercredi pour présenter leur projet !</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Détails du Rendez-vous */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3.5 rounded-2xl border border-brun-100 bg-white p-4 shadow-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brun-800 text-caramel-300">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-caramel-700">Date retenue</p>
                  <p className="text-base font-extrabold text-brun-800">Mercredi 18 Nov. 2026</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-brun-100 bg-white p-4 shadow-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brun-800 text-caramel-300">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-caramel-700">Horaire précis</p>
                  <p className="text-base font-extrabold text-brun-800">13h00 pile <span className="text-xs font-normal text-brun-500">(dès 12h45)</span></p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-brun-100 bg-white p-4 shadow-sm sm:col-span-2">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brun-800 text-caramel-300">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-caramel-700">Lieu de la rencontre</p>
                  <p className="text-base font-extrabold text-brun-800">Amphithéâtre ISEP Amadou Traoré</p>
                  <p className="text-xs text-brun-500">Format : Pitch de présentation de 2 minutes chrono par groupe</p>
                </div>
              </div>
            </div>

            {/* 3. Action obligatoire : Envoyer un mail de confirmation */}
            <div className="rounded-2xl border border-caramel-200 bg-gradient-to-br from-brun-900 to-brun-800 p-6 text-white shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-caramel-500 text-white">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Confirmez impérativement par e-mail</h4>
                  <p className="text-xs text-caramel-200">Si vous n’avez pas encore confirmé la présence de votre groupe</p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-caramel-400/30 bg-black/25 p-3.5 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-caramel-300">Envoyez votre message à :</p>
                <p className="mt-1 font-mono text-base font-extrabold text-white sm:text-lg">
                  senepapealioune0@gmail.com
                </p>
              </div>

              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-caramel-200">
                  Précisez obligatoirement dans votre message :
                </p>
                <ol className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-brun-100 sm:text-sm">
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-caramel-500 text-xs font-bold text-white">1</span>
                    <span><strong>Nom du groupe</strong> (tel qu’inscrit sur le site)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-caramel-500 text-xs font-bold text-white">2</span>
                    <span><strong>Nom du projet</strong> et son domaine d’activité</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-caramel-500 text-xs font-bold text-white">3</span>
                    <span><strong>Membres présents</strong> (noms et prénoms le mercredi)</span>
                  </li>
                </ol>
              </div>

              <div className="mt-5">
                <a
                  href={MAILTO_HREF}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-caramel-500 px-5 py-3 text-center text-sm font-bold text-white shadow-md transition hover:bg-caramel-400"
                >
                  <Mail className="h-4 w-4" /> Envoyer mon e-mail de confirmation dès maintenant <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL PLEIN ÉCRAN POUR L'AFFICHE */}
      {modalOuverte && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-all"
          onClick={() => setModalOuverte(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-h-[92vh] max-w-4xl overflow-auto rounded-2xl bg-brun-900 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalOuverte(false)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/90"
              aria-label="Fermer"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src="/affiche-confirmation-presence.png"
              alt="Affiche officielle haute définition"
              className="mx-auto max-h-[85vh] w-auto rounded-xl object-contain shadow-md"
            />
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
              <span className="text-xs font-semibold text-brun-200">Affiche officielle · Club d'Entrepreneuriat CIAT</span>
              <a
                href="/affiche-confirmation-presence.png"
                download="Affiche-Confirmation-Presence-CIAT.png"
                className="inline-flex items-center gap-1.5 rounded-lg bg-caramel-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-caramel-400"
              >
                <Download className="h-3.5 w-3.5" /> Télécharger en HD
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
