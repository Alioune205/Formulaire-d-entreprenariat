import { ClipboardList, Handshake, Rocket } from 'lucide-react';

const ETAPES = [
  {
    icone: ClipboardList,
    titre: '1. Inscrivez votre groupe',
    texte: 'Donnez un nom à votre équipe, présentez votre projet et chaque membre avec son département et son métier.',
  },
  {
    icone: Handshake,
    titre: '2. Engagez-vous',
    texte: 'Le groupe s’engage à participer aux ateliers, à respecter la charte du club et à faire avancer son projet.',
  },
  {
    icone: Rocket,
    titre: '3. Construisez avec le CIAT',
    texte: 'Mentorat, ateliers pratiques, accès aux équipements et présentation devant un jury en fin de cohorte.',
  },
];

export default function AboutClub() {
  return (
    <section id="club" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-wider text-caramel-600">Comment ça marche</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-brun-800 sm:text-4xl">
            Trois étapes pour rejoindre le club
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {ETAPES.map(({ icone: Icone, titre, texte }) => (
            <article key={titre} className="rounded-2xl border border-brun-100 bg-brun-50 p-7">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brun-800 text-caramel-300">
                <Icone className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-brun-800">{titre}</h3>
              <p className="mt-2 text-sm leading-relaxed text-brun-600">{texte}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
