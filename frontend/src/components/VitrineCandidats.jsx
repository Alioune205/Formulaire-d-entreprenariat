import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, Loader2, PlayCircle, Video, Vote } from 'lucide-react';
import { api, urlMedia } from '../lib/api.js';

// Liens externes (YouTube, Drive…) : on ne peut pas les lire dans la page, on ouvre un nouvel onglet.
const RE_LIEN_EXTERNE = /youtu\.?be|drive\.google|facebook|fb\.watch|tiktok|instagram|vimeo/i;
const estLienExterne = (url) => RE_LIEN_EXTERNE.test(url);

function Initiales({ c }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brun-100 to-caramel-100 text-5xl font-extrabold text-brun-400">
      {c.prenom[0]}{c.nom[0]}
    </div>
  );
}

function Media({ c }) {
  const [photoKo, setPhotoKo] = useState(false);
  const [lecture, setLecture] = useState(false);
  const photo = c.photo && !photoKo ? urlMedia(c.photo) : null;
  const imagePhoto = photo
    ? <img src={photo} alt={`${c.prenom} ${c.nom}`} loading="lazy" onError={() => setPhotoKo(true)} className="h-full w-full object-cover" />
    : <Initiales c={c} />;

  // Vidéo envoyée sur la plateforme : on affiche la photo avec un bouton Lecture.
  // Le lecteur (et donc le téléchargement de la vidéo) n'est créé qu'après l'appui du visiteur.
  if (c.video && !estLienExterne(c.video)) {
    if (!lecture) {
      return (
        <button type="button" onClick={() => setLecture(true)} className="group relative block h-full w-full" aria-label={`Lire la vidéo de ${c.prenom} ${c.nom}`}>
          {imagePhoto}
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30 text-white transition group-hover:bg-black/45">
            <PlayCircle className="h-16 w-16 drop-shadow-lg transition group-hover:scale-110" />
            <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-bold">Lire la vidéo</span>
          </span>
        </button>
      );
    }
    return (
      <video
        src={c.video}
        controls
        autoPlay
        playsInline
        controlsList="nodownload"
        className="h-full w-full bg-black object-contain"
        onPlay={(e) => {
          // Une seule vidéo à la fois sur la page.
          document.querySelectorAll('video').forEach((v) => { if (v !== e.currentTarget) v.pause(); });
        }}
      >
        Votre navigateur ne peut pas lire cette vidéo.
      </video>
    );
  }

  if (c.video) {
    return (
      <a href={c.video} target="_blank" rel="noreferrer" className="group relative block h-full w-full" aria-label={`Voir la vidéo de ${c.prenom} ${c.nom}`}>
        {imagePhoto}
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/35 text-white transition group-hover:bg-black/50">
          <PlayCircle className="h-14 w-14 drop-shadow-lg" />
          <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-xs font-bold">
            Voir la vidéo <ExternalLink className="h-3 w-3" />
          </span>
        </span>
      </a>
    );
  }

  return imagePhoto;
}

function CarteCandidat({ c }) {
  const [deplie, setDeplie] = useState(false);
  const long = c.profession_de_foi.length > 220;
  return (
    <article className="flex flex-col overflow-hidden rounded-3xl border border-brun-100 bg-white shadow-sm">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-brun-50">
        <Media c={c} />
        {c.video && (
          <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-caramel-500 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow">
            <Video className="h-3.5 w-3.5" /> Vidéo
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h4 className="text-lg font-extrabold leading-tight text-brun-900">{c.prenom} {c.nom}</h4>
        <p className="mt-0.5 text-sm text-brun-500">{[c.metier, c.niveau].filter(Boolean).join(' · ')}</p>
        <p className={`mt-3 whitespace-pre-line text-sm leading-relaxed text-brun-700 ${deplie ? '' : 'line-clamp-5'}`}>
          {c.profession_de_foi}
        </p>
        {long && (
          <button type="button" onClick={() => setDeplie((d) => !d)} className="mt-2 self-start text-sm font-bold text-caramel-600 hover:text-caramel-500">
            {deplie ? 'Réduire' : 'Lire la suite'}
          </button>
        )}
      </div>
    </article>
  );
}

export default function VitrineCandidats({ vote }) {
  const [postes, setPostes] = useState(null);
  const [filtre, setFiltre] = useState('TOUS');
  const haut = useRef(null);

  useEffect(() => {
    api('/vote/bulletin/').then((d) => setPostes(d.postes)).catch(() => setPostes([]));
  }, []);

  // Dans chaque poste, les candidats avec vidéo passent devant.
  const tries = useMemo(() => (postes ?? []).map((p) => ({
    ...p,
    candidats: [...p.candidats].sort((a, b) => Number(Boolean(b.video)) - Number(Boolean(a.video))),
  })), [postes]);

  const visibles = filtre === 'TOUS' ? tries : tries.filter((p) => p.code === filtre);
  const total = tries.reduce((n, p) => n + p.candidats.length, 0);

  const choisir = (code) => {
    setFiltre(code);
    haut.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section id="candidats" ref={haut} className="scroll-mt-16 border-b border-brun-100 bg-gradient-to-b from-white via-[#faf6f3] to-white py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-caramel-200 bg-caramel-50 px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-caramel-800">
              <Vote className="h-3.5 w-3.5" /> Élections 2026-2027
            </div>
            <h2 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-brun-900 sm:text-4xl">
              Découvrez les candidats avant de voter
            </h2>
            <p className="mt-3 text-brun-600">
              Regardez leurs vidéos de campagne et lisez leurs engagements{total ? ` : ${total} candidat(e)s pour ${tries.length} postes` : ''}.
            </p>
          </div>
          {vote.etat !== 'clos' && (
            <Link to="/vote" className="inline-flex items-center justify-center gap-2 rounded-xl bg-caramel-500 px-5 py-3 font-bold text-white shadow-lg shadow-caramel-500/25 transition hover:bg-caramel-600">
              <Vote className="h-5 w-5" /> {vote.etat === 'ouvert' ? 'Je vote maintenant' : 'Page de vote'} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {postes === null ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-caramel-500" /></div>
        ) : !tries.length ? (
          <p className="py-16 text-center text-brun-500">La liste des candidats sera publiée très bientôt.</p>
        ) : (
          <>
            <div className="sticky top-16 z-20 -mx-4 mt-8 overflow-x-auto bg-[#faf6f3]/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:px-3">
              <div className="flex gap-2">
                {[{ code: 'TOUS', titre: 'Tous les postes', n: total }, ...tries.map((p) => ({ code: p.code, titre: p.titre, n: p.candidats.length }))].map((p) => (
                  <button
                    key={p.code} type="button" onClick={() => choisir(p.code)}
                    className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                      filtre === p.code ? 'bg-brun-800 text-white' : 'bg-white text-brun-700 ring-1 ring-brun-100 hover:bg-brun-50'
                    }`}
                  >
                    {p.titre} <span className={filtre === p.code ? 'text-white/70' : 'text-brun-400'}>{p.n}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 space-y-12">
              {visibles.map((p) => (
                <div key={p.code}>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-caramel-600">{p.categorie}</p>
                  <h3 className="text-2xl font-extrabold text-brun-900">
                    {p.titre}{' '}
                    <span className="text-base font-semibold text-brun-400">
                      · {p.candidat_unique ? 'candidat unique (vote pour ou contre)' : `${p.candidats.length} candidats`}
                    </span>
                  </h3>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {p.candidats.map((c) => <CarteCandidat key={c.id} c={c} />)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
