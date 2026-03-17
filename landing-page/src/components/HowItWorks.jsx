import React from 'react';
import { motion } from 'framer-motion';
import { FileEdit, Bell, UserCheck, PartyPopper } from 'lucide-react';

const steps = [
  {
    icon: <FileEdit size={32} />,
    title: "Step 1: Create Request",
    description: "Enter subject, date, time, and location in seconds."
  },
  {
    icon: <Bell size={32} />,
    title: "Step 2: Notify Faculty",
    description: "All available faculty in your department receive an instant notification."
  },
  {
    icon: <UserCheck size={32} />,
    title: "Step 3: Get Accepted",
    description: "A colleague reviews and accepts your request with a single tap."
  },
  {
    icon: <PartyPopper size={32} />,
    title: "Step 4: Class Covered",
    description: "Relax - your class is in safe hands. Status updates automatically."
  }
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-kiit-blue text-white overflow-hidden">
      <div className="container px-4 mx-auto">
        <div className="max-w-2xl mx-auto text-center mb-20">
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.5 }}
          >
            <h2 className="text-sm font-semibold tracking-widest text-blue-200 uppercase mb-3">
              Process
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold mb-6">
              How It Works
            </h3>
            <p className="text-lg text-blue-100">
              A seamless, intuitive experience designed for busy academic schedules.
            </p>
          </motion.div>
        </div>

        <div className="relative">
          {/* Connecting Line */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-blue-800 -translate-y-1/2 z-0"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-20 h-20 mx-auto bg-blue-700 border-4 border-kiit-blue text-white rounded-full flex items-center justify-center mb-6 shadow-xl relative">
                  {step.icon}
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-kiit-green text-white font-bold flex items-center justify-center text-sm border-2 border-kiit-blue">
                    {index + 1}
                  </div>
                </div>
                <h4 className="text-xl font-bold mb-3">{step.title.split(': ')[1]}</h4>
                <p className="text-blue-100 text-sm leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
