import Navbar from '../components/Navbar.jsx';
import Hero from '../components/Hero.jsx';
import Annonce from '../components/Annonce.jsx';
import AboutClub from '../components/AboutClub.jsx';
import FormulaireInscription from '../components/FormulaireInscription.jsx';
import Footer from '../components/Footer.jsx';
import useDateLimite from '../lib/useDateLimite.js';

export default function Accueil() {
  const temps = useDateLimite();
  return (
    <>
      <Navbar />
      <main>
        <Hero temps={temps} />
        <Annonce temps={temps} />
        <AboutClub />
        <FormulaireInscription temps={temps} />
      </main>
      <Footer />
    </>
  );
}
