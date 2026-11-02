import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import AboutClub from '@/components/AboutClub';
import ApplicationForm from '@/components/ApplicationForm';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />
      <Hero />
      <AboutClub />
      <ApplicationForm />
      <FAQ />
      <Footer />
    </main>
  );
}

