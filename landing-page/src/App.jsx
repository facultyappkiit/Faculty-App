import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProblemStatement from './components/ProblemStatement';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Screenshots from './components/Screenshots';
import Benefits from './components/Benefits';
import FAQ from './components/FAQ';
import Download from './components/Download';
import Footer from './components/Footer';

function App() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-kiit-green selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <ProblemStatement />
        <Features />
        <HowItWorks />
        <Screenshots />
        <Benefits />
        <FAQ />
        <Download />
      </main>
      <Footer />
    </div>
  );
}

export default App;
