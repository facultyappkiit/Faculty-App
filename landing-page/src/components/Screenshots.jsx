import React from 'react';
import { motion } from 'framer-motion';

const screenshots = [
  {
    id: 1,
    title: "Home Screen",
    caption: "View all available requests at a glance",
    image: "bg-gradient-to-br from-green-50 to-green-100" // Placeholder for actual image
  },
  {
    id: 2,
    title: "Create Request",
    caption: "Post a request in under 30 seconds",
    image: "bg-gradient-to-br from-blue-50 to-blue-100"
  },
  {
    id: 3,
    title: "My Requests",
    caption: "Track all your pending and accepted requests",
    image: "bg-gradient-to-br from-purple-50 to-purple-100"
  },
  {
    id: 4,
    title: "Profile",
    caption: "Manage your profile and preferences",
    image: "bg-gradient-to-br from-orange-50 to-orange-100"
  }
];

const Screenshots = () => {
  return (
    <section className="py-24 bg-gray-50 overflow-hidden">
      <div className="container px-4 mx-auto">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.5 }}
          >
            <h2 className="text-sm font-semibold tracking-widest text-kiit-green uppercase mb-3">
              Interface
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Clean, Intuitive Design
            </h3>
            <p className="text-lg text-gray-600">
              A modern mobile experience that feels natural from your very first tap.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {screenshots.map((screen, index) => (
            <motion.div
              key={screen.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex flex-col items-center"
            >
              {/* Phone Mockup Wrapper */}
              <div className="relative mx-auto w-full max-w-[280px] aspect-[9/19.5] rounded-[2.5rem] bg-white shadow-xl border-[6px] border-gray-900 mb-6 overflow-hidden flex items-center justify-center p-4">
                <div className={`absolute inset-0 ${screen.image} opacity-50`}></div>
                <div className="relative z-10 text-center">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Screen</span>
                  <span className="text-lg font-bold text-gray-800">{screen.title}</span>
                </div>
              </div>
              <div className="text-center px-4">
                <h4 className="font-bold text-gray-900 mb-2">{screen.title}</h4>
                <p className="text-sm text-gray-600">{screen.caption}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Screenshots;
