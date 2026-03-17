import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const Benefits = () => {
  const requestCreatorBenefits = [
    "No more chasing colleagues",
    "Track request status instantly",
    "Last-minute requests welcome",
    "Automatic peer notifications"
  ];

  const acceptorBenefits = [
    "Help colleagues easily",
    "Earn goodwill in department",
    "Choose fitting requests",
    "All details in one place"
  ];

  return (
    <section className="py-24 bg-white">
      <div className="container px-4 mx-auto">
         <div className="max-w-2xl mx-auto text-center mb-16">
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.5 }}
          >
            <h2 className="text-sm font-semibold tracking-widest text-kiit-blue uppercase mb-3">
              Value Proposition
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Win-win for everyone
            </h3>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* For Request Creators */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-kiit-green rounded-3xl p-10 text-white shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl"></div>
            <h4 className="text-2xl font-bold mb-8 relative z-10">For Request Creators</h4>
            <ul className="space-y-6 relative z-10">
              {requestCreatorBenefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-4 text-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Check size={18} strokeWidth={3} />
                  </div>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* For Acceptors */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-gray-900 rounded-3xl p-10 text-white shadow-xl relative overflow-hidden"
          >
             <div className="absolute bottom-0 right-0 -mr-16 -mb-16 w-48 h-48 bg-kiit-blue opacity-50 rounded-full blur-2xl"></div>
            <h4 className="text-2xl font-bold mb-8 relative z-10">For Acceptors</h4>
            <ul className="space-y-6 relative z-10">
              {acceptorBenefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-4 text-lg">
                 <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Check size={18} className="text-kiit-blue" strokeWidth={3} />
                  </div>
                  <span className="text-gray-200">{benefit}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Benefits;
