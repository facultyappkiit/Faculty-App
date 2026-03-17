import React from 'react';
import { motion } from 'framer-motion';
import { PenSquare, BellRing, CheckCircle2, BarChart3, CircleUser, GraduationCap } from 'lucide-react';

const features = [
  {
    icon: <PenSquare size={24} />,
    title: "Quick Requests",
    description: "Post substitute requests for classes or exams in seconds."
  },
  {
    icon: <BellRing size={24} />,
    title: "Real-time Notifications",
    description: "Get instant alerts when new requests match your department and availability."
  },
  {
    icon: <CheckCircle2 size={24} />,
    title: "One-tap Accept",
    description: "Accept substitution requests with a single tap - no more back-and-forth messaging."
  },
  {
    icon: <BarChart3 size={24} />,
    title: "Request Tracking",
    description: "Track all your requests - see what's pending, accepted, or completed at a glance."
  },
  {
    icon: <CircleUser size={24} />,
    title: "Faculty Directory",
    description: "Browse faculty by department to easily find the right substitute for your subject."
  },
  {
    icon: <GraduationCap size={24} />,
    title: "Exam & Class Support",
    description: "Seamlessly handle requests for both regular academic classes and invigilation duties."
  }
];

const Features = () => {
  return (
    <section id="features" className="py-24 bg-white relative">
      <div className="container px-4 mx-auto px-4 z-10 relative">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
             <h2 className="text-sm font-semibold tracking-widest text-kiit-blue uppercase mb-3">
              Capabilities
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Everything you need, in one place
            </h3>
            <p className="text-lg text-gray-600">
              Powerful features designed specifically to streamline faculty coordination.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group p-8 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl border border-transparent hover:border-gray-100 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-kiit-blue/10 text-kiit-blue group-hover:bg-kiit-blue group-hover:text-white rounded-xl flex items-center justify-center mb-6 transition-colors duration-300">
                {feature.icon}
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h4>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
