import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Club d'Entrepreneuriat | Lance ta startup étudiante",
  description: "Rejoins l'écosystème d'innovation et d'entrepreneuriat : ateliers pratiques, mentorat par des fondateurs, hackathons et accompagnement de tes projets.",
  keywords: ["entrepreneuriat", "club étudiant", "startup", "incubateur", "innovation", "projet étudiant"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="scroll-smooth">
      <body className="antialiased text-slate-800 bg-slate-50 selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

