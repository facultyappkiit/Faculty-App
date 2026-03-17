import React from 'react';
import { motion } from 'framer-motion';
import { QrCode, Apple, Play } from 'lucide-react';

const Download = () => {
  return (
    <section id="download" className="py-24 bg-kiit-green relative overflow-hidden">
      {/* Decorative Circles */}
      <div className="absolute top-0 right-0 -mr-48 -mt-48 w-96 h-96 rounded-full bg-white opacity-10"></div>
      <div className="absolute bottom-0 left-0 -ml-40 -mb-40 w-80 h-80 rounded-full bg-kiit-blue opacity-20"></div>

      <div className="container px-4 mx-auto relative z-10">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 md:p-16 max-w-5xl mx-auto shadow-2xl text-center">
          <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
             transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Get the App Now
            </h2>
            <p className="text-xl text-green-50 mb-10 max-w-2xl mx-auto">
              Join your colleagues and start managing your substitute duties seamlessly.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-12">
              <a 
                href="#" 
                className="flex items-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-xl font-bold hover:bg-gray-50 hover:scale-105 transition-all w-full md:w-auto shadow-lg"
              >
                <Play size={24} />
                <div className="text-left">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Get it on</div>
                  <div className="text-lg">Google Play</div>
                </div>
              </a>

              <button 
                disabled
                className="flex items-center gap-3 bg-black/20 text-white px-8 py-4 rounded-xl font-bold cursor-not-allowed border border-white/10 w-full md:w-auto"
              >
                <Apple size={24} />
                <div className="text-left opacity-70">
                  <div className="text-xs font-medium uppercase tracking-wider">Coming soon to</div>
                  <div className="text-lg">App Store</div>
                </div>
              </button>
            </div>

            <div className="flex flex-col items-center justify-center pt-8 border-t border-white/20">
              <div className="bg-white p-3 rounded-2xl mb-4 shadow-xl">
                 <QrCode size={80} className="text-gray-900" />
              </div>
              <p className="text-sm font-medium text-green-100 uppercase tracking-widest mb-1">
                Scan to download
              </p>
              <p className="text-xs text-green-200/70 max-w-sm mt-4 italic">
                Note: Available for KIIT faculty only. You'll need an invite to register.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Download;
