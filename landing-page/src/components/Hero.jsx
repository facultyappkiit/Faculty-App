import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Download, ShieldCheck } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative pt-24 pb-32 overflow-hidden bg-white">
      {/* Background Decorative blob */}
      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-kiit-green opacity-10 blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-kiit-blue opacity-10 blur-3xl" />
      
      <div className="container px-4 mx-auto relative z-10">
        <div className="flex flex-wrap items-center -mx-4">
          <div className="w-full lg:w-1/2 px-4 mb-16 lg:mb-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-xl"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-sm font-medium text-kiit-green bg-green-50 border border-green-100 rounded-full">
                <ShieldCheck size={16} />
                <span>Built for KIIT University Faculty</span>
              </div>
              
              <h1 className="mb-6 text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
                Find Substitute Faculty in <span className="text-kiit-green">Minutes</span>
              </h1>
              
              <p className="mb-8 text-lg text-gray-600 leading-relaxed">
                A seamless platform for KIIT faculty to request and accept substitute duties, manage schedules, and track coverage effortlessly.
              </p>
              
              <div className="flex flex-wrap items-center gap-4">
                <a 
                  href="#download" 
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 font-semibold text-white transition-all bg-kiit-green rounded-full hover:bg-green-700 hover:shadow-lg hover:-translate-y-1"
                >
                  <Download size={20} />
                  Download App
                </a>
                <a 
                  href="#how-it-works" 
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 font-semibold text-gray-700 transition-all bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300"
                >
                  Learn More
                  <ArrowRight size={20} />
                </a>
              </div>
            </motion.div>
          </div>
          
          <div className="w-full lg:w-1/2 px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative mx-auto max-w-sm lg:max-w-md"
            >
              {/* Mockup Frame placeholder */}
              <div className="relative rounded-[2.5rem] bg-gray-900 overflow-hidden shadow-2xl p-3 border-[6px] border-gray-800 h-[600px] w-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="text-center p-6">
                  <div className="w-16 h-16 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center backdrop-blur-sm">
                    <ShieldCheck className="text-kiit-green w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2">FacultyApp Mockup</h3>
                  <p className="text-gray-400 text-sm">App interface preview goes here</p>
                </div>
              </div>
              
              {/* Floating review/stat card */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute -bottom-6 -left-12 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-4 border border-gray-100"
              >
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-kiit-green font-bold">
                  JS
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Request Accepted</p>
                  <p className="text-xs text-gray-500">Dr. Sharma covered your class</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
