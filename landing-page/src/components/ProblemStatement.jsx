import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquareWarning, SearchX, ClockAlert, Users } from 'lucide-react';

const problems = [
  {
    icon: <MessageSquareWarning size={24} />,
    title: "Chaotic WhatsApp Groups",
    description: "Finding substitutes through overflowing WhatsApp groups is disorganized and messages often get lost."
  },
  {
    icon: <SearchX size={24} />,
    title: "No Centralized Tracking",
    description: "Lack of a unified system to track who is covering what class, leading to confusion and double bookings."
  },
  {
    icon: <ClockAlert size={24} />,
    title: "Last-Minute Emergencies",
    description: "Sudden emergencies leave classes uncovered because there isn't a fast enough way to reach available peers."
  },
  {
    icon: <Users size={24} />,
    title: "Wasted Coordination Time",
    description: "Manual coordination, phone calls, and back-and-forth messaging wastes valuable academic time."
  }
];

const ProblemStatement = () => {
  return (
    <section className="py-24 bg-gray-50">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-sm font-semibold tracking-widest text-kiit-green uppercase mb-3">
              The Challenge
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Why we built this platform
            </h3>
            <p className="text-lg text-gray-600">
              Managing substitute duties has always been a painful, manual process. We identified the core issues slowing down our faculty.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {problems.map((problem, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mb-6">
                {problem.icon}
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">{problem.title}</h4>
              <p className="text-gray-600 leading-relaxed">
                {problem.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemStatement;
