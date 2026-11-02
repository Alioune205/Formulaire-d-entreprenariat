export default function Footer() {
  return (
    <footer className="bg-brun-900 py-10 text-sm text-brun-200">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
        <img src="/logo-ciat-blanc.png" alt="CIAT — ISEP Amadou Trawaré" className="h-12 w-auto" />
        <p className="text-brun-300">© {new Date().getFullYear()} Club d'Entrepreneuriat</p>
      </div>
    </footer>
  );
}
