import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-6'}`}>
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-kiit-green rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg leading-none">F</span>
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">FacultyApp</span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-kiit-green transition-colors">How it Works</a>
          <a href="#features" className="text-sm font-medium text-gray-600 hover:text-kiit-green transition-colors">Features</a>
          <a href="#download" className="px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-full hover:bg-gray-800 transition-colors">
            Get the App
          </a>
        </div>

        {/* Mobile menu button */}
        <button 
          className="md:hidden text-gray-600"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-xl border-t border-gray-100 p-4 flex flex-col gap-4">
          <a href="#how-it-works" className="text-sm font-medium text-gray-600 p-2 hover:bg-gray-50 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>How it Works</a>
          <a href="#features" className="text-sm font-medium text-gray-600 p-2 hover:bg-gray-50 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>Features</a>
          <a href="#download" className="px-5 py-3 text-center text-sm font-semibold text-white bg-gray-900 rounded-lg mt-2" onClick={() => setIsMobileMenuOpen(false)}>
            Get the App
          </a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
